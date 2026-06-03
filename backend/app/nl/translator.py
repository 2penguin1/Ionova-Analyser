"""Natural-language -> Query AST translation.

INTENTIONALLY STUBBED. Natural-language search is a planned future feature. The
seam is locked in now so adding it later is a drop-in:

  * The whole search stack already executes a Query AST (see app/search).
  * A future implementation only needs to turn a question into that AST JSON
    (an LLM call with FIELD_CONTEXT below, or a rules engine) and return it.
  * Nothing in the compiler, indexes, API result shape, or UI needs to change.

The /nl/search route exists but is gated behind ANALYZER_ENABLE_NL_SEARCH.
"""

from __future__ import annotations

import abc
from functools import lru_cache

from app.core.fields import SWIFT_FIELDS, VERDICTS

# Context a future LLM/rules translator can use to ground its AST output.
FIELD_CONTEXT = {
    "fields": SWIFT_FIELDS,
    "namespaces": ["address", "predicted.<Field>", "gold.<Field>", "verdict.<Field>",
                   "status", "country", "exec_time_ms"],
    "verdicts": list(VERDICTS.keys()),
    "ops": ["eq", "neq", "contains", "startswith", "endswith", "regex",
            "empty", "notempty", "eq_field", "neq_field", "AND", "OR", "NOT"],
}


class NlTranslator(abc.ABC):
    @abc.abstractmethod
    def translate(self, question: str) -> dict:
        """Return a Query AST dict for the natural-language ``question``."""


class StubTranslator(NlTranslator):
    def translate(self, question: str) -> dict:  # pragma: no cover - stub
        raise NotImplementedError(
            "Natural-language search is not implemented yet. It is designed as a "
            "drop-in: implement NlTranslator.translate to emit a Query AST (see "
            "FIELD_CONTEXT) and enable ANALYZER_ENABLE_NL_SEARCH."
        )


@lru_cache
def get_translator() -> NlTranslator:
    return StubTranslator()
