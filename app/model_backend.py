from __future__ import annotations

import hashlib
import random
from typing import Any

from schemas import EVENT_LABELS, OBJECT_LABELS, SCENE_LABELS, SEGMENT_LABELS, WEATHER_LABELS


def _rng(image_id: str) -> random.Random:
    seed = int(hashlib.sha1(image_id.encode("utf-8")).hexdigest()[:8], 16)
    return random.Random(seed)


def blank_annotation(metadata: dict[str, Any]) -> dict[str, Any]:
    tasks = set(metadata.get("tasks") or [])
    scene_label = metadata.get("scene", "") if "scene_classification" in tasks else ""
    weather_label = metadata.get("weather", "") if "environment_state" in tasks else ""
    event_label = metadata.get("event_label", "") if {"event_qa", "event_understanding"} & tasks else ""
    urban_label = metadata.get("urban_structure_label", "") if "urban_structure" in tasks else ""
    scene_combination = metadata.get("scene_combination_label", "") if "scene_classification" in tasks else ""
    urban_combination = metadata.get("urban_combination_label", "") if "urban_structure" in tasks else ""
    scene_secondary = _split_prefill_labels(scene_combination)
    urban_secondary = _split_prefill_labels(urban_combination)
    return {
        "image_id": metadata["id"],
        "review_status": "unlabeled",
        "prefill_source": "metadata_rules",
        "scene": {
            "label": scene_label,
            "combination_label": scene_combination,
            "secondary_labels": scene_secondary,
            "score": None,
            "status": "rule_prefill" if scene_label or scene_combination else "empty",
        },
        "environment": {"label": weather_label, "score": None, "status": "rule_prefill" if weather_label else "empty"},
        "objects": [],
        "segments": [],
        "ocr": [],
        "events": [
            {
                "label": event_label,
                "question": "",
                "answer": "",
                "score": None,
                "status": "rule_prefill",
            }
        ] if event_label else [],
        "restoration": {
            "degradation": "",
            "clear_pair_id": metadata.get("clear_pair_id", ""),
            "quality": "",
            "status": "empty",
        },
        "urban_structure": {
            "label": urban_label,
            "summary": urban_label,
            "combination_label": urban_combination,
            "secondary_labels": urban_secondary,
            "status": "rule_prefill" if urban_label or urban_combination else "empty",
        },
    }


def _split_prefill_labels(value: Any) -> list[str]:
    return [item.strip() for item in str(value or "").replace("，", "+").replace(",", "+").replace(";", "+").replace("；", "+").split("+") if item.strip()]


def predict(metadata: dict[str, Any]) -> dict[str, Any]:
    """Mock model backend for semi-automatic annotation.

    Replace this function with YOLO/SAM/OCR/VLM/restoration model calls.
    The response is deliberately close to COCO/VOC/QA export structures.
    """
    rng = _rng(metadata["id"])
    width = metadata.get("width", 1024)
    height = metadata.get("height", 768)
    scene = metadata.get("scene") or rng.choice(SCENE_LABELS)
    weather = metadata.get("weather") or rng.choice(WEATHER_LABELS)

    boxes = []
    for _ in range(rng.randint(2, 5)):
        w = rng.randint(70, 170)
        h = rng.randint(50, 150)
        x = rng.randint(20, max(21, width - w - 20))
        y = rng.randint(20, max(21, height - h - 20))
        boxes.append(
            {
                "label": rng.choice(OBJECT_LABELS),
                "bbox": [x, y, w, h],
                "score": round(rng.uniform(0.62, 0.94), 2),
                "status": "model",
            }
        )

    polygons = []
    for idx in range(rng.randint(1, 2)):
        x = rng.randint(80, width // 2)
        y = rng.randint(80, height // 2)
        polygons.append(
            {
                "label": rng.choice(SEGMENT_LABELS),
                "points": [[x, y], [x + 220, y + 25], [x + 190, y + 170], [x - 30, y + 150]],
                "score": round(rng.uniform(0.55, 0.9), 2),
                "status": "model",
                "instance_id": f"seg-{idx + 1}",
            }
        )

    event = rng.choice(EVENT_LABELS)
    return {
        "image_id": metadata["id"],
        "review_status": "pending",
        "scene": {"label": scene, "score": 0.86, "status": "model"},
        "environment": {"label": weather, "score": 0.88, "status": "model"},
        "objects": boxes,
        "segments": polygons,
        "ocr": [
            {
                "text": "示例店招",
                "bbox": [int(width * 0.58), int(height * 0.18), 150, 42],
                "score": 0.73,
                "status": "model",
            }
        ],
        "events": [
            {
                "label": event,
                "question": "图像中是否存在需要城市或生态治理关注的事件？",
                "answer": f"疑似存在{event}，建议人工复核。",
                "score": 0.69,
                "status": "model",
            }
        ],
        "restoration": {
            "degradation": weather if weather in {"雨", "雾", "红外"} else "",
            "clear_pair_id": metadata.get("clear_pair_id", ""),
            "quality": "待复核",
            "status": "model",
        },
        "urban_structure": {
            "summary": f"{scene}场景，包含道路、水体或建筑等空间结构，需人工补充结构关系。",
            "status": "model",
        },
    }
