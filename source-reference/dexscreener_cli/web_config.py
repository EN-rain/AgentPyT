from __future__ import annotations

import json
from dataclasses import asdict, dataclass
from pathlib import Path
from threading import RLock
from typing import Any

from .config import CACHE_TTL_SECONDS, DEFAULT_CHAINS

_CONFIG_FILE_NAME = "web_config.json"
_MIN_CACHE_TTL_SECONDS = 1
_MAX_CACHE_TTL_SECONDS = 120


@dataclass(slots=True)
class WebConfig:
    cache_ttl_seconds: int = CACHE_TTL_SECONDS
    default_chains: tuple[str, ...] = DEFAULT_CHAINS
    watch_interval_seconds: int = 5
    default_limit: int = 20

    @classmethod
    def from_dict(cls, payload: dict[str, Any]) -> WebConfig:
        cache_ttl = int(payload.get("cache_ttl_seconds", CACHE_TTL_SECONDS))
        cache_ttl = max(_MIN_CACHE_TTL_SECONDS, min(_MAX_CACHE_TTL_SECONDS, cache_ttl))
        chains = payload.get("default_chains", list(DEFAULT_CHAINS))
        if not isinstance(chains, list):
            chains = list(DEFAULT_CHAINS)
        default_chains = tuple(str(chain).strip().lower() for chain in chains if str(chain).strip())
        if not default_chains:
            default_chains = DEFAULT_CHAINS
        watch_interval_seconds = int(payload.get("watch_interval_seconds", 5))
        watch_interval_seconds = max(2, min(120, watch_interval_seconds))
        default_limit = int(payload.get("default_limit", 20))
        default_limit = max(1, min(100, default_limit))
        return cls(
            cache_ttl_seconds=cache_ttl,
            default_chains=default_chains,
            watch_interval_seconds=watch_interval_seconds,
            default_limit=default_limit,
        )

    def to_dict(self) -> dict[str, Any]:
        payload = asdict(self)
        payload["default_chains"] = list(self.default_chains)
        return payload


class WebConfigStore:
    def __init__(self, base_dir: Path) -> None:
        self._base_dir = base_dir
        self._base_dir.mkdir(parents=True, exist_ok=True)
        self._path = self._base_dir / _CONFIG_FILE_NAME
        self._lock = RLock()

    @property
    def path(self) -> Path:
        return self._path

    def load(self) -> WebConfig:
        with self._lock:
            if not self._path.exists():
                config = WebConfig()
                self._write(config)
                return config
            try:
                payload = json.loads(self._path.read_text(encoding="utf-8"))
            except (json.JSONDecodeError, OSError):
                config = WebConfig()
                self._write(config)
                return config
            if not isinstance(payload, dict):
                config = WebConfig()
                self._write(config)
                return config
            return WebConfig.from_dict(payload)

    def update(self, patch: dict[str, Any]) -> WebConfig:
        with self._lock:
            current = self.load()
            payload = current.to_dict()
            payload.update(patch)
            updated = WebConfig.from_dict(payload)
            self._write(updated)
            return updated

    def _write(self, config: WebConfig) -> None:
        self._path.write_text(json.dumps(config.to_dict(), indent=2), encoding="utf-8")
