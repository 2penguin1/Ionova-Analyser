"""Text DSL -> Query AST, via a small Lark grammar.

Examples:
    predicted.Ctry = DE AND gold.TwnNm contains "AM MAIN"
    NOT address contains "C/O"
    predicted.Ctry != gold.Ctry
    verdict.TwnNm = Missing AND predicted.Ctry = DE
    gold.PstCd regex "^[0-9]{5}$"
    address startswith "C/O" OR address endswith "GMBH"

Precedence: NOT > AND > OR. Parentheses override. The DSL and the visual builder
both target the same AST, so a query round-trips between them.
"""

from __future__ import annotations

from lark import Lark, Token, Transformer, v_args
from lark.exceptions import LarkError

from app.search.fields import is_field_ref

_GRAMMAR = r"""
    ?start: or_expr

    ?or_expr: and_expr
            | or_expr OR and_expr      -> or_op

    ?and_expr: not_expr
             | and_expr AND not_expr   -> and_op

    ?not_expr: atom
             | NOT atom                -> not_op

    ?atom: "(" or_expr ")"
         | predicate

    predicate: NAME NULLARY            -> nullary
             | NAME BINOP value        -> binary

    ?value: ESCAPED_STRING             -> qstr
          | NAME                       -> bare

    AND.6: "AND"i | "&&"
    OR.6:  "OR"i | "||"
    NOT.6: "NOT"i | "!"

    NULLARY.5: "notempty"i | "empty"i
    BINOP.5: "==" | "!=" | "~=" | "<=" | ">=" | "="
           | "<" | ">"
           | "icontains"i | "contains"i
           | "startswith"i | "endswith"i
           | "iregex"i | "regex"i

    NAME: /[A-Za-z_][A-Za-z0-9_.\-]*/

    %import common.ESCAPED_STRING
    %import common.WS
    %ignore WS
"""

_BINOP = {
    "=": ("eq", False),
    "==": ("eq", False),
    "~=": ("eq", True),
    "!=": ("neq", False),
    "contains": ("contains", True),
    "icontains": ("contains", True),
    "startswith": ("startswith", True),
    "endswith": ("endswith", True),
    "regex": ("regex", False),
    "iregex": ("regex", True),
    "<": ("lt", False),
    ">": ("gt", False),
    "<=": ("lte", False),
    ">=": ("gte", False),
}


class DslError(ValueError):
    """Raised when a DSL string cannot be parsed."""


@v_args(inline=True)
class _ToAst(Transformer):
    def or_op(self, left, _op, right):
        return _merge("OR", left, right)

    def and_op(self, left, _op, right):
        return _merge("AND", left, right)

    def not_op(self, _op, node):
        return {"op": "NOT", "nodes": [node]}

    def nullary(self, name: Token, op: Token):
        return {"field": str(name), "op": str(op).lower()}

    def binary(self, name: Token, op: Token, value):
        op_text = str(op).lower()
        base_op, ci = _BINOP[op_text]
        kind, raw = value
        if base_op in ("eq", "neq") and kind == "bare" and is_field_ref(raw):
            return {"field": str(name), "op": f"{base_op}_field", "value": raw}
        leaf = {"field": str(name), "op": base_op, "value": raw}
        if base_op in ("eq", "neq", "contains", "startswith", "endswith", "regex"):
            leaf["ci"] = ci
        return leaf

    def qstr(self, s: Token):
        # Strip surrounding quotes and unescape.
        return ("q", bytes(str(s)[1:-1], "utf-8").decode("unicode_escape"))

    def bare(self, s: Token):
        return ("bare", str(s))


def _merge(op: str, left: dict, right: dict) -> dict:
    """Flatten same-op groups: (a AND b) AND c -> AND[a,b,c]."""
    nodes = []
    for side in (left, right):
        if side.get("op") == op:
            nodes.extend(side["nodes"])
        else:
            nodes.append(side)
    return {"op": op, "nodes": nodes}


_parser = Lark(_GRAMMAR, parser="earley", maybe_placeholders=False)
_transformer = _ToAst()


def parse_dsl(text: str) -> dict:
    """Parse a DSL string into a raw AST dict (not yet field-validated)."""
    text = (text or "").strip()
    if not text:
        raise DslError("Empty query.")
    try:
        tree = _parser.parse(text)
    except LarkError as exc:
        raise DslError(f"Could not parse query: {exc}") from exc
    return _transformer.transform(tree)
