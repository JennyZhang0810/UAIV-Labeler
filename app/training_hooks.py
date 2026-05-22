from __future__ import annotations

import json
import logging
import threading
import urllib.error
import urllib.request
from datetime import datetime
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
CONFIG_PATH = ROOT / "config" / "training_hooks.json"
STATE_PATH = ROOT / "data" / "training_hook_state.json"
logger = logging.getLogger("uaiv_annotation")


class IncrementalTrainingHook:
    def __init__(self, config_path: Path = CONFIG_PATH, state_path: Path = STATE_PATH):
        self.config_path = config_path
        self.state_path = state_path
        self._lock = threading.RLock()

    def maybe_trigger(self, stats: dict[str, Any], image_id: str, action: str) -> None:
        config = self._load_config()
        if not config.get("enabled"):
            return
        threshold = int(config.get("review_threshold", 50))
        if threshold <= 0:
            return
        reviewed_count = _reviewed_count(stats.get("review_status_counts", {}))
        if reviewed_count < threshold or reviewed_count % threshold != 0:
            return
        with self._lock:
            state = self._load_state()
            if int(state.get("last_trigger_reviewed_count", 0)) >= reviewed_count:
                return
            state.update(
                {
                    "last_trigger_reviewed_count": reviewed_count,
                    "last_trigger_image_id": image_id,
                    "last_trigger_action": action,
                    "last_triggered_at": datetime.utcnow().isoformat() + "Z",
                }
            )
            self._write_state(state)
        webhook_url = str(config.get("webhook_url", "")).strip()
        if webhook_url:
            payload = {
                "event": "uaiv.annotation_threshold_reached",
                "reviewed_count": reviewed_count,
                "threshold": threshold,
                "image_id": image_id,
                "action": action,
                "stats": stats,
                "created_at": datetime.utcnow().isoformat() + "Z",
            }
            threading.Thread(target=_post_webhook, args=(webhook_url, payload, int(config.get("timeout", 10))), daemon=True).start()
        logger.info("training_hook_triggered reviewed_count=%s image_id=%s action=%s", reviewed_count, image_id, action)

    def _load_config(self) -> dict[str, Any]:
        if not self.config_path.exists():
            return {"enabled": False}
        return json.loads(self.config_path.read_text(encoding="utf-8"))

    def _load_state(self) -> dict[str, Any]:
        if not self.state_path.exists():
            return {}
        return json.loads(self.state_path.read_text(encoding="utf-8"))

    def _write_state(self, state: dict[str, Any]) -> None:
        self.state_path.parent.mkdir(parents=True, exist_ok=True)
        tmp_path = self.state_path.with_suffix(self.state_path.suffix + ".tmp")
        tmp_path.write_text(json.dumps(state, ensure_ascii=False, indent=2), encoding="utf-8")
        tmp_path.replace(self.state_path)


def _reviewed_count(status_counts: dict[str, Any]) -> int:
    return int(status_counts.get("verified", 0)) + int(status_counts.get("reviewed", 0))


def _post_webhook(url: str, payload: dict[str, Any], timeout: int) -> None:
    request = urllib.request.Request(
        url,
        data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            response.read()
        logger.info("training_hook_webhook_sent url=%s", url)
    except (urllib.error.URLError, TimeoutError) as exc:
        logger.warning("training_hook_webhook_failed url=%s error=%s", url, exc)
