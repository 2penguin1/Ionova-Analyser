import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { CheckCircle2, FileSpreadsheet, Loader2, Upload, XCircle } from 'lucide-react';
import { api } from '~/lib/api';
import { Card } from '~/ui/Card';
import { Button } from '~/ui/Button';
import { PageHeader, EmptyState } from '~/ui/primitives';
import { cn } from '~/lib/cn';

export default function ImportsPage() {
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const imports = useQuery({
    queryKey: ['imports'],
    queryFn: api.listImports,
    refetchInterval: (q) =>
      (q.state.data ?? []).some((b) => b.status === 'PENDING' || b.status === 'PARSING') ? 1500 : false,
  });

  const upload = useMutation({
    mutationFn: (file: File) => api.uploadImport(file),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['imports'] });
      qc.invalidateQueries({ queryKey: ['runs'] });
    },
    onError: (e: Error) => setError(e.message),
  });

  function handleFiles(files: FileList | null) {
    setError(null);
    if (!files) return;
    for (const f of Array.from(files)) upload.mutate(f);
  }

  return (
    <div>
      <PageHeader
        title="Imports"
        subtitle="Upload exported Eval Run workbooks (.xlsx). Parsing runs in the background."
      />

      <Card
        className={cn(
          'border-dashed p-10 text-center cursor-pointer transition-colors',
          drag && 'border-accent bg-accent/5'
        )}
      >
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); handleFiles(e.dataTransfer.files); }}
        >
          <Upload className="mx-auto text-[var(--text-muted)]" size={32} />
          <p className="mt-3 text-sm font-medium text-[var(--text-secondary)]">
            Drag & drop .xlsx exports here, or click to browse
          </p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">Multiple files supported</p>
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xlsm"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>
      </Card>

      {(error || upload.isPending) && (
        <div className="mt-3 text-sm">
          {upload.isPending && (
            <span className="inline-flex items-center gap-2 text-[var(--text-muted)]">
              <Loader2 className="animate-spin" size={14} /> Uploading…
            </span>
          )}
          {error && <span className="text-danger">{error}</span>}
        </div>
      )}

      <h3 className="mt-8 mb-3">Import history</h3>
      {imports.data && imports.data.length === 0 ? (
        <EmptyState title="No imports yet" description="Uploaded workbooks will appear here." icon={<FileSpreadsheet size={28} />} />
      ) : (
        <div className="space-y-2">
          {imports.data?.map((b) => (
            <Card key={b.id} className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3 min-w-0">
                <FileSpreadsheet className="text-[var(--text-muted)] shrink-0" size={18} />
                <div className="min-w-0">
                  <div className="text-sm font-medium text-[var(--text-primary)] truncate">{b.filename}</div>
                  <div className="text-xs text-[var(--text-muted)]">
                    {b.row_counts ? `${(b.row_counts as any).results ?? '?'} results` : b.error_text ?? '—'}
                  </div>
                </div>
              </div>
              <StatusPill status={b.status} />
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  if (status === 'COMPLETED')
    return <span className="inline-flex items-center gap-1.5 text-xs text-success"><CheckCircle2 size={14} /> Completed</span>;
  if (status === 'FAILED')
    return <span className="inline-flex items-center gap-1.5 text-xs text-danger"><XCircle size={14} /> Failed</span>;
  return <span className="inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)]"><Loader2 className="animate-spin" size={14} /> {status}</span>;
}
