import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Bookmark, Play, Trash2 } from 'lucide-react';
import { api } from '~/lib/api';
import { Card } from '~/ui/Card';
import { Button } from '~/ui/Button';
import { EmptyState, PageHeader, Spinner } from '~/ui/primitives';

export default function SavedFiltersPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const filters = useQuery({ queryKey: ['saved-filters'], queryFn: api.listSavedFilters });
  const history = useQuery({ queryKey: ['search-history'], queryFn: () => fetch('/api/search-history?limit=30').then((r) => r.json()) });

  const del = useMutation({
    mutationFn: (id: string) => api.deleteSavedFilter(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['saved-filters'] }),
  });

  return (
    <div>
      <PageHeader title="Saved Filters" subtitle="Reusable queries and recent search history." />

      <div className="grid lg:grid-cols-2 gap-6">
        <div>
          <h3 className="mb-3">Saved filters</h3>
          {filters.isLoading && <Spinner />}
          {filters.data && filters.data.length === 0 && (
            <EmptyState title="No saved filters" description="Save a query from the Search page." icon={<Bookmark size={26} />} />
          )}
          <div className="space-y-2">
            {filters.data?.map((f) => (
              <Card key={f.id} className="flex items-center justify-between px-4 py-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-[var(--text-primary)]">{f.name}</div>
                  <code className="text-xs text-[var(--text-muted)] font-mono truncate block max-w-[360px]">{f.dsl}</code>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Button size="sm" variant="secondary" onClick={() => navigate(`/search?dsl=${encodeURIComponent(f.dsl ?? '')}`)}>
                    <Play size={13} /> Run
                  </Button>
                  <button onClick={() => del.mutate(f.id)} className="text-[var(--text-muted)] hover:text-danger p-1.5">
                    <Trash2 size={15} />
                  </button>
                </div>
              </Card>
            ))}
          </div>
        </div>

        <div>
          <h3 className="mb-3">Recent searches</h3>
          <div className="space-y-1.5">
            {(history.data ?? []).map((h: any) => (
              <div
                key={h.id}
                onClick={() => h.dsl && navigate(`/search?dsl=${encodeURIComponent(h.dsl)}`)}
                className="flex items-center justify-between rounded-lg border border-[var(--border-subtle)] px-3 py-2 text-sm cursor-pointer hover:border-accent transition-colors"
              >
                <code className="font-mono text-xs text-[var(--text-secondary)] truncate">{h.dsl ?? '(ast query)'}</code>
                <span className="text-xs text-[var(--text-muted)] shrink-0 ml-2">{h.result_count?.toLocaleString()} hits</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
