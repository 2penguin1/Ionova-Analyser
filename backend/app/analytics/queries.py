"""Analytical aggregates over a run's results.

All queries are scoped to a run_id and computed in Postgres. Field names come
exclusively from the SWIFT_FIELDS whitelist, so the dynamically-built SQL is safe.
"""

from __future__ import annotations

from sqlalchemy import func, select, text
from sqlalchemy.orm import Session

from app.core.fields import SWIFT_FIELDS, verdict_col
from app.models import EvalResult, FieldMetric


def country_analytics(db: Session, run_id) -> list[dict]:
    """Per gold-country: volume, status breakdown, and a correctness ratio."""
    rows = db.execute(
        select(
            EvalResult.gold_ctry,
            func.count().label("total"),
            func.coalesce(func.sum(EvalResult.n_correct), 0),
            func.coalesce(func.sum(EvalResult.n_wrong), 0),
            func.coalesce(func.sum(EvalResult.n_missing), 0),
            func.coalesce(func.sum(EvalResult.n_extra), 0),
        )
        .where(EvalResult.run_id == run_id)
        .group_by(EvalResult.gold_ctry)
        .order_by(func.count().desc())
    ).all()

    out = []
    for ctry, total, c, w, m, e in rows:
        scored = (c or 0) + (w or 0) + (m or 0)
        out.append(
            {
                "country": ctry or "UNKNOWN",
                "total": total,
                "correct_fields": c,
                "wrong_fields": w,
                "missing_fields": m,
                "extra_fields": e,
                "field_accuracy": round((c / scored), 4) if scored else None,
            }
        )
    return out


def field_analytics(db: Session, run_id) -> list[dict]:
    """Per-field correct/extra/missing/wrong (from the imported Field Metrics)."""
    rows = (
        db.query(FieldMetric)
        .filter(FieldMetric.run_id == run_id)
        .order_by(FieldMetric.total.desc())
        .all()
    )
    out = []
    for fm in rows:
        scored = fm.correct + fm.wrong + fm.missing
        out.append(
            {
                "field_name": fm.field_name,
                "correct": fm.correct,
                "extra": fm.extra,
                "missing": fm.missing,
                "wrong": fm.wrong,
                "total": fm.total,
                "accuracy": round(fm.correct / scored, 4) if scored else None,
            }
        )
    return out


def error_clusters(db: Session, run_id, limit: int = 25) -> list[dict]:
    """Frequent error patterns: most common *sets* of fields that fail together.

    A field "fails" when its verdict is Wrong or Missing. Each record is reduced
    to a comma-joined signature of its failing fields (built in SQL via concat_ws,
    which skips NULLs), then grouped and counted.
    """
    cases = []
    for f in SWIFT_FIELDS:
        col = verdict_col(f)
        cases.append(
            f"CASE WHEN {col} IN ('Wrong','Missing') THEN '{f}' END"
        )
    signature = "concat_ws(',', " + ", ".join(cases) + ")"
    sql = text(
        f"""
        SELECT {signature} AS pattern, count(*) AS n
        FROM eval_result
        WHERE run_id = :run_id
        GROUP BY pattern
        HAVING {signature} <> ''
        ORDER BY n DESC
        LIMIT :limit
        """
    )
    rows = db.execute(sql, {"run_id": str(run_id), "limit": limit}).all()
    return [
        {"pattern": pattern, "fields": pattern.split(","), "count": n}
        for pattern, n in rows
    ]
