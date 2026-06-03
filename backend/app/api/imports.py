"""Import endpoints — upload an eval-run Excel export and track its status."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.core.db import SessionLocal, get_db
from app.ingest import ImportError_, import_workbook
from app.models import ImportBatch
from app.storage import get_storage

router = APIRouter(prefix="/imports", tags=["imports"])


def _run_import(batch_id: uuid.UUID, storage_key: str) -> None:
    """Background task: parse the stored workbook into the DB."""
    db: Session = SessionLocal()
    try:
        batch = db.get(ImportBatch, batch_id)
        if batch is None:
            return
        batch.status = "PARSING"
        db.commit()
        try:
            data = get_storage().open(storage_key)
            counts = import_workbook(db, data, import_batch_id=batch_id)
            batch.status = "COMPLETED"
            batch.row_counts = counts
            db.commit()
        except (ImportError_, Exception) as exc:  # noqa: BLE001 - record failure
            db.rollback()
            batch = db.get(ImportBatch, batch_id)
            if batch:
                batch.status = "FAILED"
                batch.error_text = str(exc)
                db.commit()
    finally:
        db.close()


@router.post("")
async def create_import(
    file: UploadFile,
    background: BackgroundTasks,
    db: Session = Depends(get_db),
) -> dict:
    if not file.filename or not file.filename.lower().endswith((".xlsx", ".xlsm")):
        raise HTTPException(400, "Please upload an .xlsx export file.")

    data = await file.read()
    batch_id = uuid.uuid4()
    storage_key = f"{batch_id}/{file.filename}"
    get_storage().save(storage_key, data)

    batch = ImportBatch(
        id=batch_id, filename=file.filename, storage_key=storage_key, status="PENDING"
    )
    db.add(batch)
    db.commit()

    background.add_task(_run_import, batch_id, storage_key)
    return {"import_id": str(batch_id), "status": "PENDING"}


@router.get("")
def list_imports(db: Session = Depends(get_db)) -> list[dict]:
    batches = db.query(ImportBatch).order_by(ImportBatch.created_at.desc()).all()
    return [
        {
            "id": str(b.id),
            "filename": b.filename,
            "status": b.status,
            "error_text": b.error_text,
            "row_counts": b.row_counts,
            "created_at": b.created_at.isoformat() if b.created_at else None,
        }
        for b in batches
    ]


@router.get("/{import_id}")
def get_import(import_id: uuid.UUID, db: Session = Depends(get_db)) -> dict:
    b = db.get(ImportBatch, import_id)
    if b is None:
        raise HTTPException(404, "Import not found")
    return {
        "id": str(b.id),
        "filename": b.filename,
        "status": b.status,
        "error_text": b.error_text,
        "row_counts": b.row_counts,
        "created_at": b.created_at.isoformat() if b.created_at else None,
    }
