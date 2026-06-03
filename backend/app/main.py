"""FastAPI application factory for the IoNova Eval Analyzer."""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import imports, nl, runs, saved_filters, search
from app.core.config import get_settings
from app.core.fields import SWIFT_FIELDS, VERDICTS

settings = get_settings()

app = FastAPI(
    title="IoNova Eval Analyzer API",
    version="0.1.0",
    description="Imports eval-run Excel exports and powers advanced search/analytics.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(imports.router)
app.include_router(runs.router)
app.include_router(search.router)
app.include_router(saved_filters.router)
app.include_router(nl.router)


@app.get("/health", tags=["meta"])
def health() -> dict:
    return {"status": "ok"}


@app.get("/meta/fields", tags=["meta"])
def meta_fields() -> dict:
    """Field + verdict vocabulary the frontend uses to build query UIs."""
    return {
        "fields": SWIFT_FIELDS,
        "verdicts": list(VERDICTS.keys()),
        "namespaces": ["address", "predicted", "gold", "verdict", "status", "country"],
        "operators": [
            {"op": "eq", "label": "equals", "symbol": "="},
            {"op": "neq", "label": "not equals", "symbol": "!="},
            {"op": "contains", "label": "contains", "symbol": "contains"},
            {"op": "startswith", "label": "starts with", "symbol": "startswith"},
            {"op": "endswith", "label": "ends with", "symbol": "endswith"},
            {"op": "regex", "label": "matches regex", "symbol": "regex"},
            {"op": "empty", "label": "is empty", "symbol": "empty"},
            {"op": "notempty", "label": "is not empty", "symbol": "notempty"},
            {"op": "eq_field", "label": "equals field", "symbol": "="},
            {"op": "neq_field", "label": "not equals field", "symbol": "!="},
        ],
        "nl_enabled": settings.enable_nl_search,
    }
