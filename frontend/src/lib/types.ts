export interface RunSummaryMap { [k: string]: string | number | null }

export interface EvalRunListItem {
  id: string;
  source_run_id: string;
  dataset_name: string | null;
  run_type: string | null;
  status: string | null;
  initiated_by: string | null;
  started_at: string | null;
  completed_at: string | null;
  algorithm_version: string | null;
  created_at: string | null;
  status_counts: Record<string, number>;
  total_results: number;
}

export interface FieldMetric {
  field_name: string;
  correct: number;
  extra: number;
  missing: number;
  wrong: number;
  total: number;
  accuracy: number | null;
}

export interface EvalRunDetail extends EvalRunListItem {
  summary: RunSummaryMap | null;
  field_metrics: FieldMetric[];
}

export interface ResultRow {
  id: string;
  run_id: string;
  source_result_id: string | null;
  source_entry_id: string | null;
  status: string | null;
  execution_time_ms: number | null;
  input_address: string | null;
  country_gold: string | null;
  country_algo: string | null;
  n_correct: number;
  n_wrong: number;
  n_missing: number;
  n_extra: number;
}

export interface FieldDiff {
  field: string;
  gold: string | null;
  algo: string | null;
  verdict: string | null;
}

export interface ResultDetail extends ResultRow {
  address_hash: string | null;
  input_address_raw: string | null;
  run_id: string;
  fields: FieldDiff[];
}

export interface ResultsPage {
  total: number;
  page: number;
  page_size: number;
  results: ResultRow[];
}

export interface FieldFacets {
  field: string;
  buckets: { value: string; count: number }[];
}

export interface SearchFacets {
  status: Record<string, number>;
  country: Record<string, number>;
}

export interface SearchResponse {
  total: number;
  page: number;
  page_size: number;
  facets: SearchFacets | null;
  ast: unknown;
  results: ResultRow[];
}

export interface ImportBatch {
  id: string;
  filename: string;
  status: string;
  error_text: string | null;
  row_counts: Record<string, unknown> | null;
  created_at: string | null;
}

export interface SavedFilter {
  id: string;
  name: string;
  dsl: string | null;
  ast: unknown;
  created_at: string | null;
}

export interface MetaFields {
  fields: string[];
  verdicts: string[];
  namespaces: string[];
  operators: { op: string; label: string; symbol: string }[];
  nl_enabled: boolean;
}

export interface CountryAnalytics {
  country: string;
  total: number;
  correct_fields: number;
  wrong_fields: number;
  missing_fields: number;
  extra_fields: number;
  field_accuracy: number | null;
}

export interface ErrorCluster {
  pattern: string;
  fields: string[];
  count: number;
}
