"""CLI: import an eval-run Excel export into the analyzer DB.

Usage:
    uv run python -m scripts.import_file "C:\\path\\to\\export.xlsx"
"""

from __future__ import annotations

import sys
from pathlib import Path

from app.core.db import SessionLocal
from app.ingest import import_workbook


def main() -> None:
    if len(sys.argv) < 2:
        print("usage: python -m scripts.import_file <path-to-xlsx>")
        raise SystemExit(2)
    path = Path(sys.argv[1])
    data = path.read_bytes()
    db = SessionLocal()
    try:
        counts = import_workbook(db, data)
        db.commit()
        print("Imported:", counts)
    finally:
        db.close()


if __name__ == "__main__":
    main()
