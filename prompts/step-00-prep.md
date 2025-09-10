# STEP 00 — ブランチ/環境/ドライラン準備（Codex 実行用）

**目的:** 安全な作業レーンの確保・現状確認・ヘルスチェックの整備  
**完了条件（DoD）:** 新規ブランチ作成 / `api/health` が 200 を返す / 主要ファイルが存在 or 生成

---

## 実行指示

### 1) ブランチ作成 & 依存/バージョン確認

```bash
git checkout -b feat/search-phase2-ui

node -v
npm -v
```

### 2) 主要ファイルの存在確認（無ければ後続で作成する）

```bash
ls -1 src/lib/auth/getUserFromRequest.ts 2>/dev/null || true
ls -1 src/lib/text/normalizeJa.ts 2>/dev/null || true
ls -1 src/app/api/suggest/route.ts 2>/dev/null || true
ls -1 src/app/api/search/route.ts 2>/dev/null || true
ls -1 src/app/api/history/route.ts 2>/dev/null || true
ls -1 src/app/api/recommendations/route.ts 2>/dev/null || true
```

### 3) ヘルスチェック API を追加（存在しない場合）

**ファイル:** `src/app/api/health/route.ts`

```ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}
```

### 4) ローカル起動の健全性（任意）

```bash
# サーバ起動（別ターミナルでよい）
npm run dev &
sleep 5
curl -fsS http://localhost:3000/api/health
```

### 5) コミット

```bash
git add -A
git commit -m "chore(health): add /api/health for CI readiness"
```

---

## トラブルシュート

- `Error: listen EPERM` / `EMFILE`: ポート/監視権限不足。`npm run dev` を停止→再起動。CI では `npm run start` + `wait-on` を採用予定。
