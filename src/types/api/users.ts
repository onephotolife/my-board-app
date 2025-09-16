export type SuggestItem = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
};

export type SearchItem = SuggestItem & {
  bio: string;
  score: number;
  followerCount: number;
};

export type RecoItem = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  followerCount?: number;
  commonFollows?: number;
};

export type HistoryItem = {
  q: string;
  normalizedQ: string;
  count: number;
  lastSearchedAt: string;
};

export type SuggestResponse = { ok: true; q: string; items: SuggestItem[] };
export type SearchResponse = {
  ok: true;
  q: string;
  items: SearchItem[];
  page: number;
  limit: number;
};
export type RecoResponse = { ok: true; items: RecoItem[] };
export type HistoryResponse = { ok: true; items: HistoryItem[] };
export type HistoryAckResponse = { ok: true };

export type ApiError = { ok: false; error: { message: string; code: string; errorId: string } };
