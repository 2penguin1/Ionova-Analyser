import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Bookmark, Code2, Layers, Play, SlidersHorizontal, X } from 'lucide-react';
import { api } from '~/lib/api';
import { Card } from '~/ui/Card';
import { Button } from '~/ui/Button';
import { EmptyState, Input, PageHeader, Select, Spinner } from '~/ui/primitives';
import { cn } from '~/lib/cn';
import {
  Condition, QueryBuilder, conditionsToDsl, emptyCondition,
} from '~/components/QueryBuilder';
import { BucketsPanel, type BucketPin } from '~/components/BucketsPanel';
import { ResultsTable } from '~/components/ResultsTable';
import { ResultDetailDrawer } from '~/components/ResultDetailDrawer';
import { Pagination } from '~/pages/RunDetailPage';
import type { ResultRow, SearchResponse } from '~/lib/types';

const PAGE_SIZE = 50;

const EXAMPLES = [
  'predicted.Ctry = EE AND verdict.TwnNm = Wrong',
  'gold.TwnNm contains "TALLINN"',
  'predicted.Ctry != gold.Ctry',
  'NOT address contains "OU"',
  'gold.PstCd regex "^[0-9]{5}$"',
];

/** Pinned buckets → a DSL fragment, e.g. `gold.CtrySubDvsn = "HE" AND predicted.Ctry = "DE"`. */
function combinePins(pins: BucketPin[]): string {
  return pins.map((p) => `${p.token} = "${p.value.replace(/"/g, '\\"')}"`).join(' AND ');
}

/** Combine the pinned (fixed) filter with the user's query; pins always apply. */
function combineDsl(pinsDsl: string, userDsl: string): string {
  if (!pinsDsl) return userDsl;
  if (!userDsl.trim()) return pinsDsl;
  return `${pinsDsl} AND (${userDsl})`;
}

export default function SearchPage() {
  const qc = useQueryClient();
  const [params] = useSearchParams();
  const meta = useQuery({ queryKey: ['meta'], queryFn: api.meta });
  const runs = useQuery({ queryKey: ['runs'], queryFn: api.listRuns });

  const [mode, setMode] = useState<'builder' | 'dsl'>('builder');
  const [conditions, setConditions] = useState<Condition[]>([emptyCondition()]);
  const [connective, setConnective] = useState<'AND' | 'OR'>('AND');
  const [dsl, setDsl] = useState('');
  const [runScope, setRunScope] = useState<string>('');
  const [pins, setPins] = useState<BucketPin[]>([]);
  const [showBuckets, setShowBuckets] = useState(false);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<ResultRow | null>(null);
  const [data, setData] = useState<SearchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Prefill from URL (?dsl= & ?run=) — e.g. click-through from Run Detail.
  useEffect(() => {
    const urlDsl = params.get('dsl');
    const urlRun = params.get('run');
    if (urlRun) setRunScope(urlRun);
    if (urlDsl) { setDsl(urlDsl); setMode('dsl'); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pinsDsl = useMemo(() => combinePins(pins), [pins]);
  const userDsl = useMemo(
    () => (mode === 'dsl' ? dsl : conditionsToDsl(conditions, connective)),
    [mode, dsl, conditions, connective]
  );
  const effectiveDsl = useMemo(() => combineDsl(pinsDsl, userDsl), [pinsDsl, userDsl]);

  const search = useMutation({
    mutationFn: ({ dsl: q, page: p }: { dsl: string; page: number }) =>
      api.search({
        dsl: q,
        run_id: runScope || null,
        page: p,
        page_size: PAGE_SIZE,
        with_facets: true,
      }),
    onSuccess: (res, vars) => { setData(res); setPage(vars.page); setError(null); qc.invalidateQueries({ queryKey: ['search-history'] }); },
    onError: (e: Error) => { setError(e.message); setData(null); },
  });

  const saveFilter = useMutation({
    mutationFn: (name: string) => api.createSavedFilter({ name, dsl: effectiveDsl }),
  });

  function run(p = 1) {
    if (!effectiveDsl.trim()) { setError('Build or type a query first.'); return; }
    search.mutate({ dsl: effectiveDsl, page: p });
  }

  function addPin(pin: BucketPin) {
    if (pins.some((p) => p.token === pin.token && p.value === pin.value)) return;
    const next = [...pins, pin];
    setPins(next);
    // Run immediately with the new pin combined into the current query.
    search.mutate({ dsl: combineDsl(combinePins(next), userDsl), page: 1 });
  }

  function removePin(i: number) {
    const next = pins.filter((_, idx) => idx !== i);
    setPins(next);
    const combined = combineDsl(combinePins(next), userDsl);
    if (combined.trim()) search.mutate({ dsl: combined, page: 1 });
    else { setData(null); setError(null); }
  }

  return (
    <div>
      <PageHeader
        title="Advanced Search"
        subtitle="Search across address, predicted, gold, and comparison dimensions. Builder and DSL share one query engine."
        actions={
          <div className="flex items-center gap-2">
            <Select value={runScope} onChange={(e) => setRunScope(e.target.value)}>
              <option value="">All runs</option>
              {runs.data?.map((r) => <option key={r.id} value={r.id}>{r.dataset_name ?? r.source_run_id}</option>)}
            </Select>
            <button
              onClick={() => setShowBuckets((v) => !v)}
              className={cn('flex items-center gap-1.5 px-3 h-9 text-sm rounded-lg border border-[var(--border-default)]', showBuckets ? 'bg-accent text-white' : 'text-[var(--text-secondary)]')}
            >
              <Layers size={14} /> Buckets
            </button>
            <div className="flex rounded-lg border border-[var(--border-default)] overflow-hidden">
              <button onClick={() => setMode('builder')} className={cn('flex items-center gap-1.5 px-3 h-9 text-sm', mode === 'builder' ? 'bg-accent text-white' : 'text-[var(--text-secondary)]')}>
                <SlidersHorizontal size={14} /> Builder
              </button>
              <button onClick={() => { setDsl(effectiveDsl); setMode('dsl'); }} className={cn('flex items-center gap-1.5 px-3 h-9 text-sm', mode === 'dsl' ? 'bg-accent text-white' : 'text-[var(--text-secondary)]')}>
                <Code2 size={14} /> DSL
              </button>
            </div>
          </div>
        }
      />

      {showBuckets && (
        <BucketsPanel runScope={runScope} meta={meta.data} onPin={addPin} />
      )}

      {pins.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">Pinned</span>
          {pins.map((p, i) => (
            <span key={`${p.token}=${p.value}`} className="flex items-center gap-1.5 rounded-full bg-accent/10 text-accent border border-accent/30 px-2.5 py-0.5 text-xs font-mono">
              {p.token} = "{p.value}"
              <button onClick={() => removePin(i)} className="hover:text-danger"><X size={12} /></button>
            </span>
          ))}
          <button onClick={() => { setPins([]); setData(null); }} className="text-xs text-[var(--text-muted)] hover:text-danger">clear all</button>
        </div>
      )}

      <Card className="p-4 mb-4">
        {mode === 'builder' ? (
          <QueryBuilder
            conditions={conditions}
            connective={connective}
            meta={meta.data}
            onChange={setConditions}
            onConnective={setConnective}
          />
        ) : (
          <div>
            <Input
              value={dsl}
              onChange={(e) => setDsl(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') run(1); }}
              placeholder='e.g. predicted.Ctry = DE AND gold.TwnNm contains "AM MAIN"'
              className="font-mono"
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {EXAMPLES.map((ex) => (
                <button key={ex} onClick={() => setDsl(ex)} className="rounded-full border border-[var(--border-subtle)] px-2.5 py-0.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-accent transition-colors font-mono">
                  {ex}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mt-3 flex items-center justify-between gap-3">
          <code className="text-xs text-[var(--text-muted)] font-mono truncate max-w-[60%]" title={effectiveDsl}>
            {effectiveDsl || '—'}
          </code>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                const name = window.prompt('Save filter as:');
                if (name) saveFilter.mutate(name);
              }}
            >
              <Bookmark size={14} /> Save
            </Button>
            <Button onClick={() => run(1)} disabled={search.isPending}>
              <Play size={14} /> Run search
            </Button>
          </div>
        </div>
      </Card>

      {error && <div className="alert-red rounded-lg px-3 py-2 text-sm mb-4">{error}</div>}
      {search.isPending && <Spinner />}

      {data && (
        <div className="grid grid-cols-[220px_1fr] gap-5">
          <Facets data={data} />
          <div>
            <div className="mb-2 text-sm text-[var(--text-muted)]">{data.total.toLocaleString()} matches</div>
            {data.results.length === 0 ? (
              <EmptyState title="No matches" description="Try loosening your query." />
            ) : (
              <>
                <ResultsTable rows={data.results} onRowClick={setSelected} selectedId={selected?.id} />
                <Pagination
                  page={page}
                  totalPages={Math.max(1, Math.ceil(data.total / PAGE_SIZE))}
                  total={data.total}
                  onChange={(p) => run(p)}
                />
              </>
            )}
          </div>
        </div>
      )}

      {selected && (
        <ResultDetailDrawer runId={selected.run_id} resultId={selected.id} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}

function Facets({ data }: { data: SearchResponse }) {
  if (!data.facets) return <div />;
  const group = (title: string, entries: Record<string, number>) => {
    const items = Object.entries(entries).sort((a, b) => b[1] - a[1]).slice(0, 12);
    if (!items.length) return null;
    return (
      <div className="mb-5">
        <div className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)] mb-2">{title}</div>
        <div className="space-y-1">
          {items.map(([k, v]) => (
            <div key={k} className="flex items-center justify-between text-sm">
              <span className="text-[var(--text-secondary)] truncate">{k}</span>
              <span className="text-[var(--text-muted)] tabular-nums">{v.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };
  return (
    <Card className="p-4 h-fit sticky top-0">
      {group('Status', data.facets.status)}
      {group('Country (gold)', data.facets.country)}
    </Card>
  );
}
