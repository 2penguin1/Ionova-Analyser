"""S3 storage backend — FUTURE DROP-IN, intentionally not implemented yet.

When the project upgrades to S3 uploads, implement these three methods with boto3
(bucket/prefix from settings) and set ANALYZER_STORAGE_BACKEND=s3. No other code
changes are required — ingest and the API only talk to the StorageBackend ABC.
"""

from __future__ import annotations

from app.storage.base import StorageBackend


class S3Storage(StorageBackend):
    def __init__(self) -> None:  # pragma: no cover - stub
        raise NotImplementedError(
            "S3 storage is a planned future upgrade. Implement with boto3 and set "
            "ANALYZER_STORAGE_BACKEND=s3."
        )

    def save(self, key: str, data: bytes) -> str:  # pragma: no cover - stub
        raise NotImplementedError

    def open(self, key: str) -> bytes:  # pragma: no cover - stub
        raise NotImplementedError

    def url(self, key: str) -> str:  # pragma: no cover - stub
        raise NotImplementedError
