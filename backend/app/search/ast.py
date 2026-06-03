"""Canonical query AST — the single representation every query source compiles to.

Sources: the visual query-builder (frontend), the text DSL (dsl.py), and the
future NL translator all emit this same JSON shape. The compiler (compiler.py) is
the one execution path. See plan §4.

Node shapes:
  Boolean group:  {"op": "AND"|"OR"|"NOT", "nodes": [ ... ]}
  Leaf:           {"field": "<token>", "op": "<leaf-op>", "value": "...", "ci": bool}
  Comparison leaf:{"field": "predicted.TwnNm", "op": "neq_field", "value": "gold.TwnNm"}
"""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field, model_validator

BOOL_OPS = {"AND", "OR", "NOT"}

# Leaf operators that take a literal value.
VALUE_OPS = {
    "eq",
    "neq",
    "contains",
    "icontains",
    "startswith",
    "endswith",
    "regex",
    "iregex",
    "lt",
    "gt",
    "lte",
    "gte",
}
# Leaf operators that take no value.
NULLARY_OPS = {"empty", "notempty"}
# Leaf operators whose value is another field token (column-to-column comparison).
FIELD_OPS = {"eq_field", "neq_field"}

LEAF_OPS = VALUE_OPS | NULLARY_OPS | FIELD_OPS


class QueryAST(BaseModel):
    op: str
    # Boolean group:
    nodes: list["QueryAST"] | None = None
    # Leaf:
    field: str | None = None
    value: Any | None = None
    ci: bool | None = Field(default=None, description="Case-insensitive (where applicable)")

    @property
    def is_group(self) -> bool:
        return self.op.upper() in BOOL_OPS

    @model_validator(mode="after")
    def _check(self) -> "QueryAST":
        op = self.op
        if op.upper() in BOOL_OPS:
            if not self.nodes:
                raise ValueError(f"Boolean op '{op}' requires non-empty 'nodes'.")
            if op.upper() == "NOT" and len(self.nodes) != 1:
                raise ValueError("'NOT' must wrap exactly one node.")
            return self
        if op not in LEAF_OPS:
            raise ValueError(f"Unknown op '{op}'. Allowed: {sorted(BOOL_OPS | LEAF_OPS)}")
        if not self.field:
            raise ValueError(f"Leaf op '{op}' requires 'field'.")
        if op in VALUE_OPS or op in FIELD_OPS:
            if self.value is None or self.value == "":
                raise ValueError(f"Leaf op '{op}' requires a 'value'.")
        return self


QueryAST.model_rebuild()


def validate_ast(data: dict) -> QueryAST:
    """Parse + validate a raw AST dict, raising on any structural problem."""
    return QueryAST.model_validate(data)
