from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
CONFIG_PATH = ROOT / "config" / "storage_mappings.json"


class StorageResolver:
    def __init__(self, config_path: Path = CONFIG_PATH):
        self.config_path = config_path
        self.mappings = self._load_mappings()

    def _load_mappings(self) -> list[dict[str, str]]:
        mappings: list[dict[str, str]] = []
        if self.config_path.exists():
            payload = json.loads(self.config_path.read_text(encoding="utf-8"))
            mappings.extend(payload.get("path_mappings", []))
        raw_env = os.environ.get("UAIV_PATH_MAPPINGS", "").strip()
        if raw_env:
            payload = json.loads(raw_env)
            mappings.extend(payload.get("path_mappings", payload if isinstance(payload, list) else []))
        return mappings

    def resolve_image_path(self, metadata: dict[str, Any]) -> Path:
        direct = metadata.get("image_path")
        if direct:
            path = Path(str(direct)).expanduser()
            if path.exists():
                return path.resolve()
            mapped = self.resolve_path(str(direct))
            if mapped.exists():
                return mapped.resolve()

        storage_key = metadata.get("storage_key") or metadata.get("relative_path")
        if storage_key:
            mapped = self.resolve_path(str(storage_key), source_folder=metadata.get("source_folder"))
            if mapped.exists():
                return mapped.resolve()

        return ROOT / "data" / "images" / str(metadata.get("file_name", ""))

    def resolve_path(self, value: str, source_folder: str | None = None) -> Path:
        raw = value.replace("\\", "/")
        for mapping in self.mappings:
            source = str(mapping.get("source", "")).rstrip("/").replace("\\", "/")
            target = str(mapping.get("target", "")).rstrip("/")
            if not source or not target:
                continue
            if raw == source:
                return Path(target)
            if raw.startswith(source + "/"):
                return Path(target) / raw[len(source) + 1 :]
        if source_folder and not Path(raw).is_absolute():
            return Path(source_folder) / raw
        return Path(value).expanduser()
