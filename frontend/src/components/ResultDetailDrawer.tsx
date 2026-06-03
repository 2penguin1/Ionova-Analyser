import { useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { api } from '~/lib/api';
import { Spinner, StatusBadge, VERDICT_STYLE } from '~/ui/primitives';
import { cn } from '~/lib/cn';

export function ResultDetailDrawer({
  runId,
  resultId,
  onClose,
}: {
  runId: string;
  resultId: string;
  onClose: () => void;
}) {
  const detail = useQuery({
    queryKey: ['result', runId, resultId],
    queryFn: () => api.getResult(runId, resultId),
  });

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        className="relative z-50 h-full w-full max-w-[720px] overflow-y-auto border-l border-[var(--border-default)] bg-[var(--surface)] animate-slide-in-right"
        style={{ boxShadow: 'var(--shadow-elevated)' }}
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-[var(--border-default)] bg-[var(--surface)] px-5 py-3">
          <div className="flex items-center gap-3">
            <h3 className="text-base">Record detail</h3>
            {detail.data && <StatusBadge status={detail.data.status} />}
          </div>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
            <X size={20} />
          </button>
        </div>

        {detail.isLoading && <div className="p-6"><Spinner /></div>}

        {detail.data && (
          <div className="p-5 space-y-5">
            <section>
              <div className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)] mb-1">
                Original address
              </div>
              <div className="ionova-data-panel p-3 font-mono text-sm whitespace-pre-wrap break-words">
                {detail.data.input_address ?? '—'}
              </div>
            </section>

            <section>
              <div className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)] mb-2">
                Prediction vs Gold — field diff
              </div>
              <div className="overflow-hidden rounded-xl border border-[var(--border-default)]">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wide text-[var(--text-muted)] border-b border-[var(--border-default)] bg-[var(--surface-raised)]">
                      <th className="px-3 py-2 font-medium">Field</th>
                      <th className="px-3 py-2 font-medium">Gold</th>
                      <th className="px-3 py-2 font-medium">Algo</th>
                      <th className="px-3 py-2 font-medium text-right">Verdict</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.data.fields
                      .filter((f) => f.gold || f.algo)
                      .map((f) => (
                        <tr key={f.field} className="border-b border-[var(--border-subtle)]">
                          <td className="px-3 py-2 ionova-field-key">{f.field}</td>
                          <td className="px-3 py-2 text-[var(--text-secondary)]">{f.gold ?? <span className="text-[var(--text-muted)]">—</span>}</td>
                          <td className="px-3 py-2 text-[var(--text-secondary)]">{f.algo ?? <span className="text-[var(--text-muted)]">—</span>}</td>
                          <td className={cn('px-3 py-2 text-right text-xs font-semibold', VERDICT_STYLE[f.verdict ?? 'Empty'])}>
                            {f.verdict}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="grid grid-cols-2 gap-3 text-xs text-[var(--text-muted)]">
              <div><span className="font-medium">Result ID:</span> <span className="font-mono">{detail.data.source_result_id}</span></div>
              <div><span className="font-medium">Entry ID:</span> <span className="font-mono">{detail.data.source_entry_id}</span></div>
              <div><span className="font-medium">Exec time:</span> {detail.data.execution_time_ms?.toFixed(2)} ms</div>
              <div><span className="font-medium">Hash:</span> <span className="font-mono">{detail.data.address_hash?.slice(0, 16)}…</span></div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
