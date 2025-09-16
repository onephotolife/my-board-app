import type {
  SuggestResponse,
  SearchResponse,
  RecoResponse,
  HistoryResponse,
  HistoryAckResponse,
  ApiError,
} from '@/types/api/users';

async function apiGet<T>(url: string, init?: RequestInit): Promise<T | ApiError> {
  const res = await fetch(url, { credentials: 'include', ...(init || {}) });
  const data = await res.json();
  return data as T | ApiError;
}

async function apiPost<T>(url: string, body: unknown): Promise<T | ApiError> {
  const res = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return data as T | ApiError;
}

async function apiDelete<T>(url: string): Promise<T | ApiError> {
  const res = await fetch(url, { method: 'DELETE', credentials: 'include' });
  const data = await res.json();
  return data as T | ApiError;
}

export const UsersApi = {
  suggest: (q: string, limit?: number, init?: RequestInit) =>
    apiGet<SuggestResponse>(
      `/api/users/suggest?q=${encodeURIComponent(q)}${limit ? `&limit=${limit}` : ''}`,
      init
    ),
  search: (q: string, page = 1, limit?: number, init?: RequestInit) =>
    apiGet<SearchResponse>(
      `/api/users/search?q=${encodeURIComponent(q)}&page=${page}${limit ? `&limit=${limit}` : ''}`,
      init
    ),
  recommendations: (limit?: number) =>
    apiGet<RecoResponse>(`/api/users/recommendations${limit ? `?limit=${limit}` : ''}`),
  historyGet: () => apiGet<HistoryResponse>('/api/user/search-history'),
  historyAdd: (q: string) => apiPost<HistoryAckResponse>('/api/user/search-history', { q }),
  historyDelete: (q?: string) =>
    apiDelete<HistoryResponse>(`/api/user/search-history${q ? `?q=${encodeURIComponent(q)}` : ''}`),
};
