"""initial schema + pg_trgm + trigram indexes

Revision ID: 0001_initial
Revises:
Create Date: 2026-06-02

The baseline creates every table from the SQLAlchemy metadata (which already
includes the 63 denormalized field columns generated in app/models/eval.py),
then enables pg_trgm and builds the search indexes described in plan §3a.
"""

from __future__ import annotations

from alembic import op

from app.core.db import Base
from app.core.fields import (
    SWIFT_FIELDS,
    TRIGRAM_FIELDS,
    algo_col,
    gold_col,
    verdict_col,
)

# Import models so metadata is populated.
import app.models  # noqa: F401

revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()

    # Trigram extension must exist before the GIN trigram indexes.
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")

    # Create all tables + the simple (column-level) indexes from metadata.
    Base.metadata.create_all(bind=bind)

    # Trigram GIN index on the address text for fast contains/regex.
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_eval_result_input_address_trgm "
        "ON eval_result USING gin (input_address gin_trgm_ops)"
    )

    # Trigram GIN on high-cardinality text fields (gold + algo) for `contains`.
    for f in TRIGRAM_FIELDS:
        for col in (gold_col(f), algo_col(f)):
            op.execute(
                f"CREATE INDEX IF NOT EXISTS ix_eval_result_{col}_trgm "
                f"ON eval_result USING gin ({col} gin_trgm_ops)"
            )

    # B-tree on every field column for exact / verdict lookups + comparisons.
    for f in SWIFT_FIELDS:
        for col in (gold_col(f), algo_col(f), verdict_col(f)):
            op.execute(
                f"CREATE INDEX IF NOT EXISTS ix_eval_result_{col} ON eval_result ({col})"
            )


def downgrade() -> None:
    bind = op.get_bind()
    Base.metadata.drop_all(bind=bind)
