import type { ResultRow } from '~/lib/types';
import { StatusBadge } from '~/ui/primitives';
import { cn } from '~/lib/cn';

export function ResultsTable({
  rows,
  onRowClick,
  selectedId,
}: {
  rows: ResultRow[];
  onRowClick: (r: ResultRow) => void;
  selectedId?: string | null;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--border-default)]">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-[var(--text-muted)] border-b border-[var(--border-default)] bg-[var(--surface)]">
            <th className="px-4 py-2.5 font-medium">Status</th>
            <th className="px-4 py-2.5 font-medium">Input Address</th>
            <th className="px-4 py-2.5 font-medium">Country (G/A)</th>
            <th className="px-4 py-2.5 font-medium text-center">✓</th>
            <th className="px-4 py-2.5 font-medium text-center">✗</th>
            <th className="px-4 py-2.5 font-medium text-center">∅</th>
            <th className="px-4 py-2.5 font-medium text-center">+</th>
            <th className="px-4 py-2.5 font-medium text-right">ms</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.id}
              onClick={() => onRowClick(r)}
              className={cn(
                'border-b border-[var(--border-subtle)] cursor-pointer hover:bg-[var(--surface-raised)] transition-colors',
                selectedId === r.id && 'bg-[var(--surface-raised)]'
              )}
            >
              <td className="px-4 py-2.5"><StatusBadge status={r.status} /></td>
              <td className="px-4 py-2.5 max-w-[480px] truncate text-[var(--text-secondary)]" title={r.input_address ?? ''}>
                {r.input_address ?? '—'}
              </td>
              <td className="px-4 py-2.5 font-mono text-xs text-[var(--text-muted)]">
                {(r.country_gold ?? '—')} / {(r.country_algo ?? '—')}
              </td>
              <td className="px-4 py-2.5 text-center text-success">{r.n_correct}</td>
              <td className="px-4 py-2.5 text-center text-danger">{r.n_wrong}</td>
              <td className="px-4 py-2.5 text-center text-warning">{r.n_missing}</td>
              <td className="px-4 py-2.5 text-center text-info">{r.n_extra}</td>
              <td className="px-4 py-2.5 text-right text-xs text-[var(--text-muted)]">
                {r.execution_time_ms?.toFixed(1) ?? '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
