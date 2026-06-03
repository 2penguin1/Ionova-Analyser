"""Saved filter CRUD."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.models import SavedFilter
from app.schemas import SavedFilterRequest

router = APIRouter(prefix="/saved-filters", tags=["saved-filters"])


def _serialize(f: SavedFilter) -> dict:
    return {
        "id": str(f.id),
        "name": f.name,
        "dsl": f.dsl,
        "ast": f.ast,
        "created_at": f.created_at.isoformat() if f.created_at else None,
    }


@router.get("")
def list_filters(db: Session = Depends(get_db)) -> list[dict]:
    rows = db.query(SavedFilter).order_by(SavedFilter.created_at.desc()).all()
    return [_serialize(f) for f in rows]


@router.post("")
def create_filter(req: SavedFilterRequest, db: Session = Depends(get_db)) -> dict:
    if not req.dsl and not req.ast:
        raise HTTPException(400, "Provide 'dsl' or 'ast'.")
    f = SavedFilter(name=req.name, dsl=req.dsl, ast=req.ast)
    db.add(f)
    db.commit()
    return _serialize(f)


@router.delete("/{filter_id}")
def delete_filter(filter_id: uuid.UUID, db: Session = Depends(get_db)) -> dict:
    f = db.get(SavedFilter, filter_id)
    if f is None:
        raise HTTPException(404, "Saved filter not found")
    db.delete(f)
    db.commit()
    return {"deleted": str(filter_id)}
