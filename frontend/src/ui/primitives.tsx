import { cn } from '~/lib/cn';
import { Loader2 } from 'lucide-react';
import type { ReactNode, InputHTMLAttributes, SelectHTMLAttributes } from 'react';
import { Badge, type BadgeVariant } from '~/ui/Badge';

/* PageHeader — title + subtitle + actions, matching IoNova layout. */
export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div>
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-[var(--text-muted)]">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn('animate-spin text-[var(--text-muted)]', className)} />;
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'h-9 w-full rounded-lg border border-[var(--border-default)] bg-[var(--input-bg)] px-3 text-sm',
        'text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none',
        'focus:border-accent focus:ring-2 focus:ring-accent/30 transition-colors',
        className
      )}
      {...props}
    />
  );
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        'h-9 rounded-lg border border-[var(--border-default)] bg-[var(--input-bg)] px-2.5 text-sm',
        'text-[var(--text-primary)] outline-none focus:border-accent focus:ring-2 focus:ring-accent/30',
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export function EmptyState({ title, description, icon }: { title: string; description?: string; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {icon && <div className="mb-3 text-[var(--text-muted)]">{icon}</div>}
      <p className="text-base font-medium text-[var(--text-secondary)]">{title}</p>
      {description && <p className="mt-1 text-sm text-[var(--text-muted)] max-w-md">{description}</p>}
    </div>
  );
}

/* MetricCard — number + label, used on summary panels. */
export function MetricCard({
  label,
  value,
  sub,
  accent,
  onClick,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  accent?: 'success' | 'danger' | 'warning' | 'default';
  onClick?: () => void;
}) {
  const accentColor =
    accent === 'success' ? 'text-success'
    : accent === 'danger' ? 'text-danger'
    : accent === 'warning' ? 'text-warning'
    : 'text-[var(--text-primary)]';
  return (
    <div
      onClick={onClick}
      className={cn(
        'rounded-xl border border-[var(--border-default)] bg-[var(--surface)] px-4 py-3',
        onClick && 'cursor-pointer hover:border-accent transition-colors'
      )}
      style={{ boxShadow: 'var(--shadow-card)' }}
    >
      <div className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">{label}</div>
      <div className={cn('mt-1 text-2xl font-semibold', accentColor)}>{value}</div>
      {sub && <div className="mt-0.5 text-xs text-[var(--text-muted)]">{sub}</div>}
    </div>
  );
}

/* Status + verdict color helpers — mirror IoNova's PASSED/FAILED/WARNING/ERROR. */
const STATUS_VARIANT: Record<string, BadgeVariant> = {
  PASSED: 'success',
  FAILED: 'danger',
  WARNING: 'warning',
  ERROR: 'default',
};

export function StatusBadge({ status }: { status?: string | null }) {
  const s = status ?? 'UNKNOWN';
  return <Badge variant={STATUS_VARIANT[s] ?? 'default'}>{s}</Badge>;
}

export const VERDICT_STYLE: Record<string, string> = {
  Correct: 'text-success',
  Wrong: 'text-danger',
  Missing: 'text-warning',
  Extra: 'text-info',
  Empty: 'text-[var(--text-muted)]',
};

export function VerdictTag({ verdict }: { verdict?: string | null }) {
  const v = verdict ?? 'Empty';
  return <span className={cn('text-xs font-semibold', VERDICT_STYLE[v] ?? '')}>{v}</span>;
}
