import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Search as SearchIcon } from 'lucide-react';
import { api } from '~/lib/api';
import { Card } from '~/ui/Card';
import { Button } from '~/ui/Button';
import { MetricCard, PageHeader, Select, Spinner, VERDICT_STYLE } from '~/ui/primitives';
import { ResultsTable } from '~/components/ResultsTable';
import { ResultDetailDrawer } from '~/components/ResultDetailDrawer';
import { cn } from '~/lib/cn';
import type { FieldMetric, ResultRow } from '~/lib/types';

const STATUSES = ['', 'FAILED', 'WARNING', 'PASSED', 'ERROR'];
const PAGE_SIZE = 50;

function num(v: unknown): string {
  if (v === null || v === undefined) return '—';
  return typeof v === 'number' ? v.toLocaleString() : String(v);
}

export default function RunDetailPage() {
  const { runId } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('');
  const [country, setCountry] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<ResultRow | null>(null);

  const run = useQuery({ queryKey: ['run', runId], queryFn: () => api.getRun(runId!), enabled: !!runId });
  const countries = useQuery({ queryKey: ['countries', runId], queryFn: () => api.availableCountries(runId!), enabled: !!runId });
  const results = useQuery({
    queryKey: ['results', runId, status, country, page],
    queryFn: () => api.listResults(runId!, { status: status || undefined, country: country || undefined, page, page_size: PAGE_SIZE }),
    enabled: !!runId,
  });

  const summary = run.data?.summary ?? {};
  const totalPages = results.data ? Math.max(1, Math.ceil(results.data.total / PAGE_SIZE)) : 1;

  const goSearch = (dsl: string) =>
    navigate(`/search?run=${runId}&dsl=${encodeURIComponent(dsl)}`);

  return (
    <div>
      <Link to="/runs" className="inline-flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] mb-3">
        <ArrowLeft size={15} /> All runs
      </Link>

      <PageHeader
        title={run.data?.dataset_name ?? 'Run'}
        subtitle={run.data ? `${run.data.run_type} · ${run.data.status} · ${run.data.total_results.toLocaleString()} results` : undefined}
        actions={
          <Button variant="secondary" onClick={() => goSearch('predicted.Ctry != gold.Ctry')}>
            <SearchIcon size={15} /> Advanced search
          </Button>
        }
      />

      {run.isLoading && <Spinner />}

      {run.data && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
            <MetricCard label="Precision" value={num(summary['Overall Precision'])} />
            <MetricCard label="Recall" value={num(summary['Overall Recall'])} />
            <MetricCard label="F1" value={num(summary['Overall F1'])} accent="default" />
            <MetricCard label="Failed" value={num(run.data.status_counts.FAILED ?? 0)} accent="danger" />
            <MetricCard label="Warning" value={num(run.data.status_counts.WARNING ?? 0)} accent="warning" />
            <MetricCard label="Avg ms" value={num(summary['Avg Latency (ms)'])} />
          </div>

          {/* Field metrics */}
          <h3 className="mb-3">Field metrics</h3>
          <FieldMetricsTable metrics={run.data.field_metrics} onCell={goSearch} />

          {/* Results */}
          <div className="flex items-center justify-between mt-8 mb-3">
            <h3>Results</h3>
            <div className="flex items-center gap-2">
              <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
                {STATUSES.map((s) => <option key={s} value={s}>{s || 'All statuses'}</option>)}
              </Select>
              <Select value={country} onChange={(e) => { setCountry(e.target.value); setPage(1); }}>
                <option value="">All countries</option>
                {countries.data?.map((c) => <option key={c} value={c}>{c}</option>)}
              </Select>
            </div>
          </div>

          {results.isLoading ? <Spinner /> : (
            <>
              <ResultsTable rows={results.data?.results ?? []} onRowClick={setSelected} selectedId={selected?.id} />
              <Pagination page={page} totalPages={totalPages} total={results.data?.total ?? 0} onChange={setPage} />
            </>
          )}
        </>
      )}

      {selected && runId && (
        <ResultDetailDrawer runId={runId} resultId={selected.id} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}

function FieldMetricsTable({ metrics, onCell }: { metrics: FieldMetric[]; onCell: (dsl: string) => void }) {
  const cell = (field: string, verdict: 'Wrong' | 'Missing' | 'Extra', value: number, color: string) => (
    <td
      className={cn('px-4 py-2 text-center cursor-pointer hover:underline', color)}
      onClick={() => onCell(`verdict.${field} = ${verdict}`)}
      title={`Search ${field} = ${verdict}`}
    >
      {value.toLocaleString()}
    </td>
  );
  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--border-default)]">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-[var(--text-muted)] border-b border-[var(--border-default)] bg-[var(--surface)]">
            <th className="px-4 py-2.5 font-medium">Field</th>
            <th className="px-4 py-2.5 font-medium text-center">Correct</th>
            <th className="px-4 py-2.5 font-medium text-center">Extra</th>
            <th className="px-4 py-2.5 font-medium text-center">Missing</th>
            <th className="px-4 py-2.5 font-medium text-center">Wrong</th>
            <th className="px-4 py-2.5 font-medium text-center">Total</th>
            <th className="px-4 py-2.5 font-medium text-right">Accuracy</th>
          </tr>
        </thead>
        <tbody>
          {metrics.map((m) => (
            <tr key={m.field_name} className="border-b border-[var(--border-subtle)]">
              <td className="px-4 py-2 ionova-field-key">{m.field_name}</td>
              <td className="px-4 py-2 text-center text-success">{m.correct.toLocaleString()}</td>
              {cell(m.field_name, 'Extra', m.extra, 'text-info')}
              {cell(m.field_name, 'Missing', m.missing, 'text-warning')}
              {cell(m.field_name, 'Wrong', m.wrong, 'text-danger')}
              <td className="px-4 py-2 text-center text-[var(--text-secondary)]">{m.total.toLocaleString()}</td>
              <td className="px-4 py-2 text-right text-[var(--text-secondary)]">
                {m.accuracy !== null ? `${(m.accuracy * 100).toFixed(1)}%` : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Pagination({ page, totalPages, total, onChange }: { page: number; totalPages: number; total: number; onChange: (p: number) => void }) {
  return (
    <div className="flex items-center justify-between mt-3 text-sm text-[var(--text-muted)]">
      <span>{total.toLocaleString()} results</span>
      <div className="flex items-center gap-2">
        <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>Prev</Button>
        <span>Page {page} / {totalPages}</span>
        <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>Next</Button>
      </div>
    </div>
  );
}
