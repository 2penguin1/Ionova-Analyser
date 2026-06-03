"""Local-disk storage backend."""

from __future__ import annotations

from pathlib import Path

from app.storage.base import StorageBackend


class LocalDiskStorage(StorageBackend):
    def __init__(self, base_dir: str) -> None:
        self.base = Path(base_dir).resolve()
        self.base.mkdir(parents=True, exist_ok=True)

    def _path(self, key: str) -> Path:
        # Keys are flat (uuid/filename); guard against path traversal.
        safe = key.replace("\\", "/").lstrip("/")
        path = (self.base / safe).resolve()
        if not str(path).startswith(str(self.base)):
            raise ValueError("Invalid storage key")
        return path

    def save(self, key: str, data: bytes) -> str:
        path = self._path(key)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)
        return key

    def open(self, key: str) -> bytes:
        return self._path(key).read_bytes()

    def url(self, key: str) -> str:
        return str(self._path(key))
