"""Storage abstraction.

The analyzer saves uploaded workbooks through a ``StorageBackend`` so the physical
location is swappable. ``LocalDiskStorage`` is used now; ``S3Storage`` is a
documented future drop-in (see s3.py) — switching is a config change only, no
ingest/API changes.
"""

from __future__ import annotations

import abc
from functools import lru_cache

from app.core.config import get_settings


class StorageBackend(abc.ABC):
    @abc.abstractmethod
    def save(self, key: str, data: bytes) -> str:
        """Persist ``data`` under ``key``; return the canonical storage key."""

    @abc.abstractmethod
    def open(self, key: str) -> bytes:
        """Read back the bytes stored under ``key``."""

    @abc.abstractmethod
    def url(self, key: str) -> str:
        """A locator for the stored object (a path now, a presigned URL later)."""


@lru_cache
def get_storage() -> StorageBackend:
    settings = get_settings()
    if settings.storage_backend == "s3":
        from app.storage.s3 import S3Storage

        return S3Storage()
    from app.storage.local import LocalDiskStorage

    return LocalDiskStorage(settings.storage_local_dir)
