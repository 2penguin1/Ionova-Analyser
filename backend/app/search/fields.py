"""Search namespace resolution — maps a field token to a SQLAlchemy column.

Every searchable token resolves to a denormalized column on EvalResult (the hot
path; see plan §3a). Field names are validated against the known whitelist so a
typo or an injection attempt can never reach SQL.

Namespaces:
  address                -> input_address
  status                 -> status
  exec_time_ms           -> execution_time_ms
  country                -> gold_ctry  (convenience alias for gold.Ctry)
  predicted.<Field>      -> algo_<field>
  gold.<Field>           -> gold_<field>
  verdict.<Field>        -> verdict_<field>
"""

from __future__ import annotations

from sqlalchemy.orm import InstrumentedAttribute

from app.core.fields import SWIFT_FIELDS, algo_col, gold_col, verdict_col
from app.models import EvalResult

# Case-insensitive lookup of the canonical field name from user input.
_FIELD_LOOKUP = {f.lower(): f for f in SWIFT_FIELDS}

# Simple (non-namespaced) tokens.
_SIMPLE = {
    "address": "input_address",
    "status": "status",
    "exec_time_ms": "execution_time_ms",
    "country": "gold_ctry",
}

# Numeric columns (affects operator coercion).
NUMERIC_FIELDS = {"exec_time_ms", "execution_time_ms"}


class FieldError(ValueError):
    """Unknown or malformed field token."""


def canonical_field(field_name: str) -> str:
    """Return the canonical SWIFT field name (e.g. 'twnnm' -> 'TwnNm')."""
    key = field_name.lower()
    if key not in _FIELD_LOOKUP:
        raise FieldError(
            f"Unknown field '{field_name}'. Known fields: {', '.join(SWIFT_FIELDS)}"
        )
    return _FIELD_LOOKUP[key]


def resolve_column(token: str) -> InstrumentedAttribute:
    """Resolve a token like 'predicted.Ctry' / 'address' to an ORM column."""
    token = token.strip()
    low = token.lower()

    if low in _SIMPLE:
        return getattr(EvalResult, _SIMPLE[low])

    if "." not in token:
        raise FieldError(
            f"Unknown token '{token}'. Use a namespace like predicted.<Field>, "
            f"gold.<Field>, verdict.<Field>, or one of: {', '.join(_SIMPLE)}"
        )

    ns, _, field = token.partition(".")
    ns = ns.lower()
    canon = canonical_field(field)
    if ns in ("predicted", "algo"):
        return getattr(EvalResult, algo_col(canon))
    if ns == "gold":
        return getattr(EvalResult, gold_col(canon))
    if ns == "verdict":
        return getattr(EvalResult, verdict_col(canon))
    raise FieldError(
        f"Unknown namespace '{ns}'. Use predicted | gold | verdict (or address/status/country)."
    )


def is_field_ref(value: str) -> bool:
    """True if a bare value looks like another field reference (for comparisons)."""
    v = value.strip()
    low = v.lower()
    if low in _SIMPLE:
        return True
    if "." in v:
        ns = v.split(".", 1)[0].lower()
        return ns in ("predicted", "algo", "gold", "verdict")
    return False
