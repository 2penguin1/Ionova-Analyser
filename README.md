# IoNova Eval Analyzer

A standalone analysis tool for IoNova **Eval Run** exports. Import the Excel files
that IoNova produces, recreate the eval-run viewing experience, and run a far more
powerful **search & analysis** layer over the results.

- **Backend:** FastAPI + SQLAlchemy + PostgreSQL (`pg_trgm`) + Alembic
- **Frontend:** React + Vite + Tailwind 4 (vendored IoNova `@ionovo/ui` theme)
- **Search:** one Query AST fed by both a visual **Query Builder** and a text **DSL**
- **Future-ready seams:** S3 storage and Natural-Language search are stubbed behind
  interfaces so they drop in without touching the rest of the stack.

See `docs/ARCHITECTURE.md`-equivalent details in the approved plan.

## Features

- Import one or more exported eval-run workbooks (4 sheets: Summary, Field Metrics,
  Results, Mismatches). Idempotent on the source Run ID.
- Eval-run view: summary metrics, field-level metrics table (Correct/Extra/Missing/
  Wrong/Total), results table, and a prediction-vs-gold field-diff drawer.
- Advanced search across four dimensions — **address text**, **predicted** fields,
  **gold** fields, and **comparison** (e.g. `predicted.Ctry != gold.Ctry`) — with
  AND/OR/NOT, exact/contains/starts/ends/regex/empty, case sensitivity, and per-field
  verdict filters. Builder and DSL share one engine.
- Analytics: country-level accuracy and frequent error-pattern clustering.
- Saved filters + search history.

## Quick start

### 1. Database

Either use the bundled Docker Postgres:

```bash
docker compose up -d            # Postgres on host port 5433 (analyzer/analyzer)
```

…or point at an existing local Postgres (see `backend/.env`).

### 2. Backend

```bash
cd backend
uv sync
# configure backend/.env (copy from .env.example)
uv run alembic upgrade head     # create schema + pg_trgm + indexes
uv run uvicorn app.main:app --reload --port 8077
```

Import a workbook from the CLI (optional — the UI does this too):

```bash
uv run python -m scripts.import_file "C:\path\to\Evaluation_Run.xlsx"
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev                      # http://localhost:5173 (proxies /api -> :8077)
```

## DSL examples

```
predicted.Ctry = DE AND gold.TwnNm contains "AM MAIN"
NOT address contains "C/O"
predicted.Ctry != gold.Ctry
verdict.TwnNm = Missing AND predicted.Ctry = DE
gold.PstCd regex "^[0-9]{5}$"
address startswith "C/O" OR address endswith "GMBH"
```

Namespaces: `address`, `predicted.<Field>`, `gold.<Field>`, `verdict.<Field>`,
`status`, `country`. The 21 fields match IoNova's SWIFT field set.

## Project layout

```
backend/   FastAPI app (app/), Alembic migrations, tests, scripts
frontend/  Vite + React app (src/)
docker-compose.yml
```

## Future upgrades (seams already in place)

- **S3 uploads:** implement `app/storage/s3.py` and set `ANALYZER_STORAGE_BACKEND=s3`.
- **Natural-language search:** implement `app/nl/translator.py` to emit a Query AST
  and set `ANALYZER_ENABLE_NL_SEARCH=true`. The UI section and `/nl/search` route
  already exist (disabled).

## Tests

```bash
cd backend && uv run pytest      # DSL, AST, and importer parsing
cd frontend && npm run build     # type-check + production build
```
