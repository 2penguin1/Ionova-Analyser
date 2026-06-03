"""Compile a Query AST into SQLAlchemy and execute paginated, faceted search.

This is the single execution path for the visual builder, the DSL, and (later)
NL — they all produce the same AST. Every leaf maps to a denormalized column
operation (plan §3a), so filters stay indexable.
"""

from __future__ import annotations

from typing import Any

from sqlalchemy import Float, and_, cast, func, not_, or_, select
from sqlalchemy.orm import Session
from sqlalchemy.sql.elements import ColumnElement

from app.models import EvalResult
from app.search.ast import QueryAST, validate_ast
from app.search.fields import NUMERIC_FIELDS, resolve_column

# Sort keys exposed to the API (whitelist).
SORT_COLUMNS = {
    "execution_time_ms": EvalResult.execution_time_ms,
    "status": EvalResult.status,
    "n_correct": EvalResult.n_correct,
    "n_wrong": EvalResult.n_wrong,
    "n_missing": EvalResult.n_missing,
    "n_extra": EvalResult.n_extra,
    "input_address": EvalResult.input_address,
}


def _like_escape(value: str) -> str:
    return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


def _leaf_expr(node: QueryAST) -> ColumnElement:
    col = resolve_column(node.field)
    op = node.op
    ci = bool(node.ci) if node.ci is not None else False
    val = node.value

    if op == "empty":
        return or_(col.is_(None), col == "")
    if op == "notempty":
        return and_(col.isnot(None), col != "")

    if op in ("eq_field", "neq_field"):
        other = resolve_column(str(val))
        # Field comparisons default to case-insensitive (gold is mixed-case,
        # algo is upper-case in the data), unless ci is explicitly False.
        cf = node.ci is not False
        left, right = (func.lower(col), func.lower(other)) if cf else (col, other)
        return left.is_distinct_from(right) if op == "neq_field" else (left == right)

    sval = "" if val is None else str(val)

    if op == "eq":
        return func.lower(col) == sval.lower() if ci else col == sval
    if op == "neq":
        target = func.lower(col) if ci else col
        return target.is_distinct_from(sval.lower() if ci else sval)
    if op == "contains":
        pat = f"%{_like_escape(sval)}%"
        return col.ilike(pat) if ci else col.like(pat)
    if op == "startswith":
        pat = f"{_like_escape(sval)}%"
        return col.ilike(pat) if ci else col.like(pat)
    if op == "endswith":
        pat = f"%{_like_escape(sval)}"
        return col.ilike(pat) if ci else col.like(pat)
    if op == "regex":
        return col.op("~*")(sval) if ci else col.op("~")(sval)
    if op in ("lt", "gt", "lte", "gte"):
        numeric = node.field.lower() in NUMERIC_FIELDS
        left: Any = cast(col, Float) if numeric else col
        right: Any = float(sval) if numeric else sval
        return {
            "lt": left < right,
            "gt": left > right,
            "lte": left <= right,
            "gte": left >= right,
        }[op]

    raise ValueError(f"Unsupported leaf op '{op}'")


def compile_ast(node: QueryAST) -> ColumnElement:
    """Recursively compile an AST node into a SQLAlchemy boolean expression."""
    upper = node.op.upper()
    if upper == "AND":
        return and_(*(compile_ast(n) for n in node.nodes))
    if upper == "OR":
        return or_(*(compile_ast(n) for n in node.nodes))
    if upper == "NOT":
        return not_(compile_ast(node.nodes[0]))
    return _leaf_expr(node)


def run_search(
    db: Session,
    ast: dict | QueryAST,
    *,
    run_id=None,
    page: int = 1,
    page_size: int = 50,
    sort_by: str | None = None,
    sort_order: str = "asc",
    with_facets: bool = True,
) -> dict:
    """Execute a search; return rows + total + facets. ``ast`` may be a raw dict."""
    query_ast = ast if isinstance(ast, QueryAST) else validate_ast(ast)
    predicate = compile_ast(query_ast)

    conditions = [predicate]
    if run_id is not None:
        conditions.append(EvalResult.run_id == run_id)
    where = and_(*conditions)

    total = db.scalar(select(func.count()).select_from(EvalResult).where(where)) or 0

    sort_col = SORT_COLUMNS.get(sort_by or "", EvalResult.id)
    sort_col = sort_col.desc() if sort_order == "desc" else sort_col.asc()

    page = max(1, page)
    page_size = max(1, min(page_size, 500))
    rows = (
        db.execute(
            select(EvalResult)
            .where(where)
            .order_by(sort_col)
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        .scalars()
        .all()
    )

    facets = _facets(db, where) if with_facets else None

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "results": rows,
        "facets": facets,
    }


def _facets(db: Session, where) -> dict:
    status_rows = db.execute(
        select(EvalResult.status, func.count())
        .where(where)
        .group_by(EvalResult.status)
    ).all()
    country_rows = db.execute(
        select(EvalResult.gold_ctry, func.count())
        .where(where)
        .group_by(EvalResult.gold_ctry)
        .order_by(func.count().desc())
        .limit(30)
    ).all()
    return {
        "status": {(s or "UNKNOWN"): c for s, c in status_rows},
        "country": {(c or "UNKNOWN"): n for c, n in country_rows},
    }
