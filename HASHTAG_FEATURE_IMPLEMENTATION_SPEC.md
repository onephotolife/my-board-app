## ハッシュタグ機能 実装仕様（Claude Code 実装用 詳細指示）

対象: Next.js 15 (App Router), MongoDB, Material UI。要件: ①投稿から #タグ 自動抽出 ②日本語・英語・絵文字対応 ③クリックで検索 ④人気タグランキング ⑤入力時の候補表示。シンプルで使いやすく、既存構成を尊重する。

---

### 0. 実装の全体像

- **抽出**: 投稿本文からハッシュタグをUnicode対応正規表現で抽出、正規化キーと表示名を生成。
- **保存**: 投稿ドキュメントに `tags`（正規化キーの配列）と `displayTags`（表示文字列の配列）を保持。タグ集計は `tags` コレクションで集約管理。
- **検索**: タグクリックで `/tags/[tag]` に遷移し、そのタグに紐づく投稿一覧をSSR/ISRで表示。
- **ランキング**: 直近7日などの期間で集計して人気順を返すAPI（Aggregation）。
- **候補表示**: 投稿入力中に `#` + 文字列でサジェスト（MUI Popper/Autocomplete）。

---

### 1. コードベース調査（最初に実行）

1. 投稿モデル/コレクションの所在を検索。
   - キーワード: `Post`, `posts`, `schema`, `mongoose`, `mongo`, `db`, `insert post`, `create post`。
   - 想定ファイル例: `src/models/Post.ts` / `src/lib/db.ts` / `src/server/repositories/post*` 等。
2. 投稿作成API/サーバーアクションの所在を検索。
   - キーワード: `createPost`, `new post`, `POST /api/posts`, `server action`, `route.ts`。
3. 投稿入力UI（エディタ/フォーム）の所在を検索。
   - キーワード: `NewPost`, `PostEditor`, `PostForm`, `textarea`, `ContentField` 等。

以降の「ファイルパス」は代表例。実プロジェクトでの場所が異なる場合は、同等のレイヤに作成・改修すること。

---

### 2. データモデル設計（MongoDB）

#### 2-1. 投稿ドキュメント（既存拡張）

- 追加/更新フィールド:
  - `tags: string[]` — 正規化キー（検索・集計用）。重複排除、最大20件程度に制限。
  - `displayTags: string[]` — 表示用（投稿内の表記保持、頭の `#` なし）。
- 既存スキーマがMongooseならスキーマ定義を拡張、Native Driverなら保存時にフィールドを含める。
- インデックス（推奨）:
  - `{ tags: 1, createdAt: -1 }` — タグ検索 + 新着順取得を高速化。

#### 2-2. タグ集計コレクション（新規）

- コレクション名: `tags`
- ドキュメント構造（例）:
  - `_id: ObjectId`
  - `key: string` — 正規化キー（ユニーク）
  - `display: string` — 推奨表示名（代表値）。
  - `countTotal: number` — 総出現数（投稿ごとに一回加算）。
  - `lastUsedAt: Date` — 最後に使われた日時。
  - （任意）`aliases: string[]` — 他表記の候補。
- インデックス:
  - `unique index on key`
  - `index on countTotal (desc)`

---

### 3. 正規表現と正規化（日本語/英語/絵文字）

#### 3-1. 抽出正規表現

- 目的: `#` に続く、単語・日本語文字・結合絵文字列（ZWJ含む）を1トークンとして取得。
- 推奨正規表現（JS, Unicode Property Escapes 使用）:
  ```ts
  // #に続く連続トークン（文字, 数字, 下線, 結合文字, 絵文字, ZWJによる結合）
  const HASHTAG_REGEX =
    /#([\p{L}\p{N}_\p{M}\p{Extended_Pictographic}\p{Emoji_Presentation}]+(?:\u200D[\p{Extended_Pictographic}\p{Emoji_Presentation}]+)*)/gu;
  ```
- 備考:
  - `\p{L}` 文字, `\p{N}` 数字, `\p{M}` 結合文字（濁点など）, `\p{Extended_Pictographic}`と`\p{Emoji_Presentation}`で大半の絵文字を包含。
  - ZWJ(U+200D)連結に対応。
  - 句読点や空白で区切り。長さ上限は後段のロジックで制限（例: 1〜64文字）。

#### 3-2. 正規化ポリシー（検索キー）

- 目的: 同一概念タグを同一キーに集約。
- 手順（この順で適用）:
  1. Unicode 正規化 NFKC。
  2. 異体字セレクタ/絵文字VS（U+FE0F 等）除去。
  3. ASCII 英字は小文字化。
  4. 前後の `#` と空白の除去。
  5. 連続下線・空白は単一下線に（必要なら）。
- 表示名: 初出時の表記を `display` として採用。後続は `lastUsedAt` の更新のみ。

#### 3-3. 実装ユーティリティ（新規）

- 追加ファイル: `src/lib/hashtags.ts`
  - `extractHashtags(text: string): { display: string; key: string; }[]`
  - `normalizeTag(raw: string): string`
  - `linkifyHashtags(text: string, options): ReactNode[]` — 表示用分割（クリックリンク化）。

---

### 4. 書き込みフロー（投稿作成/更新）

1. 投稿作成時、本文からタグを抽出→重複排除→最大件数に制限。
2. 投稿に `tags`（key配列）と `displayTags` を保存。
3. `tags` コレクションを `bulkWrite` で upsert:
   - `updateOne({ key }, { $setOnInsert: { display }, $set: { lastUsedAt: now }, $inc: { countTotal: 1 } }, { upsert: true })`
   - 同一投稿内の同一タグは1カウントのみ。
4. 既存投稿の編集時: 追加分は +1、削除分は（基本は減算せず）遅延再集計で整合。シンプル優先。

---

### 5. 読み取り/検索

#### 5-1. タグページ

- ルート: `/tags/[tag]`
- 実装: `app/tags/[tag]/page.tsx`（SSR/ISR）。
- 処理: `params.tag` を正規化→ `posts.find({ tags: normalized, ... }).sort({ createdAt: -1 })`。
- UI: タイトルに `#display`、投稿カード一覧を表示。MUIの `Chip` でタグバッジ表示可。

#### 5-2. ランキングAPI

- ルート: `GET /api/tags/trending?days=7&limit=50`
- 実装: Post集合のAggregation（直近N日）
  - `match: { createdAt: { $gte: now - days } }`
  - `unwind: "$tags"`
  - `group: { _id: "$tags", count: { $sum: 1 } }`
  - `sort: { count: -1 }`, `limit`
  - `lookup` で `tags` コレクションから `display` を補完（任意）。
- キャッシュ: 60s〜300s程度のSWC/Route Handler Cache or ISR。

#### 5-3. オートコンプリートAPI

- ルート: `GET /api/tags/search?q="..."&limit=10`
- 処理: `q` を正規化→ `tags.find({ key: { $regex: '^' + escapeRegex(q) } }).sort({ countTotal: -1 }).limit(n)`
- レート制限: 簡易でOK（IPあたり/min）。既存RateLimitがあれば流用。

---

### 6. UI 実装（Material UI）

#### 6-1. 本文レンダリングのリンク化

- 新規 `src/components/HashtagText.tsx`
  - `linkifyHashtags` で分割し、 `NextLink` + `MUI Link`/`Chip` で `#tag` をリンク化。
  - クリックで `/tags/[tag]` へ。アクセシビリティ配慮（aria-label）。

#### 6-2. 入力時の候補表示（投稿エディタ）

- 既存の投稿入力コンポーネントを特定（テキストエリア/エディタ）。
- 新規 `useHashtagAutocomplete` フック:
  - カーソル左側の `#...` 部分をリアルタイム検出（単語境界まで）。
  - `debounce(150ms)` + API `/api/tags/search` を呼び出し。
  - 返却: `active`（表示有無）, `anchorRect`, `items`, `select(item)`。
- 新規 `HashtagSuggestions.tsx`（MUI Popper + List）
  - `Popper` をテキストエリアにアンカー。上下キー/Enterで確定。
  - 確定時、選択タグでテキストを置換（`#入力中` → `#候補`）。

---

### 7. ルーティング/ファイル構成（提案）

- `src/lib/hashtags.ts` — 解析・正規化・リンク化ユーティリティ
- `src/components/HashtagText.tsx` — 表示用リンク化コンポーネント
- `src/components/HashtagSuggestions.tsx` — サジェストUI
- `src/hooks/useHashtagAutocomplete.ts` — 入力監視 & サジェスト制御
- `app/tags/[tag]/page.tsx` — タグ一覧ページ
- `app/api/tags/search/route.ts` — サジェストAPI
- `app/api/tags/trending/route.ts` — ランキングAPI
- 既存投稿作成のサーバー側（API or Server Action）— 抽出・保存・集計アップサートを追加

---

### 8. 実装手順（Claude Code への指示）

1. コードベース検索で投稿モデル/作成処理/投稿UIを特定し、前節パスのどこに置くか判断。
2. `src/lib/hashtags.ts` を新規作成し、以下を実装:
   - `HASHTAG_REGEX`、`normalizeTag`、`extractHashtags`、`linkifyHashtags`。
   - ユニットテスト（Jest）を `__tests__/hashtags.test.ts` に作成。
3. 投稿作成サーバー処理を改修:
   - 本文からタグ抽出→`tags`/`displayTags` を付与。
   - `tags` コレクションへ `bulkWrite` upsert（countTotal, lastUsedAt）。
   - 投稿スキーマ/型を更新。必要に応じてマイグレーションスクリプト追加。
4. ルート/API作成:
   - `app/tags/[tag]/page.tsx`（SSR/ISR）
   - `app/api/tags/search/route.ts`
   - `app/api/tags/trending/route.ts`
   - Mongo接続は既存ユーティリティを再利用。
5. 表示/入力UI:
   - `HashtagText` で本文をリンク化（既存投稿カード/詳細で適用）。
   - 入力フォームに `useHashtagAutocomplete` + `HashtagSuggestions` を組み込み。
6. インデックス作成:
   - `posts` コレクションに `{ tags: 1, createdAt: -1 }`
   - `tags` コレクションに `{ key: 1 } unique`, `{ countTotal: -1 }`
7. E2E/結合テスト:
   - 投稿→タグ抽出→クリック検索→一覧→ランキング→サジェスト まで手動/自動テスト。

---

### 9. マイグレーション（既存データ）

- スクリプト `scripts/backfill-tags.mjs` を新規作成:
  - 全投稿を走査→本文から再抽出→`tags` / `displayTags` を更新。
  - `tags` コレクションへ `bulkWrite` で集計アップサート。
- 実行時はバッチ/制限を設け、ロック/二重実行を回避。

---

### 10. 制約・ガード

- 1投稿あたりのタグ数上限（例: 20）。
- タグ長の下限/上限（例: 1〜64）。
- 禁止タグ/NGワードリスト（任意）。
- XSS対策: 出力はReactエスケープ、リンクのクエリはエンコード。
- APIレート制限（サジェスト）。
- 文字列処理は常に `u` フラグ正規表現 & NFKC 正規化で統一。

---

### 11. パフォーマンス/UX

- ランキングAPIはAggregationに期間絞り+上限で軽量化。
- サジェストは150〜250msデバウンス、キャンセル/最新検索のみ反映。
- タグページはISR（60〜300s）で十分。詳細はトラフィック次第で調整。

---

### 12. 受け入れ基準（Acceptance Criteria）

- 本文中の `#タグ`（日本語/英語/絵文字/結合絵文字）が抽出・保存される。
- 投稿表示で `#タグ` がリンク化され、クリックでタグページに遷移する。
- タグページで当該タグの投稿が新着順で取得される。
- ランキングAPIが直近期間の上位タグを返す。UIで表示可能。
- 入力時に `#` + 文字で候補が表示され、選択でテキストが置換される。
- 大文字小文字/全半角/絵文字の異体差が正規化されて検索は一致する。

---

### 13. 実装の雛形（抜粋）

> 具体コードはClaude Codeが生成する。ここでは要点のみ示す。

```ts
// src/lib/hashtags.ts（要点）
export const HASHTAG_REGEX =
  /#([\p{L}\p{N}_\p{M}\p{Extended_Pictographic}\p{Emoji_Presentation}]+(?:\u200D[\p{Extended_Pictographic}\p{Emoji_Presentation}]+)*)/gu;

export function normalizeTag(raw: string): string {
  // 1) NFKC 2) VS除去 3) 小文字化 4) '#'除去 5) トリム
  // 実装はClaude Codeが具体化
  return raw;
}

export function extractHashtags(text: string) {
  // HASHTAG_REGEXで抽出→重複排除→{ display, key }[] 返却
  return [] as { display: string; key: string }[];
}
```

```ts
// app/api/tags/search/route.ts（要点）
// GET ?q= &limit=
// qをnormalize→prefix検索→countTotal降順→最大limit返却
```

```tsx
// src/components/HashtagText.tsx（要点）
// children文字列をlinkifyHashtagsで分割し、NextLinkで /tags/[tag] へ
```

```tsx
// src/hooks/useHashtagAutocomplete.ts（要点）
// 入力監視→候補取得→Popper制御
```

---

### 14. テスト

- 単体: `__tests__/hashtags.test.ts` — 正規表現/正規化/抽出のカバレッジ。
- 結合: 投稿作成→DB保存→タグページ取得→ランキング→サジェストAPI。
- E2E: 入力中サジェストの操作と確定、クリック遷移の確認。

---

### 15. ロールアウト手順

1. スキーマ/ユーティリティ/API/UI を実装し、ローカルでテスト。
2. インデックス作成を適用。
3. 既存データのバックフィル実行。
4. デプロイ→監視（APIレイテンシ/エラー率/ランキング負荷）。

---

以上。疑義があれば、該当レイヤの所在（ファイル/ディレクトリ）を再確認し、最も近い構造に合わせて適用すること。
