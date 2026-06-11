from __future__ import annotations

import json
import math
import os
import re
import threading
import csv
import random
from collections import Counter, defaultdict
from datetime import datetime
from pathlib import Path
from typing import Any
from xml.etree.ElementTree import Element, SubElement, tostring

from PIL import ExifTags, Image, ImageDraw

from data_index import DataIndex
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
        self.index_path = self.data_dir / "index.sqlite3"
        self.metadata_path = self.data_dir / "metadata.json"
        self.annotations_path = self.data_dir / "annotations.json"
        self._lock = threading.RLock()
        self.index = DataIndex(self.index_path)
        self.exports_dir.mkdir(parents=True, exist_ok=True)
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self.history_dir.mkdir(parents=True, exist_ok=True)
        if not self.annotations_path.exists():
            self._write_json(self.annotations_path, {})
        if not self.metadata_path.exists():
            self._write_json(self.metadata_path, [])
        self._metadata_cache = self._read_json(self.metadata_path, [])
        self._annotations_cache = self._read_json(self.annotations_path, {})
        self.rebuild_index()

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
                if filters.get("annotator_group") and filters["annotator_group"] != item.get("annotator_group"):
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
                        "annotator_group": item.get("annotator_group", ""),
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
            self.rebuild_index()
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
            self.rebuild_index()
            return prediction

    def import_records(self, records: list[dict[str, Any]]) -> dict[str, Any]:
        with self._lock:
            current = {item["id"]: item for item in self._metadata_cache}
            for item in records:
                current[item["id"]] = item
            merged = list(current.values())
            self._metadata_cache = merged
            self._write_json(self.metadata_path, merged)
            self.rebuild_index()
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
            self.rebuild_index()

    def backfill_rule_prefill(self, dry_run: bool = True) -> dict[str, Any]:
        with self._lock:
            created = 0
            replaced_empty = 0
            skipped_existing = 0
            skipped_human = 0
            skipped_prefill = 0
            skipped_no_rule = 0
            examples: list[dict[str, str]] = []
            updates: dict[str, dict[str, Any]] = {}

            for metadata in self._metadata_cache:
                image_id = metadata["id"]
                current = self._annotations_cache.get(image_id)
                stage = _annotation_stage(current)
                if stage == "no_annotation":
                    candidate = blank_annotation(metadata)
                    if not _annotation_source_counts(candidate).get("rule_prefill"):
                        skipped_no_rule += 1
                        continue
                    updates[image_id] = candidate
                    created += 1
                elif stage == "empty_annotation" and normalize_review_status(current.get("review_status")) == "unlabeled":
                    candidate = blank_annotation(metadata)
                    if not _annotation_source_counts(candidate).get("rule_prefill"):
                        skipped_no_rule += 1
                        continue
                    updates[image_id] = candidate
                    replaced_empty += 1
                elif stage in {"human_labeled", "verified", "rejected"}:
                    skipped_human += 1
                    continue
                elif stage in {"imported_prefill", "model_prefill", "rule_prefill"}:
                    skipped_prefill += 1
                    continue
                else:
                    skipped_existing += 1
                    continue
                if len(examples) < 20:
                    examples.append({"image_id": image_id, "relative_path": str(metadata.get("relative_path") or metadata.get("file_name") or "")})

            if not dry_run and updates:
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                backup_dir = self.data_dir / "backups" / f"{timestamp}_rule_prefill_backfill"
                backup_dir.mkdir(parents=True, exist_ok=True)
                if self.annotations_path.exists():
                    (backup_dir / self.annotations_path.name).write_text(self.annotations_path.read_text(encoding="utf-8"), encoding="utf-8")
                now = datetime.utcnow().isoformat() + "Z"
                for image_id, annotation in updates.items():
                    existing = self._annotations_cache.get(image_id)
                    annotation["created_at"] = existing.get("created_at", now) if isinstance(existing, dict) else now
                    annotation["updated_at"] = now
                    self._annotations_cache[image_id] = annotation
                self._write_json(self.annotations_path, self._annotations_cache)
                self.rebuild_index()

            return {
                "dry_run": dry_run,
                "created": created,
                "replaced_empty": replaced_empty,
                "skipped_existing": skipped_existing,
                "skipped_human": skipped_human,
                "skipped_prefill": skipped_prefill,
                "skipped_no_rule": skipped_no_rule,
                "would_update": len(updates),
                "updated": 0 if dry_run else len(updates),
                "examples": examples,
            }

    def batch_prediction_candidates(
        self,
        filters: dict[str, Any],
        include_stages: set[str] | None = None,
        limit: int = 100,
    ) -> dict[str, Any]:
        include_stages = include_stages or {"no_annotation", "empty_annotation", "rule_prefill"}
        limit = max(1, min(int(limit or 100), 1000))
        with self._lock:
            metadata_by_id = {item["id"]: item for item in self._metadata_cache}
            rows = self.list_images(filters)
            candidates = []
            stage_counter = Counter()
            skipped_stage = Counter()
            for row in rows:
                image_id = row["id"]
                ann = self._annotations_cache.get(image_id)
                stage = _annotation_stage(ann)
                stage_counter.update([stage])
                if stage not in include_stages:
                    skipped_stage.update([stage])
                    continue
                if len(candidates) >= limit:
                    continue
                metadata = metadata_by_id.get(image_id)
                if metadata:
                    candidates.append({"image_id": image_id, "relative_path": str(metadata.get("relative_path") or metadata.get("file_name") or ""), "stage": stage})
            return {
                "matched": len(rows),
                "limit": limit,
                "candidate_count": len(candidates),
                "stage_counts": dict(stage_counter),
                "skipped_stage_counts": dict(skipped_stage),
                "candidates": candidates,
            }

    def rebuild_index(self) -> dict[str, Any]:
        return self.index.rebuild(self._metadata_cache, self._annotations_cache)

    def index_status(self) -> dict[str, Any]:
        return self.index.status()

    def quality_report(self) -> dict[str, Any]:
        with self._lock:
            required_fields = ["batch", "scene", "weather", "flight_height_m", "longitude", "latitude"]
            missing_fields: dict[str, int] = {field: 0 for field in required_fields}
            broken_paths = []
            no_task = []
            low_confidence = []
            for item in self._metadata_cache:
                for field in required_fields:
                    if item.get(field) in (None, ""):
                        missing_fields[field] += 1
                if not item.get("tasks"):
                    no_task.append(item.get("id", ""))
                image_path = item.get("image_path")
                if image_path and not Path(str(image_path)).exists():
                    broken_paths.append({"id": item.get("id", ""), "path": image_path})
                ann = self._annotations_cache.get(item.get("id", ""), {})
                for obj in ann.get("objects", []):
                    try:
                        score = float(obj.get("score"))
                    except (TypeError, ValueError):
                        continue
                    if score < 0.5:
                        low_confidence.append(
                            {
                                "image_id": item.get("id", ""),
                                "label": obj.get("label", "object"),
                                "score": score,
                            }
                        )
            stats = self.stats()
            return {
                "generated_at": datetime.utcnow().isoformat() + "Z",
                "total_images": len(self._metadata_cache),
                "missing_metadata_fields": missing_fields,
                "broken_image_paths": broken_paths[:200],
                "broken_image_path_count": len(broken_paths),
                "images_without_tasks": no_task[:200],
                "images_without_task_count": len(no_task),
                "low_confidence_objects": low_confidence[:200],
                "low_confidence_object_count": len(low_confidence),
                "review_status_counts": stats.get("review_status_counts", {}),
                "lead_time": stats.get("lead_time", {}),
                "index": stats.get("index", {}),
            }

    def risk_queue(self, filters: dict[str, Any] | None = None, limit: int = 100, risk_types: set[str] | None = None) -> dict[str, Any]:
        filters = filters or {}
        risk_types = {str(item).strip() for item in (risk_types or set()) if str(item).strip()}
        limit = max(1, min(int(limit or 100), 500))
        with self._lock:
            rows = self.list_images(filters)
            metadata_by_id = {item["id"]: item for item in self._metadata_cache}
            risk_counts = Counter()
            items = []
            for row in rows:
                image_id = row["id"]
                metadata = metadata_by_id.get(image_id, row)
                ann = self._annotations_cache.get(image_id, {})
                risks = _annotation_risks(metadata, ann)
                if not risks:
                    continue
                if risk_types and not (set(risks) & risk_types):
                    continue
                risk_counts.update(risks)
                items.append(
                    {
                        "image_id": image_id,
                        "relative_path": str(metadata.get("relative_path") or metadata.get("file_name") or ""),
                        "annotator_group": metadata.get("annotator_group", ""),
                        "tasks": metadata.get("tasks", []),
                        "stage": _annotation_stage(ann),
                        "risks": risks,
                        "risk_count": len(risks),
                    }
                )
            items.sort(key=lambda item: (-item["risk_count"], item["annotator_group"], item["relative_path"]))
            return {
                "matched": len(rows),
                "risk_image_count": len(items),
                "risk_counts": dict(risk_counts),
                "items": items[:limit],
                "limit": limit,
                "risk_types": sorted(risk_types),
            }

    def export_review_sampling_queue(
        self,
        filters: dict[str, Any] | None = None,
        sample_rate: float = 0.1,
        min_per_group: int = 1,
        risk_required: bool = True,
        seed: str = "uaiv-formal-annotation",
    ) -> dict[str, Any]:
        filters = filters or {}
        sample_rate = max(0.0, min(float(sample_rate or 0.1), 1.0))
        min_per_group = max(0, int(min_per_group or 0))
        rng = random.Random(str(seed))
        with self._lock:
            rows = self.list_images(filters)
            metadata_by_id = {item["id"]: item for item in self._metadata_cache}
            selected: dict[str, dict[str, Any]] = {}
            non_risk_by_group: dict[str, list[dict[str, Any]]] = defaultdict(list)
            risk_counts = Counter()

            for row in rows:
                image_id = row["id"]
                metadata = metadata_by_id.get(image_id, row)
                ann = self._annotations_cache.get(image_id, {})
                risks = _annotation_risks(metadata, ann)
                group = str(metadata.get("annotator_group") or "未分组")
                base = {
                    "image_id": image_id,
                    "relative_path": str(metadata.get("relative_path") or metadata.get("file_name") or ""),
                    "annotator_group": group,
                    "tasks": ",".join(metadata.get("tasks", []) or []),
                    "stage": _annotation_stage(ann),
                    "risks": ",".join(risks),
                    "reason": "",
                }
                if risks:
                    risk_counts.update(risks)
                    if risk_required:
                        base["reason"] = "risk_required"
                        selected[image_id] = base
                else:
                    non_risk_by_group[group].append(base)

            random_added = 0
            for group, group_rows in sorted(non_risk_by_group.items()):
                if not group_rows:
                    continue
                rng.shuffle(group_rows)
                sample_count = int(round(len(group_rows) * sample_rate))
                if sample_rate > 0:
                    sample_count = max(min_per_group, sample_count)
                sample_count = min(sample_count, len(group_rows))
                for row in group_rows[:sample_count]:
                    row["reason"] = f"random_{sample_rate:.0%}"
                    selected[row["image_id"]] = row
                    random_added += 1

            items = sorted(selected.values(), key=lambda item: (item["annotator_group"], item["reason"] != "risk_required", item["relative_path"]))
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            csv_path = self.exports_dir / f"review_sampling_queue_{timestamp}.csv"
            json_path = self.exports_dir / f"review_sampling_queue_{timestamp}.json"
            fields = ["image_id", "relative_path", "annotator_group", "tasks", "stage", "risks", "reason"]
            with csv_path.open("w", encoding="utf-8-sig", newline="") as handle:
                writer = csv.DictWriter(handle, fieldnames=fields)
                writer.writeheader()
                writer.writerows(items)
            payload = {
                "generated_at": datetime.utcnow().isoformat() + "Z",
                "filters": filters,
                "sample_rate": sample_rate,
                "min_per_group": min_per_group,
                "risk_required": risk_required,
                "seed": seed,
                "matched": len(rows),
                "selected": len(items),
                "risk_selected": sum(1 for item in items if item["reason"] == "risk_required"),
                "random_selected": random_added,
                "risk_counts": dict(risk_counts),
                "items": items,
            }
            self._write_json(json_path, payload)
            return {
                "matched": len(rows),
                "selected": len(items),
                "risk_selected": payload["risk_selected"],
                "random_selected": random_added,
                "risk_counts": dict(risk_counts),
                "csv_path": str(csv_path),
                "json_path": str(json_path),
            }

    def write_dataset_card(self) -> dict[str, str]:
        report = self.quality_report()
        stats = self.stats()
        lines = [
            "# UAIV Dataset Card",
            "",
            f"- Generated at: `{report['generated_at']}`",
            f"- Total images: `{report['total_images']}`",
            "",
            "## Distribution",
            "",
            "### Batches",
            _markdown_counter(stats.get("batch_counts", {})),
            "### Scenes",
            _markdown_counter(stats.get("scene_counts", {})),
            "### Weather",
            _markdown_counter(stats.get("weather_counts", {})),
            "### Tasks",
            _markdown_counter(stats.get("task_counts", {})),
            "### Review Status",
            _markdown_counter(stats.get("review_status_counts", {})),
            "",
            "## Quality Checks",
            "",
            f"- Broken image paths: `{report['broken_image_path_count']}`",
            f"- Images without tasks: `{report['images_without_task_count']}`",
            f"- Low-confidence objects (<0.5): `{report['low_confidence_object_count']}`",
            "",
            "### Missing Metadata Fields",
            _markdown_counter(report.get("missing_metadata_fields", {})),
            "",
            "## Lead Time",
            "",
            f"- Prediction-to-review samples: `{report.get('lead_time', {}).get('count', 0)}`",
            f"- Average seconds: `{report.get('lead_time', {}).get('avg_seconds', 0)}`",
        ]
        path = self.exports_dir / "DATASET_CARD.md"
        path.write_text("\n".join(lines) + "\n", encoding="utf-8")
        return {"path": str(path)}

    def facets(self) -> dict[str, list[str]]:
        with self._lock:
            return {
                "batches": sorted({item.get("batch", "") for item in self._metadata_cache if item.get("batch")}),
                "scenes": sorted({item.get("scene", "") for item in self._metadata_cache if item.get("scene")}),
                "weather": sorted({item.get("weather", "") for item in self._metadata_cache if item.get("weather")}),
                "annotator_groups": sorted({item.get("annotator_group", "") for item in self._metadata_cache if item.get("annotator_group")}),
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
            source_counter = Counter()
            stage_counter = Counter()
            metadata_ids = {item["id"] for item in self._metadata_cache}
            for item in self._metadata_cache:
                ann = self._annotations_cache.get(item["id"])
                stage_counter.update([_annotation_stage(ann)])
            for ann in self._annotations_cache.values():
                source_counter.update(_annotation_source_counts(ann))
                for obj in ann.get("objects", []):
                    object_counter.update([obj.get("label", "unknown")])
                    origin_counter.update([_annotation_origin(obj.get("status", ""))])
                event_counter.update(evt.get("label", "unknown") for evt in ann.get("events", []))
            for image_id in set(self._annotations_cache) - metadata_ids:
                stage_counter.update([_annotation_stage(self._annotations_cache.get(image_id))])
            return {
                "total_images": len(self._metadata_cache),
                "task_counts": dict(task_counter),
                "scene_counts": dict(scene_counter),
                "weather_counts": dict(weather_counter),
                "batch_counts": dict(batch_counter),
                "review_status_counts": dict(status_counter),
                "annotation_stage_counts": dict(stage_counter),
                "annotation_source_counts": dict(source_counter),
                "object_counts": dict(object_counter),
                "object_origin_counts": dict(origin_counter),
                "event_counts": dict(event_counter),
                "lead_time": self._lead_time_stats(),
                "index": self.index_status(),
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
            if fmt == "yolo":
                return self._export_yolo()
            if fmt == "yolo_obb":
                return self._export_yolo_obb()
            if fmt == "dota":
                return self._export_dota()
            if fmt == "geojson":
                return self._export_geojson()
            if fmt == "mask":
                return self._export_masks()
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
                        "rotation": obj.get("rotation", 0),
                    }
                )
            for segment in ann.get("segments", []):
                points = segment.get("points", [])
                if len(points) < 3:
                    continue
                label = segment.get("label", "region")
                categories.setdefault(label, len(categories) + 1)
                xs = [float(point[0]) for point in points]
                ys = [float(point[1]) for point in points]
                x = min(xs)
                y = min(ys)
                w = max(xs) - x
                h = max(ys) - y
                flat_points = [coord for point in points for coord in [float(point[0]), float(point[1])]]
                coco_annotations.append(
                    {
                        "id": len(coco_annotations) + 1,
                        "image_id": image_id_map[item["id"]],
                        "category_id": categories[label],
                        "bbox": [x, y, w, h],
                        "segmentation": [flat_points],
                        "area": _polygon_area(points),
                        "iscrowd": 0,
                        "score": segment.get("score"),
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
                SubElement(node, "rotation").text = str(obj.get("rotation", 0))
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

    def _export_yolo(self) -> dict[str, str]:
        out_dir = self.exports_dir / "yolo"
        label_dir = out_dir / "labels"
        label_dir.mkdir(parents=True, exist_ok=True)
        categories = _category_map(self._annotations_cache, include_segments=False)
        (out_dir / "classes.txt").write_text("\n".join(categories) + ("\n" if categories else ""), encoding="utf-8")
        for item in self._metadata_cache:
            width = float(item.get("width") or 1)
            height = float(item.get("height") or 1)
            ann = self._annotations_cache.get(item["id"], {})
            lines = []
            for obj in ann.get("objects", []):
                label = obj.get("label", "unknown")
                if label not in categories:
                    continue
                x, y, w, h = [float(v) for v in obj.get("bbox", [0, 0, 0, 0])]
                values = [(x + w / 2) / width, (y + h / 2) / height, w / width, h / height]
                lines.append(" ".join([str(categories[label])] + [f"{_clamp01(value):.6f}" for value in values]))
            (label_dir / f"{item['id']}.txt").write_text("\n".join(lines) + ("\n" if lines else ""), encoding="utf-8")
        return {"path": str(out_dir)}

    def _export_yolo_obb(self) -> dict[str, str]:
        out_dir = self.exports_dir / "yolo_obb"
        label_dir = out_dir / "labels"
        label_dir.mkdir(parents=True, exist_ok=True)
        categories = _category_map(self._annotations_cache, include_segments=False)
        (out_dir / "classes.txt").write_text("\n".join(categories) + ("\n" if categories else ""), encoding="utf-8")
        for item in self._metadata_cache:
            width = float(item.get("width") or 1)
            height = float(item.get("height") or 1)
            ann = self._annotations_cache.get(item["id"], {})
            lines = []
            for obj in ann.get("objects", []):
                label = obj.get("label", "unknown")
                if label not in categories:
                    continue
                coords = []
                for x, y in _rotated_box_points(obj.get("bbox", [0, 0, 0, 0]), float(obj.get("rotation", 0) or 0)):
                    coords.extend([_clamp01(x / width), _clamp01(y / height)])
                lines.append(" ".join([str(categories[label])] + [f"{value:.6f}" for value in coords]))
            (label_dir / f"{item['id']}.txt").write_text("\n".join(lines) + ("\n" if lines else ""), encoding="utf-8")
        return {"path": str(out_dir)}

    def _export_dota(self) -> dict[str, str]:
        out_dir = self.exports_dir / "dota"
        label_dir = out_dir / "labelTxt"
        label_dir.mkdir(parents=True, exist_ok=True)
        for item in self._metadata_cache:
            ann = self._annotations_cache.get(item["id"], {})
            lines = ["imagesource:UAIV-Labeler", "gsd:unknown"]
            for obj in ann.get("objects", []):
                label = str(obj.get("label", "unknown")).replace(" ", "_")
                points = _rotated_box_points(obj.get("bbox", [0, 0, 0, 0]), float(obj.get("rotation", 0) or 0))
                coords = [str(round(coord, 2)) for point in points for coord in point]
                lines.append(" ".join(coords + [label, "0"]))
            (label_dir / f"{item['id']}.txt").write_text("\n".join(lines) + "\n", encoding="utf-8")
        return {"path": str(out_dir)}

    def _export_geojson(self) -> dict[str, str]:
        metadata_by_id = {item["id"]: item for item in self._metadata_cache}
        features = []
        for image_id, ann in self._annotations_cache.items():
            meta = metadata_by_id.get(image_id, {})
            for obj in ann.get("objects", []):
                points = _rotated_box_points(obj.get("bbox", [0, 0, 0, 0]), float(obj.get("rotation", 0) or 0))
                features.append(_geojson_feature(image_id, meta, obj.get("label", "object"), points, "object", obj))
            for seg in ann.get("segments", []):
                points = seg.get("points", [])
                if len(points) >= 3:
                    features.append(_geojson_feature(image_id, meta, seg.get("label", "region"), points, "segment", seg))
        path = self.exports_dir / "annotations_geojson.json"
        self._write_json(path, {"type": "FeatureCollection", "features": features})
        return {"path": str(path)}

    def _export_masks(self) -> dict[str, str]:
        out_dir = self.exports_dir / "masks"
        out_dir.mkdir(parents=True, exist_ok=True)
        categories = _category_map(self._annotations_cache, include_segments=True)
        (out_dir / "classes.txt").write_text("\n".join(categories) + ("\n" if categories else ""), encoding="utf-8")
        for item in self._metadata_cache:
            width = int(item.get("width") or 1)
            height = int(item.get("height") or 1)
            ann = self._annotations_cache.get(item["id"], {})
            mask = Image.new("L", (width, height), 0)
            draw = ImageDraw.Draw(mask)
            for seg in ann.get("segments", []):
                points = seg.get("points", [])
                label = seg.get("label", "region")
                if len(points) >= 3 and label in categories:
                    draw.polygon([(float(x), float(y)) for x, y in points], fill=int(categories[label]) + 1)
            mask.save(out_dir / f"{item['id']}.png")
        return {"path": str(out_dir)}


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
    value = str(status or "").strip().lower()
    if value.startswith("model") or value in {"predicted", "prediction"}:
        return "model"
    if value == "human":
        return "human"
    if value == "rule_prefill":
        return "rule_prefill"
    if value in {"imported", "weak_label", "preloaded"}:
        return "imported_prefill"
    if value == "empty":
        return "empty"
    return "unknown"


def _annotation_source_counts(annotation: dict[str, Any]) -> Counter:
    counts: Counter = Counter()
    for key in ("scene", "environment", "urban_structure", "restoration"):
        value = annotation.get(key)
        if isinstance(value, dict):
            counts.update([_annotation_origin(value.get("status", ""))])
    for key in ("objects", "segments", "ocr", "events"):
        for item in annotation.get(key, []) or []:
            if isinstance(item, dict):
                counts.update([_annotation_origin(item.get("status", ""))])
    return counts


def _annotation_stage(annotation: dict[str, Any] | None) -> str:
    if not annotation:
        return "no_annotation"
    status = normalize_review_status(annotation.get("review_status"))
    if status in {"verified", "rejected"}:
        return status
    sources = _annotation_source_counts(annotation)
    if sources.get("human", 0):
        return "human_labeled"
    if sources.get("model", 0):
        return "model_prefill"
    if sources.get("imported_prefill", 0):
        return "imported_prefill"
    if sources.get("rule_prefill", 0):
        return "rule_prefill"
    if status == "labeled":
        return "human_labeled"
    if status == "predicted":
        return "model_prefill"
    return "empty_annotation"


def _annotation_risks(metadata: dict[str, Any], annotation: dict[str, Any] | None) -> list[str]:
    annotation = annotation or {}
    tasks = set(metadata.get("tasks", []))
    status = normalize_review_status(annotation.get("review_status"))
    stage = _annotation_stage(annotation)
    risks: list[str] = []
    if stage in {"rule_prefill", "imported_prefill", "model_prefill"}:
        risks.append(f"{stage}_unconfirmed")
    if stage == "no_annotation":
        risks.append("no_annotation")
    if status == "rejected" and not str(annotation.get("reject_reason") or "").strip():
        risks.append("rejected_without_reason")
    if "object_detection" in tasks and not annotation.get("objects"):
        risks.append("missing_objects")
    expected_object_label = metadata.get("object_label")
    if expected_object_label and any(obj.get("label") and obj.get("label") != expected_object_label for obj in annotation.get("objects", []) or []):
        risks.append("object_label_conflict")
    for obj in annotation.get("objects", []) or []:
        try:
            score = float(obj.get("score"))
        except (TypeError, ValueError):
            continue
        if score < 0.5:
            risks.append("low_confidence_object")
            break
    if "ocr" in tasks and not annotation.get("ocr"):
        risks.append("missing_ocr")
    if "scene_classification" in tasks:
        scene = annotation.get("scene") if isinstance(annotation.get("scene"), dict) else {}
        label = scene.get("label")
        if not label or label == "未标注":
            risks.append("missing_scene")
        if label == "mixed" and not (scene.get("combination_label") or scene.get("secondary_labels")):
            risks.append("mixed_without_secondary_labels")
    if "urban_structure" in tasks:
        structure = annotation.get("urban_structure") if isinstance(annotation.get("urban_structure"), dict) else {}
        if not (structure.get("label") or structure.get("summary")):
            risks.append("missing_urban_structure")
    if tasks & {"event_qa", "event_understanding"}:
        events = annotation.get("events", []) or []
        if not events or not isinstance(events[0], dict) or not events[0].get("label"):
            risks.append("missing_event_label")
    if "environment_state" in tasks:
        environment = annotation.get("environment") if isinstance(annotation.get("environment"), dict) else {}
        if not environment.get("label") or environment.get("label") == "未知":
            risks.append("missing_environment")
    return sorted(set(risks))


def _polygon_area(points: list[list[float]]) -> float:
    if len(points) < 3:
        return 0.0
    total = 0.0
    for index, point in enumerate(points):
        next_point = points[(index + 1) % len(points)]
        total += float(point[0]) * float(next_point[1]) - float(next_point[0]) * float(point[1])
    return abs(total) / 2.0


def _rotated_box_points(bbox: list[Any], rotation: float) -> list[list[float]]:
    x, y, w, h = [float(value) for value in bbox]
    cx = x + w / 2
    cy = y + h / 2
    rad = rotation * 3.141592653589793 / 180.0
    cos_v = math.cos(rad)
    sin_v = math.sin(rad)
    points = []
    for dx, dy in [(-w / 2, -h / 2), (w / 2, -h / 2), (w / 2, h / 2), (-w / 2, h / 2)]:
        points.append([cx + dx * cos_v - dy * sin_v, cy + dx * sin_v + dy * cos_v])
    return points


def _category_map(annotations: dict[str, Any], include_segments: bool) -> dict[str, int]:
    labels = set()
    for ann in annotations.values():
        labels.update(str(obj.get("label", "unknown")) for obj in ann.get("objects", []))
        if include_segments:
            labels.update(str(seg.get("label", "region")) for seg in ann.get("segments", []))
    return {label: index for index, label in enumerate(sorted(label for label in labels if label))}


def _clamp01(value: float) -> float:
    return max(0.0, min(1.0, float(value)))


def _geojson_feature(image_id: str, meta: dict[str, Any], label: Any, points: list[Any], geometry_type: str, source: dict[str, Any]) -> dict[str, Any]:
    polygon = [[float(x), float(y)] for x, y in points]
    if polygon and polygon[0] != polygon[-1]:
        polygon.append(polygon[0])
    return {
        "type": "Feature",
        "properties": {
            "image_id": image_id,
            "file_name": meta.get("file_name"),
            "label": str(label or "unknown"),
            "geometry_type": geometry_type,
            "source_status": source.get("status"),
            "score": source.get("score"),
            "rotation": source.get("rotation", 0),
            "metadata": meta,
        },
        "geometry": {
            "type": "Polygon",
            "coordinates": [polygon],
        },
    }


def _markdown_counter(values: dict[str, Any]) -> str:
    if not values:
        return "\nNo records.\n"
    lines = ["", "| Item | Count |", "|:--|--:|"]
    for key, value in sorted(values.items(), key=lambda item: str(item[0])):
        lines.append(f"| {key} | {value} |")
    lines.append("")
    return "\n".join(lines)


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
        try:
            obj["rotation"] = float(obj.get("rotation", obj.get("angle", 0)) or 0)
        except (TypeError, ValueError) as exc:
            raise ValueError(f"objects[{index}].rotation must be numeric.") from exc
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
            try:
                point[0] = float(point[0])
                point[1] = float(point[1])
            except (TypeError, ValueError) as exc:
                raise ValueError(f"segments[{index}].points[{point_index}] contains non-numeric values.") from exc
        segment["label"] = str(segment.get("label") or "region")
    clean["review_status"] = normalize_review_status(clean.get("review_status"))
    return clean
