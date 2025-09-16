import { normalizeJa } from '@/lib/search/ja-normalize';
import type { HistoryItem, RecoItem, SearchItem, SuggestItem } from '@/types/api/users';

const demoUsers: Array<SearchItem> = [
  {
    id: 'u1',
    displayName: 'テスト 太郎',
    avatarUrl: null,
    bio: '検索API検証ユーザー',
    score: 4.9,
    followerCount: 120,
  },
  {
    id: 'u2',
    displayName: 'ヤマギシ ヨシタカ',
    avatarUrl: null,
    bio: 'バックエンド開発者',
    score: 4.5,
    followerCount: 64,
  },
  {
    id: 'u3',
    displayName: 'やまぎし よしたか',
    avatarUrl: null,
    bio: 'フロントエンド好き',
    score: 4.1,
    followerCount: 32,
  },
];

let historyStore: HistoryItem[] = [
  {
    q: 'やま',
    normalizedQ: normalizeJa('やま'),
    count: 1,
    lastSearchedAt: new Date().toISOString(),
  },
];

export function isTestBypass(headers: Headers): boolean {
  const envFlag = String(process.env.AUTH_BYPASS_FOR_TESTS || '0') === '1';
  const headerFlag = (headers.get('x-test-auth') || '').trim() === '1';
  if (process.env.NODE_ENV === 'production') {
    return false;
  }
  return envFlag || headerFlag;
}

export function testSuggest(query: string, limit: number): SuggestItem[] {
  const normalized = normalizeJa(query);
  return demoUsers
    .filter((user) => normalizeJa(user.displayName).includes(normalized))
    .slice(0, limit)
    .map(({ id, displayName, avatarUrl }) => ({ id, displayName, avatarUrl }));
}

export function testSearch(query: string, page: number, limit: number): SearchItem[] {
  const normalized = normalizeJa(query);
  const matched = demoUsers.filter((user) => normalizeJa(user.displayName).includes(normalized));
  const start = (Math.max(1, page) - 1) * limit;
  return matched.slice(start, start + limit);
}

export function testRecommendations(limit: number): RecoItem[] {
  return demoUsers.slice(0, limit).map(({ id, displayName, avatarUrl, followerCount }) => ({
    id,
    displayName,
    avatarUrl,
    followerCount,
  }));
}

export function getTestHistory(): HistoryItem[] {
  return historyStore.map((item) => ({ ...item }));
}

export function addTestHistory(query: string): void {
  const normalized = normalizeJa(query);
  const existing = historyStore.find((item) => item.normalizedQ === normalized);
  const timestamp = new Date().toISOString();
  if (existing) {
    existing.count += 1;
    existing.lastSearchedAt = timestamp;
  } else {
    historyStore = [
      { q: query, normalizedQ: normalized, count: 1, lastSearchedAt: timestamp },
      ...historyStore,
    ].slice(0, 50);
  }
}

export function deleteTestHistory(query?: string): void {
  if (!query) {
    historyStore = [];
    return;
  }
  const normalized = normalizeJa(query);
  historyStore = historyStore.filter((item) => item.normalizedQ !== normalized);
}
