"""Run + result viewing endpoints (recreates the IoNova eval-run experience)."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.analytics import country_analytics, error_clusters, field_analytics
from app.core.db import get_db
from app.models import EvalResult, EvalRun, FieldMetric
from app.schemas import serialize_result_detail, serialize_result_row, serialize_run

router = APIRouter(prefix="/runs", tags=["runs"])


@router.get("")
def list_runs(db: Session = Depends(get_db)) -> list[dict]:
    runs = db.query(EvalRun).order_by(EvalRun.created_at.desc()).all()
    out = []
    for run in runs:
        data = serialize_run(run)
        # Lightweight per-run status counts for the list cards.
        counts = dict(
            db.execute(
                select(EvalResult.status, func.count())
                .where(EvalResult.run_id == run.id)
                .group_by(EvalResult.status)
            ).all()
        )
        data["status_counts"] = {k or "UNKNOWN": v for k, v in counts.items()}
        data["total_results"] = sum(counts.values())
        out.append(data)
    return out


@router.get("/{run_id}")
def get_run(run_id: uuid.UUID, db: Session = Depends(get_db)) -> dict:
    run = db.get(EvalRun, run_id)
    if run is None:
        raise HTTPException(404, "Run not found")
    data = serialize_run(run, include_summary=True)
    data["field_metrics"] = field_analytics(db, run_id)
    counts = dict(
        db.execute(
            select(EvalResult.status, func.count())
            .where(EvalResult.run_id == run_id)
            .group_by(EvalResult.status)
        ).all()
    )
    data["status_counts"] = {k or "UNKNOWN": v for k, v in counts.items()}
    data["total_results"] = sum(counts.values())
    return data


@router.delete("/{run_id}")
def delete_run(run_id: uuid.UUID, db: Session = Depends(get_db)) -> dict:
    run = db.get(EvalRun, run_id)
    if run is None:
        raise HTTPException(404, "Run not found")
    db.delete(run)
    db.commit()
    return {"deleted": str(run_id)}


@router.get("/{run_id}/results")
def list_results(
    run_id: uuid.UUID,
    db: Session = Depends(get_db),
    status: str | None = None,
    country: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=500),
    sort_by: str | None = None,
    sort_order: str = "asc",
) -> dict:
    if db.get(EvalRun, run_id) is None:
        raise HTTPException(404, "Run not found")

    q = select(EvalResult).where(EvalResult.run_id == run_id)
    cnt = select(func.count()).select_from(EvalResult).where(EvalResult.run_id == run_id)
    if status:
        q = q.where(EvalResult.status == status)
        cnt = cnt.where(EvalResult.status == status)
    if country:
        q = q.where(EvalResult.gold_ctry == country)
        cnt = cnt.where(EvalResult.gold_ctry == country)

    from app.search.compiler import SORT_COLUMNS

    col = SORT_COLUMNS.get(sort_by or "", EvalResult.id)
    q = q.order_by(col.desc() if sort_order == "desc" else col.asc())

    total = db.scalar(cnt) or 0
    rows = (
        db.execute(q.offset((page - 1) * page_size).limit(page_size)).scalars().all()
    )
    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "results": [serialize_result_row(r) for r in rows],
    }


@router.get("/{run_id}/results/{result_id}")
def get_result(
    run_id: uuid.UUID, result_id: uuid.UUID, db: Session = Depends(get_db)
) -> dict:
    r = db.get(EvalResult, result_id)
    if r is None or r.run_id != run_id:
        raise HTTPException(404, "Result not found")
    return serialize_result_detail(r)


@router.get("/{run_id}/available-countries")
def available_countries(run_id: uuid.UUID, db: Session = Depends(get_db)) -> list[str]:
    rows = db.execute(
        select(EvalResult.gold_ctry)
        .where(EvalResult.run_id == run_id, EvalResult.gold_ctry.isnot(None))
        .distinct()
        .order_by(EvalResult.gold_ctry)
    ).all()
    return [r[0] for r in rows]


@router.get("/{run_id}/facets")
def field_facets(
    run_id: uuid.UUID,
    field: str = Query(..., description="Token like gold.CtrySubDvsn or predicted.TwnNm"),
    limit: int = Query(300, ge=1, le=2000),
    db: Session = Depends(get_db),
) -> dict:
    """Distinct values of one field (a denormalized column) with counts — powers the
    Buckets panel. GROUP BY on a plain typed column, so it stays fast."""
    if db.get(EvalRun, run_id) is None:
        raise HTTPException(404, "Run not found")

    from app.search.fields import FieldError, resolve_column

    try:
        col = resolve_column(field)
    except FieldError as e:
        raise HTTPException(400, str(e))

    rows = db.execute(
        select(col, func.count())
        .where(EvalResult.run_id == run_id, col.isnot(None), col != "")
        .group_by(col)
        .order_by(func.count().desc(), col.asc())
        .limit(limit)
    ).all()
    return {"field": field, "buckets": [{"value": r[0], "count": r[1]} for r in rows]}


@router.get("/{run_id}/analytics/country")
def analytics_country(run_id: uuid.UUID, db: Session = Depends(get_db)) -> list[dict]:
    return country_analytics(db, run_id)


@router.get("/{run_id}/analytics/fields")
def analytics_fields(run_id: uuid.UUID, db: Session = Depends(get_db)) -> list[dict]:
    return field_analytics(db, run_id)


@router.get("/{run_id}/analytics/clusters")
def analytics_clusters(
    run_id: uuid.UUID, limit: int = 25, db: Session = Depends(get_db)
) -> list[dict]:
    return error_clusters(db, run_id, limit=limit)
