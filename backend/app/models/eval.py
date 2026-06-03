"""ORM models for the analyzer.

The hot search path uses **denormalized typed columns** (gold_/algo_/verdict_ per
field, 3 x 21 = 63 columns) so every field filter and comparison is a plain,
indexable column op. The raw ``fields`` JSONB blob is retained only for export /
flexibility, never queried on the hot path. See plan §3a.
"""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import (
    BigInteger,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base
from app.core.fields import SWIFT_FIELDS, algo_col, gold_col, verdict_col


def _uuid() -> uuid.UUID:
    return uuid.uuid4()


class ImportBatch(Base):
    __tablename__ = "import_batch"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=_uuid)
    filename: Mapped[str] = mapped_column(String(512))
    storage_key: Mapped[str] = mapped_column(String(1024))
    status: Mapped[str] = mapped_column(String(32), default="PENDING", index=True)
    error_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    row_counts: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    runs: Mapped[list["EvalRun"]] = relationship(back_populates="import_batch")


class EvalRun(Base):
    __tablename__ = "eval_run"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=_uuid)
    source_run_id: Mapped[str] = mapped_column(String(128), unique=True, index=True)
    import_batch_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("import_batch.id", ondelete="SET NULL"), nullable=True
    )
    dataset_name: Mapped[str | None] = mapped_column(String(512), index=True)
    run_type: Mapped[str | None] = mapped_column(String(64))
    status: Mapped[str | None] = mapped_column(String(32))
    initiated_by: Mapped[str | None] = mapped_column(String(128))
    started_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    algorithm_version: Mapped[str | None] = mapped_column(String(128), nullable=True)
    summary: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    import_batch: Mapped["ImportBatch | None"] = relationship(back_populates="runs")
    field_metrics: Mapped[list["FieldMetric"]] = relationship(
        back_populates="run", cascade="all, delete-orphan"
    )
    results: Mapped[list["EvalResult"]] = relationship(
        back_populates="run", cascade="all, delete-orphan"
    )


class FieldMetric(Base):
    __tablename__ = "field_metric"
    __table_args__ = (UniqueConstraint("run_id", "field_name", name="uq_field_metric_run_field"),)

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    run_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("eval_run.id", ondelete="CASCADE"), index=True
    )
    field_name: Mapped[str] = mapped_column(String(64))
    correct: Mapped[int] = mapped_column(Integer, default=0)
    extra: Mapped[int] = mapped_column(Integer, default=0)
    missing: Mapped[int] = mapped_column(Integer, default=0)
    wrong: Mapped[int] = mapped_column(Integer, default=0)
    total: Mapped[int] = mapped_column(Integer, default=0)

    run: Mapped["EvalRun"] = relationship(back_populates="field_metrics")


class EvalResult(Base):
    __tablename__ = "eval_result"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=_uuid)
    run_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("eval_run.id", ondelete="CASCADE"), index=True
    )
    source_result_id: Mapped[str | None] = mapped_column(String(128), index=True)
    source_entry_id: Mapped[str | None] = mapped_column(String(128), index=True)

    status: Mapped[str | None] = mapped_column(String(32), index=True)
    execution_time_ms: Mapped[float | None] = mapped_column(Float, nullable=True)
    address_hash: Mapped[str | None] = mapped_column(String(128), nullable=True)

    input_address: Mapped[str | None] = mapped_column(Text, nullable=True)
    input_address_raw: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Raw per-field blob, kept for export only (not the hot search path).
    fields: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    # Per-record verdict rollups for fast facets / sorting.
    n_correct: Mapped[int] = mapped_column(Integer, default=0)
    n_wrong: Mapped[int] = mapped_column(Integer, default=0)
    n_missing: Mapped[int] = mapped_column(Integer, default=0)
    n_extra: Mapped[int] = mapped_column(Integer, default=0)

    run: Mapped["EvalRun"] = relationship(back_populates="results")

    # --- The 63 denormalized field columns -------------------------------
    # gold_<F>, algo_<F>, verdict_<F> for every field in SWIFT_FIELDS.
    # Injected into the class namespace via a loop so the verbosity is
    # mechanical, not hand-maintained. Assigning bare ``mapped_column()``
    # objects into the class-body dict is picked up by the declarative
    # scanner exactly like a normal attribute. The Alembic migration
    # mirrors this list.
    for _f in SWIFT_FIELDS:
        locals()[gold_col(_f)] = mapped_column(Text, nullable=True)
        locals()[algo_col(_f)] = mapped_column(Text, nullable=True)
        locals()[verdict_col(_f)] = mapped_column(String(16), nullable=True)
    del _f


class SavedFilter(Base):
    __tablename__ = "saved_filter"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=_uuid)
    name: Mapped[str] = mapped_column(String(256))
    ast: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    dsl: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class SearchHistory(Base):
    __tablename__ = "search_history"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=_uuid)
    dsl: Mapped[str | None] = mapped_column(Text, nullable=True)
    ast: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    run_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    result_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
