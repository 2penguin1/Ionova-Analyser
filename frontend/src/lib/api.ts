import type {
  CountryAnalytics,
  ErrorCluster,
  EvalRunDetail,
  FieldFacets,
  EvalRunListItem,
  ImportBatch,
  MetaFields,
  ResultDetail,
  ResultsPage,
  SavedFilter,
  SearchResponse,
} from '~/lib/types';

const BASE = '/api';

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    ...init,
  });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail ?? detail;
    } catch { /* ignore */ }
    throw new Error(detail);
  }
  return res.json() as Promise<T>;
}

export const api = {
  meta: () => http<MetaFields>('/meta/fields'),

  listRuns: () => http<EvalRunListItem[]>('/runs'),
  getRun: (id: string) => http<EvalRunDetail>(`/runs/${id}`),
  deleteRun: (id: string) => http<{ deleted: string }>(`/runs/${id}`, { method: 'DELETE' }),

  listResults: (
    runId: string,
    params: { status?: string; country?: string; page?: number; page_size?: number; sort_by?: string; sort_order?: string }
  ) => {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') q.set(k, String(v)); });
    return http<ResultsPage>(`/runs/${runId}/results?${q.toString()}`);
  },
  getResult: (runId: string, resultId: string) =>
    http<ResultDetail>(`/runs/${runId}/results/${resultId}`),

  availableCountries: (runId: string) => http<string[]>(`/runs/${runId}/available-countries`),

  facets: (runId: string, field: string, limit = 300) =>
    http<FieldFacets>(`/runs/${runId}/facets?field=${encodeURIComponent(field)}&limit=${limit}`),

  // Buckets scoped to the current query — empty dsl falls back to the whole run.
  queryFacets: (body: { field: string; dsl?: string; run_id?: string | null; limit?: number }) =>
    http<FieldFacets>('/search/facets', { method: 'POST', body: JSON.stringify(body) }),

  countryAnalytics: (runId: string) => http<CountryAnalytics[]>(`/runs/${runId}/analytics/country`),
  errorClusters: (runId: string, limit = 25) => http<ErrorCluster[]>(`/runs/${runId}/analytics/clusters?limit=${limit}`),

  search: (body: {
    dsl?: string; ast?: unknown; run_id?: string | null;
    page?: number; page_size?: number; sort_by?: string; sort_order?: string;
    with_facets?: boolean; save_history?: boolean;
  }) => http<SearchResponse>('/search', { method: 'POST', body: JSON.stringify(body) }),

  parse: (dsl: string) => http<{ ast: unknown }>('/search/parse', { method: 'POST', body: JSON.stringify({ dsl }) }),

  listImports: () => http<ImportBatch[]>('/imports'),
  getImport: (id: string) => http<ImportBatch>(`/imports/${id}`),
  uploadImport: async (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch(`${BASE}/imports`, { method: 'POST', body: fd });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).detail ?? 'Upload failed');
    return res.json() as Promise<{ import_id: string; status: string }>;
  },

  listSavedFilters: () => http<SavedFilter[]>('/saved-filters'),
  createSavedFilter: (body: { name: string; dsl?: string; ast?: unknown }) =>
    http<SavedFilter>('/saved-filters', { method: 'POST', body: JSON.stringify(body) }),
  deleteSavedFilter: (id: string) => http<{ deleted: string }>(`/saved-filters/${id}`, { method: 'DELETE' }),
};
