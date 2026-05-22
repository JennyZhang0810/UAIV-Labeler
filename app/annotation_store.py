from __future__ import annotations

import json
import os
import re
import threading
from collections import Counter
from datetime import datetime
from pathlib import Path
from typing import Any
from xml.etree.ElementTree import Element, SubElement, tostring

from PIL import ExifTags, Image

from model_backend import blank_annotation, predict


IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".tif", ".tiff", ".bmp", ".webp"}
TASK_STATES = {"unlabeled", "predicted", "labeled", "verified", "rejected"}
STATUS_ALIASES = {
    "pending": "predicted",
    "reviewed": "verified",
    "ready": "verified",
    "needs_review": "predicted",
    "needs_relabel": "rejected",
}


class AnnotationStore:
    def __init__(self, root: Path):
        self.root = root
        self.data_dir = root / "data"
        self.exports_dir = root / "exports"
        self.history_dir = self.data_dir / "history"
        self.metadata_path = self.data_dir / "metadata.json"
        self.annotations_path = self.data_dir / "annotations.json"
        self._lock = threading.RLock()
        self.exports_dir.mkdir(parents=True, exist_ok=True)
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self.history_dir.mkdir(parents=True, exist_ok=True)
        if not self.annotations_path.exists():
            self._write_json(self.annotations_path, {})
        if not self.metadata_path.exists():
            self._write_json(self.metadata_path, [])
        self._metadata_cache = self._read_json(self.metadata_path, [])
        self._annotations_cache = self._read_json(self.annotations_path, {})

    def _read_json(self, path: Path, default: Any) -> Any:
        if not path.exists():
            return default
        return json.loads(path.read_text(encoding="utf-8"))

    def _write_json(self, path: Path, value: Any) -> None:
        tmp_path = path.with_suffix(path.suffix + ".tmp")
        tmp_path.write_text(json.dumps(value, ensure_ascii=False, indent=2), encoding="utf-8")
        tmp_path.replace(path)

    def _write_history_snapshot(self, image_id: str, action: str, annotation: dict[str, Any]) -> None:
        safe_id = re.sub(r"[^0-9A-Za-z_\-\u4e00-\u9fff]+", "_", image_id).strip("_") or "unknown"
        timestamp = datetime.utcnow().strftime("%Y%m%dT%H%M%S%fZ")
        target_dir = self.history_dir / safe_id
        target_dir.mkdir(parents=True, exist_ok=True)
        snapshot = {
            "image_id": image_id,
            "action": action,
            "saved_at": datetime.utcnow().isoformat() + "Z",
            "annotation": annotation,
        }
        self._write_json(target_dir / f"{timestamp}_{action}.json", snapshot)
        self._cleanup_history(target_dir)

    def _cleanup_history(self, target_dir: Path) -> None:
        keep = int(os.environ.get("UAIV_HISTORY_KEEP", "10"))
        if keep <= 0:
            return
        snapshots = sorted(target_dir.glob("*.json"), key=lambda item: item.stat().st_mtime, reverse=True)
        for old_snapshot in snapshots[keep:]:
            old_snapshot.unlink(missing_ok=True)

    def list_images(self, filters: dict[str, str]) -> list[dict[str, Any]]:
        with self._lock:
            result = []
            for item in self._metadata_cache:
                if filters.get("task") and filters["task"] not in item.get("tasks", []):
                    continue
                if filters.get("scene") and filters["scene"] != item.get("scene"):
                    continue
                if filters.get("weather") and filters["weather"] != item.get("weather"):
                    continue
                if filters.get("batch") and filters["batch"] != item.get("batch"):
                    continue
                source_type = _source_type(item)
                if filters.get("source_type") and filters["source_type"] != source_type:
                    continue
                min_alt = filters.get("min_altitude")
                max_alt = filters.get("max_altitude")
                altitude = _optional_float(item.get("flight_height_m"))
                altitude = altitude if isinstance(altitude, float) else 0.0
                if min_alt and altitude < float(min_alt):
                    continue
                if max_alt and altitude > float(max_alt):
                    continue
                longitude = _optional_float(item.get("longitude"))
                latitude = _optional_float(item.get("latitude"))
                if not _in_optional_range(longitude, filters.get("min_longitude"), filters.get("max_longitude")):
                    continue
                if not _in_optional_range(latitude, filters.get("min_latitude"), filters.get("max_latitude")):
                    continue
                ann = self._annotations_cache.get(item["id"], {})
                result.append(
                    {
                        "id": item["id"],
                        "file_name": item.get("file_name", ""),
                        "batch": item.get("batch", ""),
                        "weather": item.get("weather", ""),
                        "scene": item.get("scene", ""),
                        "tasks": item.get("tasks", []),
                        "flight_height_m": item.get("flight_height_m", ""),
                        "longitude": item.get("longitude", ""),
                        "latitude": item.get("latitude", ""),
                        "source_type": source_type,
                        "review_status": normalize_review_status(ann.get("review_status", "unlabeled")),
                    }
                )
            return result

    def get_metadata(self, image_id: str) -> dict[str, Any]:
        with self._lock:
            for item in self._metadata_cache:
                if item["id"] == image_id:
                    return item
        raise KeyError(image_id)

    def get_annotation(self, image_id: str) -> dict[str, Any]:
        with self._lock:
            if image_id not in self._annotations_cache:
                metadata = self.get_metadata(image_id)
                self._annotations_cache[image_id] = blank_annotation(metadata)
                self._annotations_cache[image_id]["created_at"] = datetime.utcnow().isoformat() + "Z"
                self._annotations_cache[image_id]["updated_at"] = self._annotations_cache[image_id]["created_at"]
                self._write_json(self.annotations_path, self._annotations_cache)
            return self._annotations_cache[image_id]

    def save_annotation(self, image_id: str, payload: dict[str, Any], action: str = "review") -> dict[str, Any]:
        with self._lock:
            payload = validate_annotation_payload(payload)
            payload["image_id"] = image_id
            payload["updated_at"] = datetime.utcnow().isoformat() + "Z"
            payload["review_status"] = next_review_status(action, payload.get("review_status"))
            self._write_history_snapshot(image_id, action, payload)
            self._annotations_cache[image_id] = payload
            self._write_json(self.annotations_path, self._annotations_cache)
            return payload

    def rerun_prediction(self, image_id: str) -> dict[str, Any]:
        with self._lock:
            metadata = self.get_metadata(image_id)
            prediction = predict(metadata)
            prediction["created_at"] = datetime.utcnow().isoformat() + "Z"
            prediction["updated_at"] = prediction["created_at"]
            prediction["review_status"] = "predicted"
            self._write_history_snapshot(image_id, "prediction", prediction)
            self._annotations_cache[image_id] = prediction
            self._write_json(self.annotations_path, self._annotations_cache)
            return prediction

    def import_records(self, records: list[dict[str, Any]]) -> dict[str, Any]:
        with self._lock:
            current = {item["id"]: item for item in self._metadata_cache}
            for item in records:
                current[item["id"]] = item
            merged = list(current.values())
            self._metadata_cache = merged
            self._write_json(self.metadata_path, merged)
            return {"total": len(merged), "imported": len(records)}

    def reset_dataset(self) -> None:
        with self._lock:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            backup_dir = self.data_dir / "backups" / timestamp
            backup_dir.mkdir(parents=True, exist_ok=True)
            if self.metadata_path.exists():
                (backup_dir / self.metadata_path.name).write_text(self.metadata_path.read_text(encoding="utf-8"), encoding="utf-8")
            if self.annotations_path.exists():
                (backup_dir / self.annotations_path.name).write_text(self.annotations_path.read_text(encoding="utf-8"), encoding="utf-8")
            self._metadata_cache = []
            self._annotations_cache = {}
            self._write_json(self.metadata_path, self._metadata_cache)
            self._write_json(self.annotations_path, self._annotations_cache)

    def facets(self) -> dict[str, list[str]]:
        with self._lock:
            return {
                "batches": sorted({item.get("batch", "") for item in self._metadata_cache if item.get("batch")}),
                "scenes": sorted({item.get("scene", "") for item in self._metadata_cache if item.get("scene")}),
                "weather": sorted({item.get("weather", "") for item in self._metadata_cache if item.get("weather")}),
                "source_types": sorted({_source_type(item) for item in self._metadata_cache}),
            }

    def import_folder(self, options: dict[str, Any]) -> dict[str, Any]:
        folder = Path(options.get("folder", "")).expanduser().resolve()
        if not folder.exists() or not folder.is_dir():
            raise ValueError(f"Folder does not exist or is not a directory: {folder}")

        recursive = bool(options.get("recursive", True))
        pattern = "**/*" if recursive else "*"
        files = sorted(path for path in folder.glob(pattern) if path.suffix.lower() in IMAGE_EXTENSIONS)
        result = self.import_paths(files, folder, options, note="服务器目录导入，图片未复制，仅记录服务器本地路径。")
        result.update({"folder": str(folder), "scanned": len(files)})
        return result

    def import_paths(
        self,
        files: list[Path],
        source_root: Path,
        options: dict[str, Any],
        note: str,
    ) -> dict[str, Any]:
        if _truthy(options.get("replace_existing")):
            self.reset_dataset()

        defaults = {
            "batch": options.get("batch") or "未指定批次",
            "weather": options.get("weather") or "未知",
            "scene": options.get("scene") or "未标注",
            "flight_height_m": _optional_float(options.get("flight_height_m")),
            "tasks": options.get("tasks") or ["scene_classification", "object_detection", "event_qa"],
            "longitude": _optional_float(options.get("longitude")),
            "latitude": _optional_float(options.get("latitude")),
        }

        records = []
        skipped = []
        now = datetime.now().astimezone().isoformat(timespec="seconds")
        for path in files:
            try:
                with Image.open(path) as image:
                    width, height = image.size
                    extracted = _extract_image_metadata(image)
            except Exception as exc:
                skipped.append({"path": str(path), "reason": str(exc)})
                continue

            relative = path.relative_to(source_root)
            image_id = _make_image_id(source_root.name, relative)
            records.append(
                {
                    "id": image_id,
                    "file_name": path.name,
                    "image_path": str(path),
                    "source_folder": str(source_root),
                    "relative_path": str(relative),
                    "storage_key": str(relative),
                    "batch": defaults["batch"],
                    "capture_time": options.get("capture_time") or extracted.get("capture_time") or now,
                    "flight_height_m": defaults["flight_height_m"] if defaults["flight_height_m"] != "" else extracted.get("flight_height_m", ""),
                    "longitude": defaults["longitude"] if defaults["longitude"] != "" else extracted.get("longitude", ""),
                    "latitude": defaults["latitude"] if defaults["latitude"] != "" else extracted.get("latitude", ""),
                    "weather": defaults["weather"],
                    "scene": defaults["scene"],
                    "tasks": defaults["tasks"],
                    "width": width,
                    "height": height,
                    "source_type": options.get("source_type") or "actual",
                    "clear_pair_id": "",
                    "notes": note,
                }
            )

        result = self.import_records(records)
        result.update({"skipped": skipped})
        return result

    def stats(self) -> dict[str, Any]:
        with self._lock:
            task_counter = Counter(task for item in self._metadata_cache for task in item.get("tasks", []))
            scene_counter = Counter(item.get("scene", "未标注") for item in self._metadata_cache)
            weather_counter = Counter(item.get("weather", "未知") for item in self._metadata_cache)
            batch_counter = Counter(item.get("batch", "未知") for item in self._metadata_cache)
            status_counter = Counter(normalize_review_status(ann.get("review_status", "unlabeled")) for ann in self._annotations_cache.values())
            object_counter = Counter()
            event_counter = Counter()
            origin_counter = Counter()
            for ann in self._annotations_cache.values():
                for obj in ann.get("objects", []):
                    object_counter.update([obj.get("label", "unknown")])
                    origin_counter.update([_annotation_origin(obj.get("status", ""))])
                event_counter.update(evt.get("label", "unknown") for evt in ann.get("events", []))
            return {
                "total_images": len(self._metadata_cache),
                "task_counts": dict(task_counter),
                "scene_counts": dict(scene_counter),
                "weather_counts": dict(weather_counter),
                "batch_counts": dict(batch_counter),
                "review_status_counts": dict(status_counter),
                "object_counts": dict(object_counter),
                "object_origin_counts": dict(origin_counter),
                "event_counts": dict(event_counter),
                "lead_time": self._lead_time_stats(),
            }

    def _lead_time_stats(self) -> dict[str, Any]:
        durations = []
        by_model: dict[str, list[float]] = {}
        for image_dir in self.history_dir.iterdir() if self.history_dir.exists() else []:
            if not image_dir.is_dir():
                continue
            snapshots = []
            for path in sorted(image_dir.glob("*.json")):
                try:
                    payload = self._read_json(path, {})
                    saved_at = datetime.fromisoformat(str(payload.get("saved_at", "")).replace("Z", "+00:00"))
                except Exception:
                    continue
                snapshots.append((saved_at, str(payload.get("action", "")), payload.get("image_id", image_dir.name)))
            predictions = [(saved_at, action) for saved_at, action, _ in snapshots if action.startswith("prediction")]
            reviews = [(saved_at, action) for saved_at, action, _ in snapshots if action == "review"]
            for review_time, _ in reviews:
                previous_predictions = [(ts, action) for ts, action in predictions if ts <= review_time]
                if not previous_predictions:
                    continue
                prediction_time, prediction_action = previous_predictions[-1]
                seconds = max(0.0, (review_time - prediction_time).total_seconds())
                durations.append(seconds)
                model_id = prediction_action.replace("prediction_", "") if prediction_action != "prediction" else "mock"
                by_model.setdefault(model_id, []).append(seconds)
        return {
            "count": len(durations),
            "avg_seconds": round(sum(durations) / len(durations), 2) if durations else 0,
            "by_model": {
                model: {"count": len(values), "avg_seconds": round(sum(values) / len(values), 2)}
                for model, values in sorted(by_model.items())
                if values
            },
        }

    def export(self, fmt: str) -> dict[str, str]:
        with self._lock:
            if fmt == "json":
                return self._export_json()
            if fmt == "coco":
                return self._export_coco()
            if fmt == "voc":
                return self._export_voc()
            if fmt == "qa":
                return self._export_qa()
            raise ValueError(f"Unsupported export format: {fmt}")

    def _export_json(self) -> dict[str, str]:
        path = self.exports_dir / "annotations_full.json"
        payload = {
            "metadata": self._metadata_cache,
            "annotations": self._annotations_cache,
            "exported_at": datetime.utcnow().isoformat() + "Z",
        }
        self._write_json(path, payload)
        return {"path": str(path)}

    def _export_coco(self) -> dict[str, str]:
        metadata = self._metadata_cache
        annotations = self._annotations_cache
        image_id_map = {item["id"]: idx for idx, item in enumerate(metadata, start=1)}
        categories = {}
        coco_annotations = []
        for item in metadata:
            ann = annotations.get(item["id"], {})
            for obj in ann.get("objects", []):
                label = obj.get("label", "unknown")
                categories.setdefault(label, len(categories) + 1)
                x, y, w, h = obj.get("bbox", [0, 0, 0, 0])
                coco_annotations.append(
                    {
                        "id": len(coco_annotations) + 1,
                        "image_id": image_id_map[item["id"]],
                        "category_id": categories[label],
                        "bbox": [x, y, w, h],
                        "area": w * h,
                        "iscrowd": 0,
                        "score": obj.get("score"),
                    }
                )
        payload = {
            "images": [
                {
                    "id": image_id_map[item["id"]],
                    "file_name": item["file_name"],
                    "width": item.get("width"),
                    "height": item.get("height"),
                    "metadata": item,
                }
                for item in metadata
            ],
            "annotations": coco_annotations,
            "categories": [{"id": cid, "name": name} for name, cid in categories.items()],
        }
        path = self.exports_dir / "annotations_coco.json"
        self._write_json(path, payload)
        return {"path": str(path)}

    def _export_voc(self) -> dict[str, str]:
        out_dir = self.exports_dir / "voc"
        out_dir.mkdir(parents=True, exist_ok=True)
        metadata_by_id = {item["id"]: item for item in self._metadata_cache}
        annotations = self._annotations_cache
        for image_id, ann in annotations.items():
            meta = metadata_by_id.get(image_id)
            if not meta:
                continue
            root = Element("annotation")
            SubElement(root, "filename").text = meta["file_name"]
            size = SubElement(root, "size")
            SubElement(size, "width").text = str(meta.get("width", 0))
            SubElement(size, "height").text = str(meta.get("height", 0))
            SubElement(size, "depth").text = "3"
            for obj in ann.get("objects", []):
                node = SubElement(root, "object")
                SubElement(node, "name").text = obj.get("label", "unknown")
                box = SubElement(node, "bndbox")
                x, y, w, h = obj.get("bbox", [0, 0, 0, 0])
                SubElement(box, "xmin").text = str(int(x))
                SubElement(box, "ymin").text = str(int(y))
                SubElement(box, "xmax").text = str(int(x + w))
                SubElement(box, "ymax").text = str(int(y + h))
            (out_dir / f"{image_id}.xml").write_bytes(tostring(root, encoding="utf-8"))
        return {"path": str(out_dir)}

    def _export_qa(self) -> dict[str, str]:
        metadata_by_id = {item["id"]: item for item in self._metadata_cache}
        annotations = self._annotations_cache
        lines = []
        for image_id, ann in annotations.items():
            meta = metadata_by_id.get(image_id, {})
            for event in ann.get("events", []):
                lines.append(
                    json.dumps(
                        {
                            "image_id": image_id,
                            "file_name": meta.get("file_name"),
                            "question": event.get("question"),
                            "answer": event.get("answer"),
                            "event_label": event.get("label"),
                            "metadata": meta,
                        },
                        ensure_ascii=False,
                    )
                )
        path = self.exports_dir / "qa_annotations.jsonl"
        path.write_text("\n".join(lines) + ("\n" if lines else ""), encoding="utf-8")
        return {"path": str(path)}


def _optional_float(value: Any) -> float | str:
    if value in (None, ""):
        return ""
    try:
        return float(value)
    except (TypeError, ValueError):
        return ""


def _truthy(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    return str(value or "").strip().lower() in {"1", "true", "yes", "on"}


def _in_optional_range(value: Any, min_value: Any, max_value: Any) -> bool:
    if not min_value and not max_value:
        return True
    if not isinstance(value, float):
        return False
    if min_value and value < float(min_value):
        return False
    if max_value and value > float(max_value):
        return False
    return True


def _make_image_id(folder_name: str, relative_path: Path) -> str:
    stem = f"{folder_name}_{relative_path.with_suffix('')}"
    return re.sub(r"[^0-9A-Za-z_\-\u4e00-\u9fff]+", "_", str(stem)).strip("_")


def _extract_image_metadata(image: Image.Image) -> dict[str, Any]:
    result: dict[str, Any] = {}
    try:
        exif = image.getexif()
    except Exception:
        return result
    if not exif:
        return result

    tag_names = {ExifTags.TAGS.get(tag, tag): value for tag, value in exif.items()}
    capture_time = tag_names.get("DateTimeOriginal") or tag_names.get("DateTime")
    if capture_time:
        result["capture_time"] = str(capture_time)

    gps_ifd = None
    try:
        gps_ifd = exif.get_ifd(ExifTags.IFD.GPSInfo)
    except Exception:
        gps_raw = tag_names.get("GPSInfo")
        if isinstance(gps_raw, dict):
            gps_ifd = gps_raw
    if not gps_ifd:
        return result

    gps = {ExifTags.GPSTAGS.get(tag, tag): value for tag, value in gps_ifd.items()}
    lat = _gps_to_decimal(gps.get("GPSLatitude"), gps.get("GPSLatitudeRef"))
    lon = _gps_to_decimal(gps.get("GPSLongitude"), gps.get("GPSLongitudeRef"))
    if lat is not None:
        result["latitude"] = round(lat, 7)
    if lon is not None:
        result["longitude"] = round(lon, 7)
    altitude = gps.get("GPSAltitude")
    if altitude is not None:
        try:
            result["flight_height_m"] = round(float(altitude), 2)
        except (TypeError, ValueError, ZeroDivisionError):
            pass
    return result


def _gps_to_decimal(value: Any, ref: Any) -> float | None:
    if not value or len(value) != 3:
        return None
    try:
        deg, minute, second = [float(item) for item in value]
        decimal = deg + minute / 60.0 + second / 3600.0
        if str(ref).upper() in {"S", "W"}:
            decimal *= -1
        return decimal
    except (TypeError, ValueError, ZeroDivisionError):
        return None


def _source_type(item: dict[str, Any]) -> str:
    explicit = item.get("source_type")
    if explicit in {"demo", "actual"}:
        return explicit
    if item.get("image_path") or item.get("source_folder"):
        return "actual"
    return "demo"


def _annotation_origin(status: str) -> str:
    if str(status).startswith("model"):
        return "model"
    if status == "human":
        return "human"
    if status == "empty":
        return "empty"
    return "unknown"


def normalize_review_status(status: Any) -> str:
    value = str(status or "unlabeled").strip().lower()
    value = STATUS_ALIASES.get(value, value)
    return value if value in TASK_STATES else "unlabeled"


def next_review_status(action: str, explicit_status: Any) -> str:
    status = normalize_review_status(explicit_status)
    if action.startswith("prediction"):
        return "predicted"
    if action == "review" and status in {"unlabeled", "predicted"}:
        return "labeled"
    return status


def validate_annotation_payload(payload: dict[str, Any]) -> dict[str, Any]:
    if not isinstance(payload, dict):
        raise ValueError("Annotation payload must be a JSON object.")
    clean = dict(payload)
    for key in ["objects", "segments", "ocr", "events"]:
        value = clean.get(key, [])
        if value is None:
            value = []
        if not isinstance(value, list):
            raise ValueError(f"Annotation field '{key}' must be a list.")
        clean[key] = value
    for index, obj in enumerate(clean["objects"]):
        if not isinstance(obj, dict):
            raise ValueError(f"objects[{index}] must be an object.")
        bbox = obj.get("bbox", [])
        if not isinstance(bbox, list) or len(bbox) != 4:
            raise ValueError(f"objects[{index}].bbox must be [x, y, width, height].")
        try:
            obj["bbox"] = [float(item) for item in bbox]
        except (TypeError, ValueError) as exc:
            raise ValueError(f"objects[{index}].bbox contains non-numeric values.") from exc
        obj["label"] = str(obj.get("label") or "object")
    for index, segment in enumerate(clean["segments"]):
        if not isinstance(segment, dict):
            raise ValueError(f"segments[{index}] must be an object.")
        points = segment.get("points", [])
        if not isinstance(points, list):
            raise ValueError(f"segments[{index}].points must be a list.")
        for point_index, point in enumerate(points):
            if not isinstance(point, list) or len(point) != 2:
                raise ValueError(f"segments[{index}].points[{point_index}] must be [x, y].")
    clean["review_status"] = normalize_review_status(clean.get("review_status"))
    return clean
