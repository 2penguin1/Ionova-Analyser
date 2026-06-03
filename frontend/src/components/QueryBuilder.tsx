import { Plus, Trash2 } from 'lucide-react';
import { Button } from '~/ui/Button';
import { Input, Select } from '~/ui/primitives';
import type { MetaFields } from '~/lib/types';

export interface Condition {
  namespace: string; // address | predicted | gold | verdict | status | country
  field: string;     // SWIFT field (when namespace is predicted/gold/verdict)
  op: string;        // eq | neq | contains | startswith | endswith | regex | empty | notempty
  value: string;
  ci: boolean;
  negate: boolean;
}

export const NAMESPACES = [
  { value: 'address', label: 'Address text' },
  { value: 'predicted', label: 'Predicted (algo)' },
  { value: 'gold', label: 'Gold (expected)' },
  { value: 'verdict', label: 'Verdict' },
  { value: 'status', label: 'Status' },
  { value: 'country', label: 'Country (gold)' },
];

const OPS = [
  { value: 'eq', label: '=' },
  { value: 'neq', label: '≠' },
  { value: 'contains', label: 'contains' },
  { value: 'startswith', label: 'starts with' },
  { value: 'endswith', label: 'ends with' },
  { value: 'regex', label: 'regex' },
  { value: 'empty', label: 'is empty' },
  { value: 'notempty', label: 'is not empty' },
];

export function emptyCondition(): Condition {
  return { namespace: 'predicted', field: 'Ctry', op: 'eq', value: '', ci: false, negate: false };
}

function needsField(ns: string) {
  return ns === 'predicted' || ns === 'gold' || ns === 'verdict';
}
function needsValue(op: string) {
  return op !== 'empty' && op !== 'notempty';
}

/** Compile builder state into a DSL string (the single source of truth on the backend). */
export function conditionsToDsl(conds: Condition[], connective: 'AND' | 'OR'): string {
  const parts = conds
    // Drop incomplete rows: value-requiring ops with no value yet would compile
    // to `field = ""` and be rejected by the backend.
    .filter((c) => !needsValue(c.op) || c.value.trim() !== '')
    .map((c) => {
      const fieldTok =
        c.namespace === 'address' ? 'address'
        : c.namespace === 'status' ? 'status'
        : c.namespace === 'country' ? 'country'
        : `${c.namespace}.${c.field}`;

      if (c.op === 'empty' || c.op === 'notempty') {
        const expr = `${fieldTok} ${c.op}`;
        return c.negate ? `NOT (${expr})` : expr;
      }

      const opTok =
        c.op === 'eq' ? (c.ci ? '~=' : '=')
        : c.op === 'neq' ? '!='
        : c.op === 'regex' ? (c.ci ? 'iregex' : 'regex')
        : c.op; // contains/startswith/endswith

      const v = `"${c.value.replace(/"/g, '\\"')}"`;
      const expr = `${fieldTok} ${opTok} ${v}`;
      return c.negate ? `NOT (${expr})` : expr;
    })
    .filter(Boolean);
  return parts.join(` ${connective} `);
}

export function QueryBuilder({
  conditions,
  connective,
  meta,
  onChange,
  onConnective,
}: {
  conditions: Condition[];
  connective: 'AND' | 'OR';
  meta?: MetaFields;
  onChange: (c: Condition[]) => void;
  onConnective: (c: 'AND' | 'OR') => void;
}) {
  const update = (i: number, patch: Partial<Condition>) =>
    onChange(conditions.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  const remove = (i: number) => onChange(conditions.filter((_, idx) => idx !== i));
  const add = () => onChange([...conditions, emptyCondition()]);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
        <span>Match</span>
        <Select value={connective} onChange={(e) => onConnective(e.target.value as 'AND' | 'OR')} className="h-7 text-xs">
          <option value="AND">ALL (AND)</option>
          <option value="OR">ANY (OR)</option>
        </Select>
        <span>of the following</span>
      </div>

      {conditions.map((c, i) => (
        <div key={i} className="flex flex-wrap items-center gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface)] p-2">
          <label className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
            <input type="checkbox" checked={c.negate} onChange={(e) => update(i, { negate: e.target.checked })} />
            NOT
          </label>

          <Select value={c.namespace} onChange={(e) => update(i, { namespace: e.target.value })} className="h-8 text-xs">
            {NAMESPACES.map((n) => <option key={n.value} value={n.value}>{n.label}</option>)}
          </Select>

          {needsField(c.namespace) && (
            <Select value={c.field} onChange={(e) => update(i, { field: e.target.value })} className="h-8 text-xs">
              {(meta?.fields ?? ['Ctry']).map((f) => <option key={f} value={f}>{f}</option>)}
            </Select>
          )}

          <Select value={c.op} onChange={(e) => update(i, { op: e.target.value })} className="h-8 text-xs">
            {OPS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </Select>

          {needsValue(c.op) && (
            c.namespace === 'verdict' ? (
              <Select value={c.value} onChange={(e) => update(i, { value: e.target.value })} className="h-8 text-xs">
                <option value="">—</option>
                {(meta?.verdicts ?? ['Correct', 'Wrong', 'Missing', 'Extra', 'Empty']).map((v) => <option key={v} value={v}>{v}</option>)}
              </Select>
            ) : (
              <Input
                value={c.value}
                onChange={(e) => update(i, { value: e.target.value })}
                placeholder="value"
                className="h-8 w-44 text-xs"
              />
            )
          )}

          {(c.op === 'eq' || c.op === 'contains' || c.op === 'startswith' || c.op === 'endswith' || c.op === 'regex') && (
            <label className="flex items-center gap-1 text-xs text-[var(--text-muted)]" title="Case-insensitive">
              <input type="checkbox" checked={c.ci} onChange={(e) => update(i, { ci: e.target.checked })} />
              Aa
            </label>
          )}

          <button onClick={() => remove(i)} className="ml-auto text-[var(--text-muted)] hover:text-danger">
            <Trash2 size={15} />
          </button>
        </div>
      ))}

      <Button variant="secondary" size="sm" onClick={add}>
        <Plus size={14} /> Add condition
      </Button>
    </div>
  );
}
