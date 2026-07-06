import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Layers, Pin } from 'lucide-react';
import { api } from '~/lib/api';
import { Card } from '~/ui/Card';
import { Select, Spinner } from '~/ui/primitives';
import type { MetaFields } from '~/lib/types';

export interface BucketPin {
  token: string; // e.g. gold.CtrySubDvsn
  value: string;
}

const SIDES = [
  { value: 'gold', label: 'Gold (expected)' },
  { value: 'predicted', label: 'Predicted (algo)' },
  { value: 'verdict', label: 'Verdict' },
];

/**
 * Buckets: pick a field side + field, list every distinct value with its count
 * *within the current query's result set*. Clicking a value pins it as a locked
 * filter that ANDs into all later searches.
 */
export function BucketsPanel({
  runScope,
  queryDsl,
  meta,
  onPin,
}: {
  runScope: string;
  /** The query the buckets are scoped to; empty → whole run (global). */
  queryDsl: string;
  meta?: MetaFields;
  onPin: (pin: BucketPin) => void;
}) {
  const [side, setSide] = useState('gold');
  const [field, setField] = useState('CtrySubDvsn');
  const token = `${side}.${field}`;

  const facets = useQuery({
    queryKey: ['facets', runScope, token, queryDsl],
    queryFn: () => api.queryFacets({ field: token, dsl: queryDsl, run_id: runScope }),
    enabled: !!runScope,
  });

  return (
    <Card className="p-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <Layers size={15} className="text-accent" />
        <span className="text-sm font-medium">Buckets</span>
        <span className="text-xs text-[var(--text-muted)]">
          {queryDsl ? "group this query's values" : "group the run's values"}, click to pin as a fixed filter
        </span>
        <div className="ml-auto flex items-center gap-2">
          <Select value={side} onChange={(e) => setSide(e.target.value)} className="h-8 text-xs">
            {SIDES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </Select>
          <Select value={field} onChange={(e) => setField(e.target.value)} className="h-8 text-xs">
            {(meta?.fields ?? ['Ctry']).map((f) => <option key={f} value={f}>{f}</option>)}
          </Select>
        </div>
      </div>

      {!runScope ? (
        <div className="text-sm text-[var(--text-muted)]">Select a single run (not “All runs”) to browse buckets.</div>
      ) : facets.isLoading ? (
        <Spinner />
      ) : facets.isError ? (
        <div className="text-sm text-danger">{(facets.error as Error).message}</div>
      ) : !facets.data?.buckets.length ? (
        <div className="text-sm text-[var(--text-muted)]">No values for this field in {queryDsl ? 'this query' : 'this run'}.</div>
      ) : (
        <div className="max-h-56 overflow-y-auto grid grid-cols-2 gap-x-4 gap-y-0.5 md:grid-cols-3">
          {facets.data.buckets.map((b) => (
            <button
              key={b.value}
              onClick={() => onPin({ token, value: b.value })}
              title={`Pin ${token} = "${b.value}"`}
              className="group flex items-center justify-between gap-2 rounded px-2 py-1 text-sm hover:bg-[var(--surface-raised)] text-left"
            >
              <span className="flex items-center gap-1.5 truncate text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]">
                <Pin size={11} className="opacity-0 group-hover:opacity-60 shrink-0" />
                <span className="truncate">{b.value}</span>
              </span>
              <span className="text-[var(--text-muted)] tabular-nums shrink-0">{b.count.toLocaleString()}</span>
            </button>
          ))}
        </div>
      )}
    </Card>
  );
}
