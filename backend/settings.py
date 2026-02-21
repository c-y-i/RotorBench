"""
Runtime settings sourced from environment variables.
"""
from __future__ import annotations

import os
from dataclasses import dataclass
from typing import List


def _to_bool(value: str | None, default: bool) -> bool:
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _split_csv(value: str) -> List[str]:
    return [item.strip() for item in value.split(",") if item.strip()]


@dataclass(frozen=True)
class Settings:
    app_env: str
    host: str
    port: int
    data_dir: str | None
    enable_docs: bool
    cors_allowed_origins: List[str]
    version: str = "1.1.0"


def load_settings() -> Settings:
    app_env = os.getenv("APP_ENV", "development").strip().lower()
    host = os.getenv("HOST", "0.0.0.0").strip()
    port = int(os.getenv("PORT", "8000").strip())
    data_dir = os.getenv("DATA_DIR")

    default_enable_docs = app_env != "production"
    enable_docs = _to_bool(os.getenv("ENABLE_DOCS"), default_enable_docs)

    default_origins = [
        "https://rotor.nori.fish",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]
    cors_raw = os.getenv("CORS_ALLOWED_ORIGINS", ",".join(default_origins))
    cors_allowed_origins = _split_csv(cors_raw)

    return Settings(
        app_env=app_env,
        host=host,
        port=port,
        data_dir=data_dir,
        enable_docs=enable_docs,
        cors_allowed_origins=cors_allowed_origins,
    )


settings = load_settings()
