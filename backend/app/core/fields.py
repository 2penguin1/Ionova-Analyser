"""Canonical field + verdict vocabulary, mirrored 1:1 from the IoNova eval export.

Source of truth in the monolith: ``code-python/gold_data/eval_export_workbook.py``
(``SWIFT_FIELDS``). Kept here as a standalone constant so the analyzer has zero
dependency on the monolith, but the ordering and names MUST match the exported
workbook's ``Gold:/Algo:/Verdict:`` column triples.
"""

from __future__ import annotations

# The 21 fields that appear as Gold/Algo/Verdict column triples in the Results sheet.
SWIFT_FIELDS: list[str] = [
    "Nm",
    "Ctry",
    "TwnNm",
    "StrtNm",
    "PstCd",
    "CtrySubDvsn",
    "BldgNb",
    "BldgNm",
    "AdrLine",
    "Dept",
    "SubDept",
    "Room",
    "Flr",
    "PstBx",
    "DstrctNm",
    "TwnLctnNm",
    "ABA",
    "BIC",
    "NCH",
    "IBAN",
    "Account",
]

# The Field Metrics sheet may carry extra fields (e.g. LEI) that have no Gold/Algo
# triple in the Results sheet. We accept any field name there; this list is only
# the authoritative set for per-record column denormalization + search namespaces.

# Per-field verdict vocabulary (the "Verdict: <field>" cell values) and how each
# maps to IoNova's internal confusion-matrix category.
VERDICTS = {
    "Correct": "TP_MATCH",   # gold and algo both filled and equal
    "Wrong": "FN_MISMATCH",  # gold filled, algo filled but different
    "Missing": "FN_EMPTY",   # gold filled, algo empty
    "Extra": "FP",           # gold empty, algo filled
    "Empty": "TP_EMPTY",     # gold and algo both empty
}

# Per-record statuses (the "Status" column).
STATUSES = ["PASSED", "FAILED", "WARNING", "ERROR"]

# High-cardinality text fields that benefit from a trigram GIN index for `contains`.
# Everything else gets a plain B-tree (cheap exact / verdict lookups).
TRIGRAM_FIELDS: list[str] = ["TwnNm", "StrtNm", "BldgNm", "Nm", "AdrLine", "DstrctNm"]


# Column names are lowercased so unquoted SQL (raw index DDL, ad-hoc psql) works
# without identifier quoting — Postgres folds unquoted identifiers to lowercase.
# The search *namespace* still uses the original field casing (e.g. predicted.TwnNm);
# only the physical column name is lowercased. Lowercased field names are unique.
def gold_col(field: str) -> str:
    return f"gold_{field.lower()}"


def algo_col(field: str) -> str:
    return f"algo_{field.lower()}"


def verdict_col(field: str) -> str:
    return f"verdict_{field.lower()}"
