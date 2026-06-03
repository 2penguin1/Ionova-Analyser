"""Pydantic request models + ORM->dict serializers for API responses."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel

from app.core.fields import SWIFT_FIELDS, algo_col, gold_col, verdict_col
from app.models import EvalResult, EvalRun


# --------------------------------------------------------------------------- #
# Request models
# --------------------------------------------------------------------------- #

class SearchRequest(BaseModel):
    dsl: str | None = None
    ast: dict | None = None
    run_id: str | None = None
    page: int = 1
    page_size: int = 50
    sort_by: str | None = None
    sort_order: str = "asc"
    with_facets: bool = True
    save_history: bool = True


class ParseRequest(BaseModel):
    dsl: str


class SavedFilterRequest(BaseModel):
    name: str
    dsl: str | None = None
    ast: dict | None = None


class NlSearchRequest(BaseModel):
    question: str
    run_id: str | None = None


# --------------------------------------------------------------------------- #
# Serializers
# --------------------------------------------------------------------------- #

def serialize_run(run: EvalRun, *, include_summary: bool = False) -> dict[str, Any]:
    data = {
        "id": str(run.id),
        "source_run_id": run.source_run_id,
        "dataset_name": run.dataset_name,
        "run_type": run.run_type,
        "status": run.status,
        "initiated_by": run.initiated_by,
        "started_at": run.started_at.isoformat() if run.started_at else None,
        "completed_at": run.completed_at.isoformat() if run.completed_at else None,
        "algorithm_version": run.algorithm_version,
        "created_at": run.created_at.isoformat() if run.created_at else None,
    }
    if include_summary:
        data["summary"] = run.summary
    return data


def serialize_result_row(r: EvalResult) -> dict[str, Any]:
    return {
        "id": str(r.id),
        "run_id": str(r.run_id),
        "source_result_id": r.source_result_id,
        "source_entry_id": r.source_entry_id,
        "status": r.status,
        "execution_time_ms": r.execution_time_ms,
        "input_address": r.input_address,
        "country_gold": r.gold_ctry,
        "country_algo": r.algo_ctry,
        "n_correct": r.n_correct,
        "n_wrong": r.n_wrong,
        "n_missing": r.n_missing,
        "n_extra": r.n_extra,
    }


def serialize_result_detail(r: EvalResult) -> dict[str, Any]:
    fields = []
    for f in SWIFT_FIELDS:
        fields.append(
            {
                "field": f,
                "gold": getattr(r, gold_col(f)),
                "algo": getattr(r, algo_col(f)),
                "verdict": getattr(r, verdict_col(f)),
            }
        )
    return {
        **serialize_result_row(r),
        "address_hash": r.address_hash,
        "input_address_raw": r.input_address_raw,
        "run_id": str(r.run_id),
        "fields": fields,
    }
