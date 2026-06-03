"""Natural-language search endpoint — STUB, gated behind a feature flag.

The route exists so the frontend "Natural Language" section and the API contract
are in place. It returns 501 until ANALYZER_ENABLE_NL_SEARCH is on AND a real
NlTranslator is implemented. See app/nl/translator.py.
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.core.config import get_settings
from app.nl import get_translator
from app.schemas import NlSearchRequest

router = APIRouter(prefix="/nl", tags=["nl"])


@router.get("/status")
def nl_status() -> dict:
    return {"enabled": get_settings().enable_nl_search, "implemented": False}


@router.post("/search")
def nl_search(req: NlSearchRequest) -> dict:
    if not get_settings().enable_nl_search:
        raise HTTPException(
            501, "Natural-language search is not enabled (planned future feature)."
        )
    try:
        ast = get_translator().translate(req.question)
    except NotImplementedError as exc:
        raise HTTPException(501, str(exc)) from exc
    return {"ast": ast}
