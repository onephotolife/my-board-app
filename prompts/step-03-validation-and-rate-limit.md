# STEP 03 — zod 入力検証 & レート制限（IP+User）（Codex 実行用）

**目的:** 不正/過負荷な入力を防ぎ、APIを安定運用  
**完了条件:** 400/401/429/500 のエラーハンドリングが確認でき、サジェスト/検索の過負荷が抑制される

---

## 実行指示

### 1) バリデーション導入（例：suggest）

**追記:** `src/app/api/suggest/route.ts`

```ts
import { z } from 'zod';
const SuggestQuery = z.object({
  q: z.string().trim().min(1).max(64),
  limit: z.coerce.number().int().min(1).max(10).default(10),
});
// GET内冒頭で:
// const { q, limit } = SuggestQuery.parse({ q: searchParams.get("q"), limit: searchParams.get("limit") });
```

### 2) トークンバケット方式のレート制限（インメモリ）

**ファイル（新規）:** `src/lib/net/rateLimit.ts`

```ts
type Key = string;
type Bucket = { tokens: number; updatedAt: number };
const buckets = new Map<Key, Bucket>();

export function tokenBucketAllow(key: Key, capacity = 60, refillPerSec = 30) {
  const now = Date.now();
  let b = buckets.get(key);
  if (!b) {
    b = { tokens: capacity, updatedAt: now };
    buckets.set(key, b);
  }
  const elapsed = (now - b.updatedAt) / 1000;
  b.tokens = Math.min(capacity, b.tokens + elapsed * refillPerSec);
  b.updatedAt = now;
  if (b.tokens < 1) return false;
  b.tokens -= 1;
  return true;
}
```

**各 API で適用（例：suggest）**

```ts
import { tokenBucketAllow } from '@/lib/net/rateLimit';
const ip = req.headers.get('x-forwarded-for') ?? '127.0.0.1';
const userId = 'anon'; // 認証済みなら userId に置換
if (!tokenBucketAllow(`${ip}:${userId}`, 60, 30)) {
  return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 });
}
```

### 3) エラーレスポンスの統一

- 400: Zod 失敗
- 401: 認証無し（history/recommendations など）
- 429: レート超過
- 500: 予期しない例外（ログに requestId と stack のみ、PII は記録しない）

### 4) コミット

```bash
git add -A
git commit -m "feat(api): zod validation and token-bucket rate limiting on suggest/search/history/recommendations"
```

---

## トラブルシュート

- レート制限は **メモリ**のため多インスタンスでは共有されない。本番は Upstash 等の分散KVを検討。
