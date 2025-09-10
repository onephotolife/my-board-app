# STEP 02 — 構造化ログ（pino）& runtime 宣言の徹底（Codex 実行用）

**目的:** 追跡可能なログ出力と Node ランタイム固定で挙動を安定化  
**完了条件:** 各 API で requestId / latency の pino ログが出力される

---

## 実行指示

### 1) pino ロガー追加

**ファイル（新規）:** `src/lib/obs/logger.ts`

```ts
import pino from 'pino';
export const logger = pino({ level: process.env.LOG_LEVEL ?? 'info' });
```

### 2) 各 API に runtime/dynamic を明記（未設定なら）

**例:** `src/app/api/suggest/route.ts`

```ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
```

### 3) 構造化ログを出力（例：suggest）

```ts
import { logger } from '@/lib/obs/logger';

// ... inside GET handler
const requestId = crypto.randomUUID();
const t0 = performance.now();
// 処理...
logger.info(
  {
    requestId,
    route: 'suggest',
    qLen: q.length,
    items: items.length,
    ms: Math.round(performance.now() - t0),
  },
  'suggest.ok'
);
```

> `/api/search`, `/api/history`, `/api/recommendations` にも同様の計測フィールドを出力。

### 4) コミット

```bash
git add -A
git commit -m "feat(obs): add pino logger and runtime/dynamic declarations to API routes"
```

---

## トラブルシュート

- ログが出ない: `LOG_LEVEL=info` を `.env.local` に設定し、`npm run dev` 再起動。
