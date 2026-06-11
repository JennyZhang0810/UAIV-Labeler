from __future__ import annotations

import os
import json
import logging
import time
from datetime import datetime
from logging.handlers import RotatingFileHandler
from pathlib import Path, PureWindowsPath
import re
from typing import Any
from zipfile import ZIP_DEFLATED, ZipFile

from flask import Flask, g, jsonify, request, send_file, send_from_directory
from werkzeug.exceptions import BadRequest, Forbidden, NotFound
from werkzeug.utils import secure_filename
from PIL import Image

from annotation_store import AnnotationStore, IMAGE_EXTENSIONS
from model_registry import list_models, run_custom_remote_model, run_model, run_sam_prompt
from qa_tools import result_item, result_meta, tsv_item, tsv_meta, write_clean_row
from schemas import (
    EVENT_LABELS,
    OBJECT_LABELS,
    RESTORATION_TYPES,
    SCENE_LABELS,
    SEGMENT_LABELS,
    TASK_NAMES,
    TASKS,
    URBAN_STRUCTURE_LABELS,
    WEATHER_LABELS,
)
from storage_resolver import StorageResolver
from training_hooks import IncrementalTrainingHook


ROOT = Path(__file__).resolve().parents[1]


def _browse_roots() -> list[Path]:
    raw = os.environ.get("UAIV_BROWSE_ROOTS", "")
    roots = [Path(item).expanduser().resolve() for item in raw.split(os.pathsep) if item.strip()]
    if roots:
        return roots
    candidates = [ROOT / "sample_data", Path("/datasets")]
    user_data5 = Path("/data5") / os.environ.get("USER", "")
    if user_data5.exists():
        candidates.append(user_data5)
    return [path.resolve() for path in candidates if path.exists()]


ALLOWED_BROWSE_ROOTS = _browse_roots()
DEFAULT_BROWSE_PATH = Path(os.environ.get("UAIV_DEFAULT_BROWSE_PATH", str((ROOT / "sample_data").resolve()))).expanduser().resolve()
QA_DEFAULT_PATH = Path(os.environ.get("UAIV_QA_ROOT", str((ROOT / "sample_data" / "qa").resolve()))).expanduser().resolve()
store = AnnotationStore(ROOT)
storage = StorageResolver()
training_hook = IncrementalTrainingHook()

app = Flask(__name__, static_folder="static", template_folder="templates")
app.config["SEND_FILE_MAX_AGE_DEFAULT"] = 0
logger = logging.getLogger("uaiv_annotation")


def _configure_logging() -> None:
    if logger.handlers:
        return
    log_dir = ROOT / "logs"
    log_dir.mkdir(parents=True, exist_ok=True)
    logger.setLevel(logging.INFO)
    formatter = logging.Formatter("%(asctime)s %(levelname)s %(message)s")
    file_handler = RotatingFileHandler(log_dir / "platform.log", maxBytes=10 * 1024 * 1024, backupCount=5, encoding="utf-8")
    file_handler.setFormatter(formatter)
    logger.addHandler(file_handler)
    app.logger.handlers = logger.handlers
    app.logger.setLevel(logging.INFO)


_configure_logging()


@app.before_request
def log_request_start():
    g.request_started_at = time.perf_counter()


@app.after_request
def log_request_done(response):
    elapsed_ms = (time.perf_counter() - getattr(g, "request_started_at", time.perf_counter())) * 1000
    if request.path.startswith("/static/"):
        return response
    logger.info(
        "request method=%s path=%s status=%s elapsed_ms=%.1f remote=%s",
        request.method,
        request.path,
        response.status_code,
        elapsed_ms,
        request.headers.get("X-Forwarded-For", request.remote_addr),
    )
    return response


@app.get("/")
def index():
    return send_from_directory(app.template_folder, "index.html")


@app.get("/api/config")
def config():
    return jsonify(
        {
            "tasks": TASKS,
            "task_names": TASK_NAMES,
            "scene_labels": SCENE_LABELS,
            "urban_structure_labels": URBAN_STRUCTURE_LABELS,
            "object_labels": OBJECT_LABELS,
            "segment_labels": SEGMENT_LABELS,
            "event_labels": EVENT_LABELS,
            "weather_labels": WEATHER_LABELS,
            "restoration_types": RESTORATION_TYPES,
            "review_states": ["unlabeled", "predicted", "labeled", "verified", "rejected"],
        }
    )


@app.get("/api/facets")
def facets():
    return jsonify(store.facets())


@app.get("/api/browse")
def browse():
    raw_path = request.args.get("path") or str(DEFAULT_BROWSE_PATH)
    path = Path(raw_path).expanduser().resolve()
    _ensure_browsable(path)
    if not path.exists() or not path.is_dir():
        raise NotFound(f"Folder not found: {path}")

    dirs = []
    image_count = 0
    for child in sorted(path.iterdir(), key=lambda item: (not item.is_dir(), item.name.lower())):
        if child.is_dir():
            dirs.append({"name": child.name, "path": str(child)})
        elif child.suffix.lower() in {".jpg", ".jpeg", ".png", ".tif", ".tiff", ".bmp", ".webp"}:
            image_count += 1

    parent = path.parent if path.parent != path else None
    if parent is not None:
        try:
            _ensure_browsable(parent)
            parent_path = str(parent)
        except Forbidden:
            parent_path = ""
    else:
        parent_path = ""

    return jsonify({"path": str(path), "parent": parent_path, "dirs": dirs, "image_count": image_count})


@app.get("/api/qa/browse")
def qa_browse():
    raw_path = request.args.get("path") or str(QA_DEFAULT_PATH)
    suffixes = {item.strip().lower() for item in request.args.get("ext", ".tsv,.xlsx").split(",") if item.strip()}
    path = Path(raw_path).expanduser().resolve()
    _ensure_browsable(path)
    if not path.exists() or not path.is_dir():
        raise NotFound(f"Folder not found: {path}")

    dirs = []
    files = []
    for child in sorted(path.iterdir(), key=lambda item: (not item.is_dir(), item.name.lower())):
        if child.is_dir():
            dirs.append({"name": child.name, "path": str(child)})
        elif child.suffix.lower() in suffixes:
            files.append({"name": child.name, "path": str(child), "suffix": child.suffix.lower()})

    parent = path.parent if path.parent != path else None
    parent_path = ""
    if parent is not None:
        try:
            _ensure_browsable(parent)
            parent_path = str(parent)
        except Forbidden:
            parent_path = ""
    return jsonify({"path": str(path), "parent": parent_path, "dirs": dirs, "files": files})


@app.post("/api/qa/upload-file")
def qa_upload_file():
    file_storage = request.files.get("file")
    if not file_storage or not file_storage.filename:
        raise BadRequest("No QA file selected.")
    suffix = Path(file_storage.filename).suffix.lower()
    if suffix not in {".tsv", ".xlsx"}:
        raise BadRequest("Only .tsv and .xlsx QA files are supported.")
    upload_root = ROOT / "data" / "qa_uploads" / datetime.now().strftime("%Y%m%d_%H%M%S")
    upload_root.mkdir(parents=True, exist_ok=True)
    filename = secure_filename(file_storage.filename)
    target = upload_root / filename
    file_storage.save(target)
    logger.info("qa_upload_file suffix=%s path=%s size=%s", suffix, target, target.stat().st_size if target.exists() else 0)
    return jsonify({"path": str(target), "name": filename, "suffix": suffix})


@app.post("/api/qa/upload-images")
def qa_upload_images():
    files = request.files.getlist("files")
    if not files:
        raise BadRequest("No QA images selected.")
    upload_root = ROOT / "data" / "qa_uploads" / "images" / datetime.now().strftime("%Y%m%d_%H%M%S")
    saved = []
    for file_storage in files:
        relative_name = file_storage.filename or file_storage.name
        if Path(relative_name).suffix.lower() not in IMAGE_EXTENSIONS:
            continue
        safe_parts = [secure_filename(part) for part in Path(relative_name).parts if part not in {"", ".", ".."}]
        if not safe_parts:
            continue
        target = upload_root.joinpath(*safe_parts)
        target.parent.mkdir(parents=True, exist_ok=True)
        file_storage.save(target)
        saved.append(str(target))
    logger.info("qa_upload_images folder=%s saved=%s", upload_root, len(saved))
    return jsonify({"folder": str(upload_root), "saved": len(saved), "sample": saved[:5]})


@app.get("/api/images")
def images():
    return jsonify(store.list_images(_image_filters_from_request()))


def _image_filters_from_request() -> dict[str, str]:
    return {
        "task": request.args.get("task", ""),
        "scene": request.args.get("scene", ""),
        "weather": request.args.get("weather", ""),
        "batch": request.args.get("batch", ""),
        "annotator_group": request.args.get("annotator_group", ""),
        "source_type": request.args.get("source_type", ""),
        "min_altitude": request.args.get("min_altitude", ""),
        "max_altitude": request.args.get("max_altitude", ""),
        "min_longitude": request.args.get("min_longitude", ""),
        "max_longitude": request.args.get("max_longitude", ""),
        "min_latitude": request.args.get("min_latitude", ""),
        "max_latitude": request.args.get("max_latitude", ""),
    }


@app.post("/api/reset-dataset")
def reset_dataset():
    store.reset_dataset()
    logger.info("dataset_reset")
    return jsonify({"ok": True, "total": 0})


@app.post("/api/prefill/rules")
def prefill_rules():
    payload = request.get_json(silent=True) or {}
    dry_run = bool(payload.get("dry_run", True))
    result = store.backfill_rule_prefill(dry_run=dry_run)
    logger.info(
        "rule_prefill_backfill dry_run=%s would_update=%s updated=%s skipped_human=%s skipped_prefill=%s",
        dry_run,
        result.get("would_update"),
        result.get("updated"),
        result.get("skipped_human"),
        result.get("skipped_prefill"),
    )
    return jsonify(result)


@app.get("/api/images/<image_id>")
def image_detail(image_id: str):
    try:
        return jsonify({"metadata": store.get_metadata(image_id), "annotation": store.get_annotation(image_id)})
    except KeyError as exc:
        raise NotFound(f"Image not found: {image_id}") from exc


@app.post("/api/images/<image_id>/annotation")
def save_annotation(image_id: str):
    payload = request.get_json(force=True)
    try:
        result = store.save_annotation(image_id, payload)
    except ValueError as exc:
        raise BadRequest(str(exc)) from exc
    logger.info(
        "annotation_saved image_id=%s status=%s objects=%s segments=%s events=%s",
        image_id,
        result.get("review_status"),
        len(result.get("objects", [])),
        len(result.get("segments", [])),
        len(result.get("events", [])),
    )
    training_hook.maybe_trigger(store.stats(), image_id, "review")
    return jsonify(result)


@app.post("/api/images/<image_id>/predict")
def predict(image_id: str):
    started = time.perf_counter()
    result = store.rerun_prediction(image_id)
    logger.info("mock_prediction image_id=%s elapsed_ms=%.1f", image_id, (time.perf_counter() - started) * 1000)
    return jsonify(result)


@app.get("/api/models")
def models():
    return jsonify(list_models())


@app.post("/api/images/<image_id>/predict-model/<model_id>")
def predict_with_model(image_id: str, model_id: str):
    started = time.perf_counter()
    try:
        metadata = store.get_metadata(image_id)
        annotation = store.get_annotation(image_id)
        prediction = run_model(model_id, metadata, annotation)
        result = store.save_annotation(image_id, prediction, action=f"prediction_{model_id}")
        logger.info(
            "model_prediction image_id=%s model_id=%s elapsed_ms=%.1f objects=%s segments=%s events=%s",
            image_id,
            model_id,
            (time.perf_counter() - started) * 1000,
            len(result.get("objects", [])),
            len(result.get("segments", [])),
            len(result.get("events", [])),
        )
        return jsonify(result)
    except KeyError as exc:
        logger.warning("model_prediction_missing_image image_id=%s model_id=%s", image_id, model_id)
        raise NotFound(f"Image not found: {image_id}") from exc
    except (RuntimeError, ValueError, FileNotFoundError) as exc:
        logger.exception("model_prediction_failed image_id=%s model_id=%s elapsed_ms=%.1f", image_id, model_id, (time.perf_counter() - started) * 1000)
        raise BadRequest(str(exc)) from exc


@app.post("/api/predict-model-batch/<model_id>")
def predict_batch_with_model(model_id: str):
    started = time.perf_counter()
    payload = request.get_json(silent=True) or {}
    dry_run = bool(payload.get("dry_run", True))
    include_stages = {str(item) for item in payload.get("include_stages", []) if str(item)}
    filters = payload.get("filters") or {}
    limit = int(payload.get("limit") or 50)
    candidates = store.batch_prediction_candidates(filters, include_stages=include_stages or None, limit=limit)
    result = {
        "dry_run": dry_run,
        "model_id": model_id,
        **candidates,
        "updated": 0,
        "failed": 0,
        "failures": [],
    }
    if dry_run:
        logger.info("batch_model_preview model_id=%s matched=%s candidates=%s", model_id, candidates.get("matched"), candidates.get("candidate_count"))
        _write_batch_model_run(model_id, payload, result)
        return jsonify(result)

    for item in candidates["candidates"]:
        image_id = item["image_id"]
        try:
            metadata = store.get_metadata(image_id)
            annotation = store.get_annotation(image_id)
            prediction = run_model(model_id, metadata, annotation)
            store.save_annotation(image_id, prediction, action=f"prediction_batch_{model_id}")
            result["updated"] += 1
        except (RuntimeError, ValueError, FileNotFoundError, KeyError) as exc:
            result["failed"] += 1
            if len(result["failures"]) < 20:
                result["failures"].append({"image_id": image_id, "error": str(exc)})
    logger.info(
        "batch_model_prediction model_id=%s dry_run=%s matched=%s candidates=%s updated=%s failed=%s elapsed_ms=%.1f",
        model_id,
        dry_run,
        result.get("matched"),
        result.get("candidate_count"),
        result.get("updated"),
        result.get("failed"),
        (time.perf_counter() - started) * 1000,
    )
    _write_batch_model_run(model_id, payload, result)
    return jsonify(result)


def _write_batch_model_run(model_id: str, payload: dict[str, Any], result: dict[str, Any]) -> None:
    log_dir = ROOT / "data" / "batch_model_runs"
    log_dir.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
    record = {
        "created_at": datetime.utcnow().isoformat() + "Z",
        "model_id": model_id,
        "request": payload,
        "result": result,
    }
    (log_dir / f"{timestamp}_{model_id}.json").write_text(json.dumps(record, ensure_ascii=False, indent=2), encoding="utf-8")


@app.get("/api/batch-model-runs")
def batch_model_runs():
    log_dir = ROOT / "data" / "batch_model_runs"
    runs = []
    for path in sorted(log_dir.glob("*.json"), reverse=True)[:50] if log_dir.exists() else []:
        try:
            record = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            continue
        result = record.get("result", {})
        runs.append(
            {
                "file": path.name,
                "created_at": record.get("created_at", ""),
                "model_id": record.get("model_id", ""),
                "dry_run": result.get("dry_run", True),
                "matched": result.get("matched", 0),
                "candidate_count": result.get("candidate_count", 0),
                "updated": result.get("updated", 0),
                "failed": result.get("failed", 0),
            }
        )
    return jsonify({"runs": runs})


@app.post("/api/images/<image_id>/predict-custom")
def predict_with_custom_model(image_id: str):
    started = time.perf_counter()
    try:
        metadata = store.get_metadata(image_id)
        annotation = store.get_annotation(image_id)
        config = request.get_json(force=True)
        prediction = run_custom_remote_model(config, metadata, annotation)
        result = store.save_annotation(image_id, prediction, action="prediction_custom")
        logger.info(
            "custom_prediction image_id=%s name=%s task=%s elapsed_ms=%.1f",
            image_id,
            config.get("name", ""),
            config.get("task", ""),
            (time.perf_counter() - started) * 1000,
        )
        return jsonify(result)
    except KeyError as exc:
        logger.warning("custom_prediction_missing_image image_id=%s", image_id)
        raise NotFound(f"Image not found: {image_id}") from exc
    except (RuntimeError, ValueError, FileNotFoundError) as exc:
        logger.exception("custom_prediction_failed image_id=%s elapsed_ms=%.1f", image_id, (time.perf_counter() - started) * 1000)
        raise BadRequest(str(exc)) from exc


@app.post("/api/images/<image_id>/segment-prompt")
def segment_with_prompt(image_id: str):
    payload = request.get_json(force=True)
    points = payload.get("points", [])
    label = str(payload.get("label") or "region")
    if not isinstance(points, list) or not points:
        raise BadRequest("At least one prompt point is required.")
    started = time.perf_counter()
    try:
        metadata = store.get_metadata(image_id)
        annotation = store.get_annotation(image_id)
        prediction = run_sam_prompt(metadata, annotation, points, label)
        result = store.save_annotation(image_id, prediction, action="prediction_sam_prompt")
        logger.info(
            "sam_prompt image_id=%s points=%s elapsed_ms=%.1f segments=%s",
            image_id,
            len(points),
            (time.perf_counter() - started) * 1000,
            len(result.get("segments", [])),
        )
        return jsonify(result)
    except KeyError as exc:
        raise NotFound(f"Image not found: {image_id}") from exc
    except (RuntimeError, ValueError, FileNotFoundError) as exc:
        logger.exception("sam_prompt_failed image_id=%s elapsed_ms=%.1f", image_id, (time.perf_counter() - started) * 1000)
        raise BadRequest(str(exc)) from exc


@app.post("/api/import")
def import_records():
    payload = request.get_json(force=True)
    records = payload.get("records", payload if isinstance(payload, list) else [])
    return jsonify(store.import_records(records))


@app.post("/api/import-folder")
def import_folder():
    payload = request.get_json(force=True)
    folder = Path(payload.get("folder", "")).expanduser().resolve()
    _ensure_browsable(folder)
    try:
        result = store.import_folder(payload)
        logger.info("import_folder folder=%s scanned=%s imported=%s skipped=%s", folder, result.get("scanned"), result.get("imported"), len(result.get("skipped", [])))
        return jsonify(result)
    except ValueError as exc:
        raise BadRequest(str(exc)) from exc


@app.post("/api/upload-folder")
def upload_folder():
    files = request.files.getlist("files")
    if not files:
        raise BadRequest("No files selected.")

    options = {
        "batch": request.form.get("batch", ""),
        "scene": request.form.get("scene", ""),
        "weather": request.form.get("weather", ""),
        "flight_height_m": request.form.get("flight_height_m", ""),
        "longitude": request.form.get("longitude", ""),
        "latitude": request.form.get("latitude", ""),
        "tasks": request.form.getlist("tasks"),
        "replace_existing": request.form.get("replace_existing", ""),
    }
    upload_root = ROOT / "data" / "client_uploads" / datetime.now().strftime("%Y%m%d_%H%M%S")
    saved_paths = []
    for file_storage in files:
        relative_name = file_storage.filename or file_storage.name
        if Path(relative_name).suffix.lower() not in IMAGE_EXTENSIONS:
            continue
        safe_parts = [secure_filename(part) for part in Path(relative_name).parts if part not in {"", ".", ".."}]
        if not safe_parts:
            continue
        target = upload_root.joinpath(*safe_parts)
        target.parent.mkdir(parents=True, exist_ok=True)
        file_storage.save(target)
        saved_paths.append(target)

    result = store.import_paths(
        saved_paths,
        upload_root,
        options,
        note="电脑本地文件夹上传导入，图片已复制到服务器 client_uploads。",
    )
    result.update({"folder": str(upload_root), "uploaded": len(saved_paths), "scanned": len(files)})
    logger.info("upload_folder folder=%s uploaded=%s imported=%s skipped=%s", upload_root, len(saved_paths), result.get("imported"), len(result.get("skipped", [])))
    return jsonify(result)


@app.get("/api/stats")
def stats():
    return jsonify(store.stats())


@app.get("/api/quality-report")
def quality_report():
    return jsonify(store.quality_report())


@app.get("/api/risk-queue")
def risk_queue():
    limit = int(request.args.get("limit", "100") or 100)
    risk_types = _risk_types_from_request()
    return jsonify(store.risk_queue(_image_filters_from_request(), limit=limit, risk_types=risk_types))


@app.get("/api/review-sampling/export")
def review_sampling_export():
    sample_rate = float(request.args.get("sample_rate", "0.1") or 0.1)
    min_per_group = int(request.args.get("min_per_group", "1") or 1)
    risk_required = request.args.get("risk_required", "1").lower() in {"1", "true", "yes", "on"}
    seed = request.args.get("seed", "uaiv-formal-annotation")
    result = store.export_review_sampling_queue(
        _image_filters_from_request(),
        sample_rate=sample_rate,
        min_per_group=min_per_group,
        risk_required=risk_required,
        seed=seed,
    )
    logger.info(
        "review_sampling_export matched=%s selected=%s csv=%s",
        result.get("matched"),
        result.get("selected"),
        result.get("csv_path"),
    )
    return jsonify(result)


@app.post("/api/dataset-card")
def dataset_card():
    result = store.write_dataset_card()
    logger.info("dataset_card_generated path=%s", result.get("path"))
    return jsonify(result)


@app.get("/api/index/status")
def index_status():
    return jsonify(store.index_status())


@app.post("/api/index/rebuild")
def index_rebuild():
    result = store.rebuild_index()
    logger.info("index_rebuilt indexed_images=%s path=%s", result.get("indexed_images"), result.get("path"))
    return jsonify(result)


@app.get("/api/qa/tsv/meta")
def qa_tsv_meta():
    path = _qa_file_from_request(".tsv")
    return jsonify(tsv_meta(path))


@app.get("/api/qa/tsv/item")
def qa_tsv_item():
    path = _qa_file_from_request(".tsv")
    index = int(request.args.get("i", "0"))
    try:
        return jsonify(tsv_item(path, index))
    except IndexError as exc:
        raise BadRequest(str(exc)) from exc


@app.post("/api/qa/tsv/save")
def qa_tsv_save():
    path = _qa_file_from_request(".tsv")
    index = int(request.args.get("i", "0"))
    try:
        return jsonify(write_clean_row(path, index, request.get_json(force=True)))
    except IndexError as exc:
        raise BadRequest(str(exc)) from exc


@app.get("/api/qa/result/meta")
def qa_result_meta():
    path = _qa_file_from_request(".xlsx")
    wrong_only = request.args.get("wrong", "0") in {"1", "true", "yes"}
    try:
        return jsonify(result_meta(path, wrong_only=wrong_only))
    except (RuntimeError, ValueError) as exc:
        raise BadRequest(str(exc)) from exc


@app.get("/api/qa/result/item")
def qa_result_item():
    path = _qa_file_from_request(".xlsx")
    wrong_only = request.args.get("wrong", "0") in {"1", "true", "yes"}
    index = int(request.args.get("i", "0"))
    try:
        return jsonify(result_item(path, index, wrong_only=wrong_only))
    except (RuntimeError, ValueError, IndexError) as exc:
        raise BadRequest(str(exc)) from exc


@app.get("/api/qa/image")
def qa_image():
    raw_path = request.args.get("path", "")
    filename = request.args.get("filename", "")
    image_path = Path(raw_path).expanduser() if raw_path else None
    if image_path and image_path.exists() and image_path.is_file():
        resolved = image_path.resolve()
        _ensure_browsable(resolved)
        return send_file(resolved)

    image_root = request.args.get("image_root", "")
    if image_root:
        root = Path(image_root).expanduser().resolve()
        _ensure_browsable(root)
        if root.exists() and root.is_dir():
            names = _candidate_image_names(raw_path)
            if filename:
                names.extend(_candidate_image_names(filename))
            stems = [Path(item).stem for item in names if item]
            for name in [item for item in names if item]:
                for candidate in root.rglob(name):
                    if candidate.is_file() and candidate.suffix.lower() in IMAGE_EXTENSIONS:
                        return send_file(candidate.resolve())
            for stem in [item for item in stems if item]:
                for suffix in IMAGE_EXTENSIONS:
                    for candidate in root.rglob(f"{stem}{suffix}"):
                        if candidate.is_file():
                            return send_file(candidate.resolve())
    raise NotFound(f"Image not found: {raw_path or filename}")


def _candidate_image_names(value: str) -> list[str]:
    if not value:
        return []
    names = []
    for name in [Path(value).name, PureWindowsPath(value).name]:
        if name and name not in names:
            names.append(name)
    return names


def _risk_types_from_request() -> set[str]:
    values = request.args.getlist("risk_type")
    combined = ",".join(values)
    return {item.strip() for item in combined.split(",") if item.strip()}


@app.post("/api/export/<fmt>")
def export(fmt: str):
    return jsonify(store.export(fmt))


@app.get("/api/export/<fmt>/download")
def export_download(fmt: str):
    try:
        result = store.export(fmt)
    except ValueError as exc:
        raise BadRequest(str(exc)) from exc
    path = Path(result["path"])
    if path.is_dir():
        archive = store.exports_dir / f"{path.name}.zip"
        with ZipFile(archive, "w", compression=ZIP_DEFLATED) as zf:
            for file_path in sorted(path.rglob("*")):
                if file_path.is_file():
                    zf.write(file_path, file_path.relative_to(path))
        return send_file(archive, as_attachment=True, download_name=archive.name)
    return send_file(path, as_attachment=True, download_name=path.name)


@app.get("/images/<path:filename>")
def image_file(filename: str):
    return send_from_directory(ROOT / "data" / "images", filename)


@app.get("/api/images/<image_id>/file")
def image_file_by_id(image_id: str):
    try:
        metadata = store.get_metadata(image_id)
    except KeyError as exc:
        raise NotFound(f"Image not found: {image_id}") from exc
    image_path = storage.resolve_image_path(metadata)
    if image_path.exists():
        return send_file(image_path.resolve())
    return send_from_directory(ROOT / "data" / "images", metadata["file_name"])


@app.get("/api/tiles/<image_id>/<int:z>/<int:x>/<int:y>.jpg")
def image_tile(image_id: str, z: int, x: int, y: int):
    try:
        metadata = store.get_metadata(image_id)
    except KeyError as exc:
        raise NotFound(f"Image not found: {image_id}") from exc
    image_path = storage.resolve_image_path(metadata)
    if not image_path.exists():
        raise NotFound(f"Image file not found: {image_path}")
    tile_size = int(request.args.get("size", "256"))
    tile_size = max(128, min(tile_size, 512))
    try:
        with Image.open(image_path) as image:
            image = image.convert("RGB")
            scale = max(1, 2 ** max(z, 0))
            level_width = max(tile_size, image.width // scale)
            level_height = max(tile_size, image.height // scale)
            source_tile = tile_size * scale
            left = x * source_tile
            top = y * source_tile
            right = min(left + source_tile, image.width)
            bottom = min(top + source_tile, image.height)
            if left >= image.width or top >= image.height:
                raise NotFound("Tile is outside image bounds.")
            tile = image.crop((left, top, right, bottom))
            tile.thumbnail((tile_size, tile_size))
            safe_id = re.sub(r"[^0-9A-Za-z_\-\u4e00-\u9fff]+", "_", image_id).strip("_") or "unknown"
            out = ROOT / "data" / "tile_cache" / safe_id / str(z) / str(x)
            out.mkdir(parents=True, exist_ok=True)
            target = out / f"{y}.jpg"
            tile.save(target, quality=86)
            return send_file(target)
    except NotFound:
        raise
    except Exception as exc:
        logger.exception("tile_failed image_id=%s z=%s x=%s y=%s", image_id, z, x, y)
        raise BadRequest(str(exc)) from exc


def _ensure_browsable(path: Path) -> None:
    if not any(path == root or root in path.parents for root in ALLOWED_BROWSE_ROOTS):
        raise Forbidden(f"Path is outside allowed roots: {path}")


def _qa_file_from_request(suffix: str) -> Path:
    raw_path = request.args.get("path", "")
    if not raw_path:
        raise BadRequest("Missing path.")
    path = Path(raw_path).expanduser().resolve()
    _ensure_browsable(path)
    if not path.exists() or not path.is_file():
        raise NotFound(f"File not found: {path}")
    if path.suffix.lower() != suffix:
        raise BadRequest(f"Expected {suffix} file: {path}")
    return path


if __name__ == "__main__":
    host = os.environ.get("URBAN_ANNOTATION_HOST", "0.0.0.0")
    port = int(os.environ.get("URBAN_ANNOTATION_PORT", "7860"))
    app.run(host=host, port=port, debug=False)
