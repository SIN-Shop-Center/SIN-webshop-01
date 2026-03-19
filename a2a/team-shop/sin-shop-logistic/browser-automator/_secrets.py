from __future__ import annotations

import os
from pathlib import Path


_LOADED: dict[str, str] = {}


def _load_dotenv_file(path: str) -> dict[str, str]:
    result: dict[str, str] = {}
    try:
        for line in Path(path).read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if "=" not in line:
                continue
            key, _, value = line.partition("=")
            key = key.strip()
            value = value.strip().strip('"').strip("'")
            if key:
                result[key] = value
    except OSError:
        pass
    return result


def _ensure_loaded() -> None:
    if _LOADED:
        return
    env_file = os.environ.get("BROWSER_AUTOMATOR_ENV_FILE", "")
    if env_file:
        _LOADED.update(_load_dotenv_file(env_file))
    for key in ("TIKTOK_SELLER_EMAIL", "TIKTOK_SELLER_PASSWORD", "CHROME_PROFILE_DIR"):
        val = os.environ.get(key)
        if val is not None:
            _LOADED[key] = val


def _get(key: str, fallback: str = "") -> str:
    _ensure_loaded()
    return _LOADED.get(key) or os.environ.get(key) or fallback


def _require(key: str) -> str:
    value = _get(key, "").strip()
    if not value:
        raise RuntimeError(f"missing required secret: {key}")
    return value


def get_email() -> str:
    return _require("TIKTOK_SELLER_EMAIL")


def get_password() -> str:
    return _require("TIKTOK_SELLER_PASSWORD")


def get_chrome_profile_dir() -> str:
    return _get(
        "CHROME_PROFILE_DIR",
        "/Users/jeremy/dev/SIN-Solver/.worker_profiles/jeremy_runner",
    )
