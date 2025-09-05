## Claude Code 実行用ガイド — ハッシュタグ機能（実装・検証・E2E）

このドキュメントは、Claude Code にハッシュタグ機能の実装確認・データ整備・E2E/Playwright テスト実行までを自動化させるための手順書です。既に主要実装は反映済みです（ブランチ: `feature/sns-functions`）。本書では安全に動かすための順序と具体コマンドを示します。

---

### 1. 前提・環境
- **Node**: `>= 20.18.1`（`package.json` の `engines.node` 参照）
- **依存インストール**: `npm install` 実行時に prebuild で `tsc --noEmit` が走ります
- **MongoDB**: `.env.local`（ローカル）で `MONGODB_URI`、本番/Preview では `MONGODB_URI_PRODUCTION`（Atlas など）を設定
- **Auth**: Playwright テストでログインが必要な場合、`AUTH_EMAIL` と `AUTH_PASSWORD` を設定

---

### 2. 実装済みファイル（確認用）
- ユーティリティ
  - `src/app/utils/hashtag.ts`（抽出・正規化・リンク化。Unicode・ZWJ対応）
- モデル
  - `src/lib/models/Tag.ts`（`key/display/countTotal/lastUsedAt`、インデックス込み）
- API
  - `src/app/api/tags/search/route.ts`（接頭辞サジェスト、RateLimit適用）
  - `src/app/api/tags/trending/route.ts`（期間集計 Aggregation）
  - `src/app/api/posts/route.ts`（POST: 本文から自動抽出→`tags`保存→`Tag.bulkWrite` で増分）
  - `src/app/api/posts/[id]/route.ts`（PUT: 再抽出→`tags`更新→`Tag.bulkWrite`）
- ルート
  - `src/app/tags/[tag]/page.tsx`（タグ一覧ページ、`revalidate = 60`）
- UI（リンク化）
  - `src/components/PostItem.tsx`
  - `src/components/EnhancedPostCard.tsx`
- テスト
  - Jest E2E スモーク: `src/__tests__/e2e/hashtags.e2e.test.ts`
  - Playwright: `tests/e2e/tags.spec.ts`

---

### 3. セットアップ（必須コマンド）
```bash
# ブランチ取得（既にいる場合はスキップ可）
git fetch origin && git checkout feature/sns-functions

# 依存インストール（prebuild で tsc 実行）
npm install --no-audit --no-fund

# Playwright 依存
npx playwright install --with-deps | cat

# DBインデックス適用（既存スクリプト）
npm run setup:db | cat
```

---

### 4. 動作確認（API/SSR スモーク）
```bash
# ビルド（prebuild: tsc → build）
npm run build | cat

# ローカル起動
npm run start &
sleep 3

# トレンド（200 が返ること）
curl -sS http://localhost:3000/api/tags/trending?days=7\&limit=5 | jq .

# サジェスト（200 が返ること）
curl -sS 'http://localhost:3000/api/tags/search?q=t&limit=5' | jq .

# タグページ（SSR, 200 を確認）
curl -sSI "http://localhost:3000/tags/東京" | head -n 20
```

---

### 5. 既存データのバックフィル（任意・推奨）
ハッシュタグ導入前の投稿にも `tags` を付与し、`Tag` 集計へ反映します。

作成: `scripts/backfill-tags.mjs`
```js
import mongoose from 'mongoose';
import Post from '../src/lib/models/Post.js';
import Tag from '../src/lib/models/Tag.js';
import { extractHashtags } from '../src/app/utils/hashtag.ts';

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/my-board-app';

async function main() {
  await mongoose.connect(uri);
  const cursor = Post.find({}).cursor();
  const now = new Date();
  let processed = 0;

  for await (const doc of cursor) {
    const text = `${doc.title || ''}\n${doc.content || ''}`;
    const extracted = extractHashtags(text);
    const keys = Array.from(new Set(extracted.map(t => t.key))).slice(0, 5);
    const update = {};
    if (keys.length) update.tags = keys;
    if (Object.keys(update).length) {
      await Post.updateOne({ _id: doc._id }, { $set: update });
      const ops = keys.map(key => ({
        updateOne: {
          filter: { key },
          update: { $setOnInsert: { display: key }, $set: { lastUsedAt: now }, $inc: { countTotal: 1 } },
          upsert: true
        }
      }));
      if (ops.length) await Tag.bulkWrite(ops);
    }
    processed += 1;
    if (processed % 500 === 0) console.log('processed', processed);
  }
  console.log('done', processed);
  await mongoose.disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
```

実行:
```bash
node scripts/backfill-tags.mjs | cat
```

---

### 6. テスト実行（Jest / Playwright）
- Jest E2E スモーク（公開API/SSR の疎通）
```bash
BASE_URL=http://localhost:3000 npm run test -- src/__tests__/e2e/hashtags.e2e.test.ts | cat
```

- Playwright（UI: サジェスト→投稿→リンク遷移）
```bash
AUTH_EMAIL="<your-email>" AUTH_PASSWORD="<your-password>" \
  npx playwright test tests/e2e/tags.spec.ts --project=chromium | cat

# レポート
npx playwright show-report ./playwright-report
```

---

### 7. 受入基準（要約）
- 本文から `#タグ`（日本語/英語/絵文字/ZWJ）が抽出・正規化・保存される
- クリックで `/tags/[tag]` に遷移し、当該タグの投稿が一覧表示される
- `GET /api/tags/trending` で直近期間の上位タグが返る
- `GET /api/tags/search` で接頭辞一致の候補が返る（RateLimitが効く）
- Playwright でサジェスト→投稿→リンク遷移が確認できる

---

### 8. トラブルシュート
- `npm install` で peer 競合: `next-auth` v4 と `@auth/*` の混在を避ける（本ブランチは排除済み）
- Node バージョン警告: `nvm use 20` 等で 20 系へ
- Mongo 接続エラー: `.env.local` に `MONGODB_URI` を設定し再起動
- ダイナミック警告: 特定ページは `headers()` を使うため SSR として動作（仕様）

---

### 9. 変更の要旨（ドリフト検知用）
- 新規: `src/app/utils/hashtag.ts`, `src/lib/models/Tag.ts`, `src/app/api/tags/*`, `src/app/tags/[tag]/page.tsx`, `tests/e2e/tags.spec.ts`, `src/__tests__/e2e/hashtags.e2e.test.ts`
- 変更: `src/app/api/posts/route.ts`, `src/app/api/posts/[id]/route.ts`, `src/components/PostItem.tsx`, `src/components/EnhancedPostCard.tsx`
- CI 安全策: `package.json` に `prebuild: tsc --noEmit`

---

以上の手順を上から順に実行してください。途中で失敗した場合は、その場のコンソール出力（エラー行）を記録して再試行してください。


