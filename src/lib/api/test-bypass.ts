import type { NextRequest } from 'next/server';

import { normalizeJa } from '@/lib/search/ja-normalize';
import type { HistoryItem, RecoItem, SearchItem, SuggestItem } from '@/types/api/users';

const sampleUsers: Array<SearchItem & { score: number }> = [
  {
    id: 'demo-1',
    displayName: '山岸 良孝',
    avatarUrl: null,
    bio: 'フルスタックエンジニア',
    score: 4.8,
    followerCount: 128,
  },
  {
    id: 'demo-2',
    displayName: 'ヤマギシ ヨシタカ',
    avatarUrl: null,
    bio: 'バックエンド開発',
    score: 4.2,
    followerCount: 64,
  },
  {
    id: 'demo-3',
    displayName: 'やまぎし よしたか',
    avatarUrl: null,
    bio: 'フロントエンド好き',
    score: 4.1,
    followerCount: 45,
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

export function isTestBypass(req: NextRequest): boolean {
  return process.env.AUTH_BYPASS_FOR_TESTS === '1' || req.headers.get('x-test-auth') === '1';
}

export function testSuggest(q: string, limit: number): SuggestItem[] {
  const normalized = normalizeJa(q);
  return sampleUsers
    .filter((user) => normalizeJa(user.displayName).includes(normalized))
    .slice(0, limit)
    .map(({ id, displayName, avatarUrl }) => ({ id, displayName, avatarUrl }));
}

export function testSearch(q: string, page: number, limit: number): SearchItem[] {
  const normalized = normalizeJa(q);
  const matched = sampleUsers.filter((user) => normalizeJa(user.displayName).includes(normalized));
  const start = (page - 1) * limit;
  return matched
    .slice(start, start + limit)
    .map(({ id, displayName, avatarUrl, bio, score, followerCount }) => ({
      id,
      displayName,
      avatarUrl,
      bio,
      score,
      followerCount,
    }));
}

export function testRecommendations(limit: number): RecoItem[] {
  return sampleUsers.slice(0, limit).map(({ id, displayName, avatarUrl, followerCount }) => ({
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
