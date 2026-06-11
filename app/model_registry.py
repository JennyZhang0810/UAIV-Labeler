from __future__ import annotations

import json
import subprocess
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any

from model_backend import predict as mock_predict
from storage_resolver import StorageResolver


ROOT = Path(__file__).resolve().parents[1]
CONFIG_PATH = ROOT / "config" / "model_backends.json"
storage = StorageResolver()


def list_models() -> list[dict[str, Any]]:
    models = []
    for model_id, item in _load_config().get("models", {}).items():
        health = check_model_health(model_id, item)
        models.append(
            {
                "id": model_id,
                "name": item.get("name", model_id),
                "task": item.get("task", ""),
                "provider": item.get("provider", ""),
                "mode": item.get("mode", "local"),
                "enabled": bool(item.get("enabled", False)),
                "description": item.get("description", ""),
                "status": health["status"],
                "health": health,
            }
        )
    return models


def run_model(model_id: str, metadata: dict[str, Any], annotation: dict[str, Any]) -> dict[str, Any]:
    config = _load_config().get("models", {}).get(model_id)
    if not config:
        raise ValueError(f"Unknown model: {model_id}")
    health = check_model_health(model_id, config)
    if health["status"] != "ready":
        raise RuntimeError("; ".join(health["messages"]))
    if config.get("mode") == "mock":
        return mock_predict(metadata)
    if model_id in {"yolo_v8n", "s2det_yolov8s"}:
        return run_yolo(model_id, config, metadata, annotation)
    if model_id == "segearth_ov":
        return run_segearth(config, metadata, annotation)
    raise RuntimeError(f"{config.get('name', model_id)} backend is configured but no runner has been implemented yet.")


def run_custom_remote_model(config: dict[str, Any], metadata: dict[str, Any], annotation: dict[str, Any]) -> dict[str, Any]:
    url = str(config.get("url", "")).strip()
    if not url:
        raise ValueError("缺少自定义模型 URL")
    image_path = resolve_image_path(metadata)
    payload = {
        "model_name": config.get("name") or "custom_model",
        "task": config.get("task") or "custom",
        "image_id": metadata["id"],
        "image_path": str(image_path),
        "metadata": metadata,
        "annotation": annotation,
    }
    request = urllib.request.Request(
        url,
        data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=int(config.get("timeout", 180))) as response:
            result = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"自定义模型 HTTP {exc.code}: {detail}") from exc
    except urllib.error.URLError as exc:
        raise RuntimeError(f"无法连接自定义模型服务: {exc.reason}") from exc

    updated = {**annotation}
    updated["image_id"] = metadata["id"]
    for key in ["objects", "segments", "ocr", "events", "scene", "environment", "restoration", "urban_structure"]:
        if key in result:
            updated[key] = result[key]
    updated["review_status"] = "predicted"
    updated["model_predictions"] = updated.get("model_predictions", {})
    updated["model_predictions"]["custom_remote"] = {
        "name": payload["model_name"],
        "task": payload["task"],
        "url": url,
        "object_count": len(updated.get("objects", [])),
        "segment_count": len(updated.get("segments", [])),
        "ocr_count": len(updated.get("ocr", [])),
        "event_count": len(updated.get("events", [])),
    }
    return updated


def run_sam_prompt(metadata: dict[str, Any], annotation: dict[str, Any], points: list[dict[str, Any]], label: str) -> dict[str, Any]:
    config = _load_config().get("models", {}).get("sam3", {})
    if not config.get("enabled", False):
        raise RuntimeError("SAM interactive backend is not enabled. Configure config/model_backends.json or use a custom remote segmentation service.")
    if config.get("mode") != "remote":
        raise RuntimeError("Local SAM runner is not enabled in the Web service. Set the SAM backend to mode=remote and run SAM/SAM2/SAM3 as a separate HTTP service.")
    url = str(config.get("url", "")).strip()
    if not url:
        raise RuntimeError("SAM remote service URL is missing.")

    image_path = resolve_image_path(metadata)
    payload = {
        "model_name": config.get("name") or "sam_interactive",
        "task": "instance_segmentation",
        "image_id": metadata["id"],
        "image_path": str(image_path),
        "metadata": metadata,
        "annotation": annotation,
        "prompts": {
            "points": points,
            "label": label or "region",
        },
    }
    request = urllib.request.Request(
        url,
        data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=int(config.get("timeout", 240))) as response:
            result = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"SAM service HTTP {exc.code}: {detail}") from exc
    except urllib.error.URLError as exc:
        raise RuntimeError(f"Cannot connect SAM service: {exc.reason}") from exc

    new_segments = result.get("segments", [])
    if not isinstance(new_segments, list):
        raise RuntimeError("SAM service response must contain a list field named 'segments'.")
    updated = {**annotation}
    updated["image_id"] = metadata["id"]
    updated["segments"] = list(updated.get("segments", [])) + new_segments
    updated["review_status"] = "predicted"
    updated["model_predictions"] = updated.get("model_predictions", {})
    updated["model_predictions"]["sam_interactive"] = {
        "name": payload["model_name"],
        "prompt_points": len(points),
        "segment_count": len(new_segments),
        "url": url,
    }
    return updated


def check_model_health(model_id: str, config: dict[str, Any]) -> dict[str, Any]:
    messages = []
    if not config.get("enabled", False):
        return {"status": "disabled", "messages": ["模型未启用"]}
    mode = config.get("mode", "local")
    if mode == "mock":
        return {"status": "ready", "messages": ["内置 mock 后端可用"]}
    if mode == "remote":
        url = config.get("url", "")
        return {
            "status": "remote_configured" if url else "needs_config",
            "messages": [f"远程服务 URL: {url}" if url else "缺少远程服务 URL"],
        }

    issues = []
    notes = []
    for key in ["python", "weights", "checkpoint", "repo", "clip_cache", "name_file"]:
        value = config.get(key)
        if value and not Path(value).exists():
            issues.append(f"缺少 {key}: {value}")
    if config.get("python") and not Path(config["python"]).exists():
        issues.append(f"Python 环境不存在: {config['python']}")

    if model_id in {"segearth_ov", "sam3"}:
        cuda = _probe_cuda(config.get("python"), config.get("repo"))
        notes.extend(cuda["messages"])
        if not cuda["available"]:
            return {"status": "needs_gpu", "messages": issues + notes}

    if issues:
        return {"status": "needs_config", "messages": issues + notes}
    if model_id == "sam3":
        return {"status": "configured", "messages": notes + ["SAM3 runner 尚未启用，建议先作为远程后端接入或单独启动服务"]}
    return {"status": "ready", "messages": notes + ["环境体检通过"]}


def resolve_image_path(metadata: dict[str, Any]) -> Path:
    return storage.resolve_image_path(metadata)


def run_yolo(model_id: str, config: dict[str, Any], metadata: dict[str, Any], annotation: dict[str, Any]) -> dict[str, Any]:
    image_path = resolve_image_path(metadata)
    if not image_path.exists():
        raise FileNotFoundError(str(image_path))

    yolo_python = Path(config["python"])
    weights = config["weights"]
    if not yolo_python.exists():
        raise FileNotFoundError(f"YOLO python env not found: {yolo_python}")

    proc = subprocess.run(
        [
            str(yolo_python),
            str(ROOT / "app" / "yolo_infer.py"),
            weights,
            str(image_path),
            model_id,
        ],
        check=False,
        text=True,
        capture_output=True,
        timeout=120,
    )
    if proc.returncode != 0:
        raise RuntimeError(proc.stderr.strip() or proc.stdout.strip() or "YOLO subprocess failed")
    payload = json.loads(proc.stdout)
    objects = payload.get("objects", [])

    updated = {**annotation}
    updated["image_id"] = metadata["id"]
    updated["objects"] = objects
    updated["review_status"] = "predicted"
    updated["model_predictions"] = updated.get("model_predictions", {})
    updated["model_predictions"][model_id] = {
        "name": config.get("name", model_id),
        "object_count": len(objects),
        "weight": weights,
        "metric_source": config.get("metric_source", ""),
    }
    return updated


def run_segearth(config: dict[str, Any], metadata: dict[str, Any], annotation: dict[str, Any]) -> dict[str, Any]:
    image_path = resolve_image_path(metadata)
    if not image_path.exists():
        raise FileNotFoundError(str(image_path))
    proc = subprocess.run(
        [
            config["python"],
            str(ROOT / "app" / "segearth_infer.py"),
            config["repo"],
            str(image_path),
            config["name_file"],
        ],
        check=False,
        text=True,
        capture_output=True,
        timeout=240,
    )
    if proc.returncode != 0:
        raise RuntimeError(proc.stderr.strip() or proc.stdout.strip() or "SegEarth subprocess failed")
    payload = json.loads(proc.stdout)
    updated = {**annotation}
    updated["image_id"] = metadata["id"]
    updated["segments"] = payload.get("segments", [])
    updated["review_status"] = "predicted"
    updated["model_predictions"] = updated.get("model_predictions", {})
    updated["model_predictions"]["segearth_ov"] = {
        "segment_count": len(updated["segments"]),
        "labels": config.get("name_file"),
    }
    return updated


def _load_config() -> dict[str, Any]:
    if not CONFIG_PATH.exists():
        return {"models": {}}
    return json.loads(CONFIG_PATH.read_text(encoding="utf-8"))


def _probe_cuda(python_path: str | None, workdir: str | None) -> dict[str, Any]:
    if not python_path or not Path(python_path).exists():
        return {"available": False, "messages": ["缺少可用 Python 环境"]}
    proc = subprocess.run(
        [python_path, "-c", "import torch; print(int(torch.cuda.is_available()))"],
        cwd=workdir or str(ROOT),
        text=True,
        capture_output=True,
        timeout=20,
    )
    available = proc.returncode == 0 and proc.stdout.strip().endswith("1")
    message = "CUDA 可用" if available else "CUDA 当前不可见，模型按钮禁用；可改为远程 GPU 后端或修复部署环境"
    return {"available": available, "messages": [message]}
