## Claude Code実行計画（P0/P1）— バックフィル統一 / Playwright安定化 / UIサジェスト実装

対象ブランチ: `feature/sns-functions`
目的: レポート指摘のP0（即時）/P1（短期）項目を安全・着実に完遂し、UI E2Eを含めた完全合格（STRICT120）を達成する。

---

### 0. 変更概要（先読み）
- スクリプト `scripts/backfill-tags.mjs` を「本番実装の正規化ロジック」に統一（`extractHashtags/normalizeTag`を使用）
- Playwrightの認証をUI操作ではなくストレージ/セッション注入に切替（安定化）
- `PostForm.tsx` に入力サジェストUI（`useHashtagAutocomplete` + `HashtagSuggestions`）を組込み

---

### 1. 事前調査（コードと依存の把握）
1) 抽出・正規化ユーティリティの実装確認
   - `src/app/utils/hashtag.ts`: `HASHTAG_REGEX`, `normalizeTag`, `extractHashtags`, `linkifyHashtags`
2) 投稿モデル・APIのタグ保存/集計箇所
   - `src/lib/models/Post.ts`: `tags: string[]`（上限5）
   - `src/app/api/posts/route.ts`（POST）、`src/app/api/posts/[id]/route.ts`（PUT）
3) タグ集計モデル
   - `src/lib/models/Tag.ts`: `key/display/countTotal/lastUsedAt`
4) UIレンダリング箇所
   - `src/components/PostItem.tsx`, `src/components/EnhancedPostCard.tsx`（リンク化済み）
   - `src/components/PostForm.tsx`（入力欄の位置を確認）
5) レート制限
   - `src/lib/rateLimit.ts`（メモリ実装、将来Redis化）

---

### 2. 設計（最適案）
#### 2-1. バックフィル統一
- 既存 `scripts/backfill-tags.mjs` を TypeScript 実装へ寄せる。
- 実装案A: ts-node で `src/app/utils/hashtag.ts` を直接 import（推奨）
  - pros: 単一ソース・ドリフト無し
  - cons: ts-node 依存（dev only）
- 実装案B: 抽出/正規化ロジックを `.mjs` に再掲（同一コードをコピペ）
  - pros: node 単独で実行
  - cons: ドリフトリスク
- 採用: 案A（ts-node）。`devDependencies` に `ts-node` 追加、`package.json` にスクリプトを用意。

#### 2-2. Playwright安定化
- 認証: UIフォーム経由のログインは脆弱（セレクタ/遷移/CSRF）。`storageState` を使いログイン済み状態を使い回す。
  - セッション確立ルート（例: `/api/auth/test-login` など）→Cookie書き出し→`storageState.json` 保存
  - 各テストの `use: { storageState: 'storageState.json' }` でログイン済み
- セレクタ: ラベル/role を実UIに一致させ、`getByRole`/`getByLabel` を堅牢化。

#### 2-3. UIサジェスト実装
- `useHashtagAutocomplete`（新規）
  - 入力中のカーソル左を走査し `#...` を抽出（単語境界まで）
  - `debounce(150ms)` で `/api/tags/search` を呼び出し、結果を state 管理
  - `anchorRect` は mirroring で安定座標化
- `HashtagSuggestions.tsx`（新規）
  - MUI `Popper` + `List`。上下キー/Enter/Tab/ESC対応
  - 決定時に入力を `#候補` に置換
- `PostForm.tsx` に組込み
  - TextField/Textareaの `onChange/onKeyDown` にフック
  - フラグ `TAGS_FEATURE_ENABLED` でON/OFF

---

### 3. 実装ステップ（安全手順）
#### 3-1. バックフィル（ts-node化）
1) 依存追加:
```bash
npm i -D ts-node @types/node
```
2) 新規: `scripts/backfill-tags.ts`
   - `import 'ts-node/register'` 不要（直接 ts-node 経由で実行）
   - `import { extractHashtags } from '@/app/utils/hashtag'`
   - 既存 `Post`, `Tag` を import して同様に `bulkWrite`
3) 実行コマンド:
```bash
npx ts-node scripts/backfill-tags.ts | cat
```
4) 検証:
   - `Tag` コレクションに件数が増分
   - ランダムタグで `/tags/[tag]` 200 応答

#### 3-2. Playwright（認証安定化）
1) 認証ストレージ作成スクリプト:
   - 例: `tests/e2e/utils/create-storage-state.ts`
   - `/api/auth/test-login` 相当のサーバールートがあればそれを利用してログイン→Cookie保存
2) Playwright 設定更新:
   - `playwright.config.ts` に `storageState: './tests/e2e/storageState.json'`
3) テスト修正:
   - `tests/e2e/tags.spec.ts` のログイン手順を削除
   - 投稿画面/本文セレクタをUI実態に合わせて調整

#### 3-3. サジェストUI追加
1) 新規ファイル:
   - `src/hooks/useHashtagAutocomplete.ts`
   - `src/components/HashtagSuggestions.tsx`
2) `PostForm.tsx` に導入:
   - `const { active, anchorRect, items, select, onChange, onKeyDown } = useHashtagAutocomplete()`
   - Textarea の `onChange/onKeyDown/ref` をフックに接続
   - `active && <HashtagSuggestions ... />`
3) スタイル/可用性:
   - `aria-activedescendant`/`role=listbox`/`role=option` 等を付与
   - モバイルでの被り対策（z-index, portal）

---

### 4. コマンド集（実行順）
```bash
# 0) 前提
nvm use 20.18.1
npm ci

# 1) バックフィル統一（ts-node）
npm i -D ts-node @types/node
npx ts-node scripts/backfill-tags.ts | cat

# 2) Playwright 安定化
npx ts-node tests/e2e/utils/create-storage-state.ts | cat
npx playwright test tests/e2e/tags.spec.ts --project=chromium | cat

# 3) サジェストUI 実装後のE2E
npx playwright test tests/e2e/tags.spec.ts --project=chromium | cat
```

---

### 5. 受入基準（更新）
- バックフィルが `extractHashtags/normalizeTag` と同一結果を生む（サンプル10件比較一致）
- Playwright で `tags.spec.ts` が安定して PASS（3回連続）
- 入力中に `#東` で候補表示、Enterで置換される（UI/E2Eで検証）

---

### 6. リスクと対応
- ts-node 実行環境差異 → Node 20固定、パスエイリアスは `tsconfig` のpathsに合わせる
- セレクタ破綻 → `role`/`label`の堅牢化。失敗時のtrace/video収集で即修正
- サジェストポップアップのz-index/スクロール → MUI `Popper` + `Portal` で最前面/スクロール親に固定

---

### 7. 差分コミット・ロールバック
- 1変更=1コミットを厳守
- 失敗時は直前コミットへ `git revert`、または `git switch -`

---

以上。上記の順序で実施すれば、P0/P1は安全に完了でき、STRICT120の完全合格まで到達できます。途中の失敗はログとアーティファクトを添えて是正してください。


