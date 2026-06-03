import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ChevronRight, LayoutList } from 'lucide-react';
import { api } from '~/lib/api';
import { Card } from '~/ui/Card';
import { PageHeader, EmptyState, Spinner } from '~/ui/primitives';

export default function RunListPage() {
  const runs = useQuery({ queryKey: ['runs'], queryFn: api.listRuns });

  return (
    <div>
      <PageHeader title="Eval Runs" subtitle="Imported evaluation runs. Open one to explore results." />

      {runs.isLoading && <Spinner />}
      {runs.data && runs.data.length === 0 && (
        <EmptyState
          title="No runs imported yet"
          description="Go to Imports and upload an exported Eval Run workbook."
          icon={<LayoutList size={28} />}
        />
      )}

      <div className="grid gap-3">
        {runs.data?.map((run) => {
          const f1 = run.status_counts;
          return (
            <Link key={run.id} to={`/runs/${run.id}`}>
              <Card className="px-5 py-4 hover:border-accent transition-colors">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="font-medium text-[var(--text-primary)] truncate">
                      {run.dataset_name ?? run.source_run_id}
                    </div>
                    <div className="mt-0.5 text-xs text-[var(--text-muted)]">
                      {run.run_type} · {run.status} · {run.total_results.toLocaleString()} results ·{' '}
                      {run.completed_at?.slice(0, 16).replace('T', ' ')}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <Counts counts={f1} />
                    <ChevronRight className="text-[var(--text-muted)]" size={18} />
                  </div>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function Counts({ counts }: { counts: Record<string, number> }) {
  const item = (label: string, value: number, color: string) => (
    <div className="text-center">
      <div className={`text-sm font-semibold ${color}`}>{(value ?? 0).toLocaleString()}</div>
      <div className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">{label}</div>
    </div>
  );
  return (
    <div className="flex items-center gap-4">
      {item('Passed', counts.PASSED ?? 0, 'text-success')}
      {item('Failed', counts.FAILED ?? 0, 'text-danger')}
      {item('Warning', counts.WARNING ?? 0, 'text-warning')}
    </div>
  );
}
