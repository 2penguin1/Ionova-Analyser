import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { api } from '~/lib/api';
import { Card } from '~/ui/Card';
import { EmptyState, PageHeader, Select, Spinner } from '~/ui/primitives';
import { cn } from '~/lib/cn';

export default function AnalyticsPage() {
  const runs = useQuery({ queryKey: ['runs'], queryFn: api.listRuns });
  const [runId, setRunId] = useState('');

  useEffect(() => {
    if (!runId && runs.data && runs.data.length) setRunId(runs.data[0].id);
  }, [runs.data, runId]);

  const country = useQuery({ queryKey: ['an-country', runId], queryFn: () => api.countryAnalytics(runId), enabled: !!runId });
  const clusters = useQuery({ queryKey: ['an-clusters', runId], queryFn: () => api.errorClusters(runId, 20), enabled: !!runId });

  return (
    <div>
      <PageHeader
        title="Analytics"
        subtitle="Country-level accuracy and frequent error patterns."
        actions={
          <Select value={runId} onChange={(e) => setRunId(e.target.value)}>
            {runs.data?.map((r) => <option key={r.id} value={r.id}>{r.dataset_name ?? r.source_run_id}</option>)}
          </Select>
        }
      />

      {!runId && <EmptyState title="No run selected" description="Import a run to see analytics." />}

      {runId && (
        <div className="grid lg:grid-cols-2 gap-6">
          <div>
            <h3 className="mb-3">Country accuracy</h3>
            {country.isLoading ? <Spinner /> : (
              <div className="overflow-x-auto rounded-xl border border-[var(--border-default)]">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wide text-[var(--text-muted)] border-b border-[var(--border-default)] bg-[var(--surface)]">
                      <th className="px-4 py-2.5 font-medium">Country</th>
                      <th className="px-4 py-2.5 font-medium text-center">Records</th>
                      <th className="px-4 py-2.5 font-medium text-right">Field accuracy</th>
                    </tr>
                  </thead>
                  <tbody>
                    {country.data?.map((c) => (
                      <tr key={c.country} className="border-b border-[var(--border-subtle)]">
                        <td className="px-4 py-2 font-mono">{c.country}</td>
                        <td className="px-4 py-2 text-center text-[var(--text-secondary)]">{c.total.toLocaleString()}</td>
                        <td className="px-4 py-2 text-right">
                          {c.field_accuracy !== null ? (
                            <span className={cn(c.field_accuracy >= 0.9 ? 'text-success' : c.field_accuracy >= 0.7 ? 'text-warning' : 'text-danger')}>
                              {(c.field_accuracy * 100).toFixed(1)}%
                            </span>
                          ) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div>
            <h3 className="mb-3">Frequent error patterns</h3>
            <p className="text-xs text-[var(--text-muted)] mb-2">Sets of fields that fail together (Wrong or Missing).</p>
            {clusters.isLoading ? <Spinner /> : (
              <div className="space-y-2">
                {clusters.data?.map((cl) => (
                  <Card key={cl.pattern} className="flex items-center justify-between px-4 py-2.5">
                    <div className="flex flex-wrap gap-1.5">
                      {cl.fields.map((f) => (
                        <span key={f} className="rounded-full bg-[var(--surface-raised)] px-2 py-0.5 text-xs ionova-field-key">{f}</span>
                      ))}
                    </div>
                    <span className="text-sm font-semibold text-[var(--text-secondary)] tabular-nums">{cl.count.toLocaleString()}</span>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
