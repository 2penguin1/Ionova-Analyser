"""Search endpoints — one execution path for builder + DSL (+ future NL)."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.models import SearchHistory
from app.schemas import ParseRequest, SearchRequest, serialize_result_row
from app.search import DslError, parse_dsl, run_search, validate_ast
from app.search.fields import FieldError

router = APIRouter(tags=["search"])


def _resolve_ast(req_dsl: str | None, req_ast: dict | None) -> dict:
    if req_ast is not None:
        return req_ast
    if req_dsl:
        return parse_dsl(req_dsl)
    raise HTTPException(400, "Provide either 'dsl' or 'ast'.")


@router.post("/search")
def search(req: SearchRequest, db: Session = Depends(get_db)) -> dict:
    try:
        raw_ast = _resolve_ast(req.dsl, req.ast)
        ast = validate_ast(raw_ast)
    except DslError as exc:
        raise HTTPException(422, f"DSL error: {exc}") from exc
    except (FieldError, ValueError) as exc:
        raise HTTPException(422, f"Invalid query: {exc}") from exc

    run_uuid = uuid.UUID(req.run_id) if req.run_id else None
    try:
        result = run_search(
            db,
            ast,
            run_id=run_uuid,
            page=req.page,
            page_size=req.page_size,
            sort_by=req.sort_by,
            sort_order=req.sort_order,
            with_facets=req.with_facets,
        )
    except (FieldError, ValueError) as exc:
        raise HTTPException(422, f"Invalid query: {exc}") from exc

    if req.save_history:
        db.add(
            SearchHistory(
                dsl=req.dsl,
                ast=raw_ast,
                run_id=run_uuid,
                result_count=result["total"],
            )
        )
        db.commit()

    return {
        "total": result["total"],
        "page": result["page"],
        "page_size": result["page_size"],
        "facets": result["facets"],
        "ast": raw_ast,
        "results": [serialize_result_row(r) for r in result["results"]],
    }


@router.post("/search/parse")
def parse(req: ParseRequest) -> dict:
    """Parse a DSL string to an AST (live validation / builder round-trip)."""
    try:
        ast = parse_dsl(req.dsl)
        validate_ast(ast)  # surface field/structure errors too
    except DslError as exc:
        raise HTTPException(422, f"DSL error: {exc}") from exc
    except (FieldError, ValueError) as exc:
        raise HTTPException(422, f"Invalid query: {exc}") from exc
    return {"ast": ast}


@router.get("/search-history")
def search_history(limit: int = 50, db: Session = Depends(get_db)) -> list[dict]:
    rows = (
        db.query(SearchHistory)
        .order_by(SearchHistory.created_at.desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "id": str(h.id),
            "dsl": h.dsl,
            "ast": h.ast,
            "run_id": str(h.run_id) if h.run_id else None,
            "result_count": h.result_count,
            "created_at": h.created_at.isoformat() if h.created_at else None,
        }
        for h in rows
    ]
