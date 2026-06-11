from __future__ import annotations

import json
import sqlite3
from datetime import datetime
from pathlib import Path
from typing import Any


SCHEMA_VERSION = 1


class DataIndex:
    """Lightweight SQLite side index for large metadata and annotation sets.

    JSON files remain the portable source of truth. This index is rebuilt from
    JSON and can be deleted safely; it exists to support faster filtering,
    status summaries, and future multi-user storage migration.
    """

    def __init__(self, path: Path):
        self.path = path
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self._ensure_schema()

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.path)
        conn.row_factory = sqlite3.Row
        return conn

    def _ensure_schema(self) -> None:
        with self._connect() as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS meta (
                    key TEXT PRIMARY KEY,
                    value TEXT NOT NULL
                )
                """
            )
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS images (
                    id TEXT PRIMARY KEY,
                    file_name TEXT,
                    image_path TEXT,
                    source_folder TEXT,
                    relative_path TEXT,
                    batch TEXT,
                    scene TEXT,
                    weather TEXT,
                    tasks_json TEXT,
                    flight_height_m REAL,
                    longitude REAL,
                    latitude REAL,
                    width INTEGER,
                    height INTEGER,
                    source_type TEXT,
                    review_status TEXT,
                    object_count INTEGER DEFAULT 0,
                    segment_count INTEGER DEFAULT 0,
                    event_count INTEGER DEFAULT 0,
                    updated_at TEXT,
                    metadata_json TEXT NOT NULL
                )
                """
            )
            conn.execute("CREATE INDEX IF NOT EXISTS idx_images_batch ON images(batch)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_images_scene ON images(scene)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_images_weather ON images(weather)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_images_status ON images(review_status)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_images_geo ON images(latitude, longitude)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_images_altitude ON images(flight_height_m)")
            conn.execute(
                "INSERT OR REPLACE INTO meta(key, value) VALUES(?, ?)",
                ("schema_version", str(SCHEMA_VERSION)),
            )

    def rebuild(self, metadata: list[dict[str, Any]], annotations: dict[str, Any]) -> dict[str, Any]:
        now = datetime.utcnow().isoformat() + "Z"
        with self._connect() as conn:
            conn.execute("DELETE FROM images")
            rows = []
            for item in metadata:
                image_id = str(item.get("id", ""))
                if not image_id:
                    continue
                ann = annotations.get(image_id, {})
                rows.append(
                    (
                        image_id,
                        item.get("file_name", ""),
                        item.get("image_path", ""),
                        item.get("source_folder", ""),
                        item.get("relative_path", ""),
                        item.get("batch", ""),
                        item.get("scene", ""),
                        item.get("weather", ""),
                        json.dumps(item.get("tasks", []), ensure_ascii=False),
                        _optional_real(item.get("flight_height_m")),
                        _optional_real(item.get("longitude")),
                        _optional_real(item.get("latitude")),
                        _optional_int(item.get("width")),
                        _optional_int(item.get("height")),
                        item.get("source_type", ""),
                        str(ann.get("review_status", "unlabeled") or "unlabeled"),
                        len(ann.get("objects", []) or []),
                        len(ann.get("segments", []) or []),
                        len(ann.get("events", []) or []),
                        ann.get("updated_at") or now,
                        json.dumps(item, ensure_ascii=False),
                    )
                )
            conn.executemany(
                """
                INSERT OR REPLACE INTO images(
                    id, file_name, image_path, source_folder, relative_path,
                    batch, scene, weather, tasks_json, flight_height_m,
                    longitude, latitude, width, height, source_type,
                    review_status, object_count, segment_count, event_count,
                    updated_at, metadata_json
                ) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                rows,
            )
            conn.execute("INSERT OR REPLACE INTO meta(key, value) VALUES(?, ?)", ("rebuilt_at", now))
            conn.execute("INSERT OR REPLACE INTO meta(key, value) VALUES(?, ?)", ("image_count", str(len(rows))))
        return {"indexed_images": len(rows), "rebuilt_at": now, "path": str(self.path)}

    def status(self) -> dict[str, Any]:
        with self._connect() as conn:
            row = conn.execute("SELECT COUNT(*) AS count FROM images").fetchone()
            meta_rows = conn.execute("SELECT key, value FROM meta").fetchall()
        meta = {row["key"]: row["value"] for row in meta_rows}
        return {
            "enabled": True,
            "path": str(self.path),
            "indexed_images": int(row["count"] if row else 0),
            "schema_version": int(meta.get("schema_version", SCHEMA_VERSION)),
            "rebuilt_at": meta.get("rebuilt_at", ""),
        }


def _optional_real(value: Any) -> float | None:
    if value in (None, ""):
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _optional_int(value: Any) -> int | None:
    if value in (None, ""):
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None
