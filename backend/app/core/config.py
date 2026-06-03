"""Application configuration via pydantic-settings (env-driven)."""

from __future__ import annotations

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="ANALYZER_",
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    database_url: str = (
        "postgresql+psycopg://analyzer:analyzer@localhost:5433/analyzer"
    )

    storage_backend: str = "local"  # "local" now, "s3" is a future drop-in
    storage_local_dir: str = "./data/uploads"

    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    enable_nl_search: bool = False

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
