"""DSL -> AST parsing + validation (pure, no DB)."""

import pytest

from app.search.ast import validate_ast
from app.search.dsl import DslError, parse_dsl


def test_simple_eq():
    ast = parse_dsl("predicted.Ctry = DE")
    assert ast == {"field": "predicted.Ctry", "op": "eq", "value": "DE", "ci": False}
    validate_ast(ast)


def test_and_flattening():
    ast = parse_dsl('predicted.Ctry = DE AND gold.TwnNm contains "AM MAIN"')
    assert ast["op"] == "AND"
    assert len(ast["nodes"]) == 2
    assert ast["nodes"][1] == {
        "field": "gold.TwnNm", "op": "contains", "value": "AM MAIN", "ci": True
    }


def test_precedence_not_and_or():
    # NOT binds tightest, then AND, then OR.
    ast = parse_dsl("NOT address contains \"X\" OR status = FAILED AND predicted.Ctry = DE")
    assert ast["op"] == "OR"
    assert ast["nodes"][0]["op"] == "NOT"
    assert ast["nodes"][1]["op"] == "AND"


def test_field_comparison():
    ast = parse_dsl("predicted.Ctry != gold.Ctry")
    assert ast == {"field": "predicted.Ctry", "op": "neq_field", "value": "gold.Ctry"}


def test_regex_and_iregex():
    assert parse_dsl('gold.PstCd regex "^[0-9]{5}$"')["ci"] is False
    assert parse_dsl('gold.PstCd iregex "^[0-9]{5}$"')["ci"] is True


def test_nullary_ops():
    assert parse_dsl("predicted.TwnNm empty") == {"field": "predicted.TwnNm", "op": "empty"}
    assert parse_dsl("gold.TwnNm notempty") == {"field": "gold.TwnNm", "op": "notempty"}


def test_parens_override():
    ast = parse_dsl("(status = FAILED OR status = WARNING) AND predicted.Ctry = DE")
    assert ast["op"] == "AND"
    assert ast["nodes"][0]["op"] == "OR"


def test_case_insensitive_exact():
    assert parse_dsl("gold.TwnNm ~= tallinn")["ci"] is True


def test_empty_raises():
    with pytest.raises(DslError):
        parse_dsl("   ")


def test_validate_rejects_unknown_op():
    with pytest.raises(Exception):
        validate_ast({"field": "predicted.Ctry", "op": "bogus", "value": "x"})
