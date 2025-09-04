## ハッシュタグ機能 改良実装計画・テスト計画（実装担当: 本AI）

対象: Next.js 15 (App Router), MongoDB, Material UI。目的: `HASHTAG_FEATURE_IMPLEMENTATION_SPEC.md` を基に、実運用で堅牢・高体験な設計へ具体化し、段階的に安全に実装・検証する計画を定義する。

---

### 1. ゴール/非ゴール

- ゴール:
  - 本文からの #タグ 自動抽出、正規化、保存、検索、ランキング、候補サジェストの一連を運用品質で実装。
  - 日本語・英語・絵文字（ZWJ結合含む）に対する抽出/正規化一致を担保。
  - UX: 軽快な候補表示、タグクリック遷移、読みやすい表示、アクセシビリティ配慮。
- 非ゴール:
  - 外部検索エンジン連携、トピックモデリング、類義語自動統合などの高度機能。

---

### 2. アーキテクチャ/責務分離

- `src/lib/hashtags.ts`:
  - 正規表現/正規化/抽出/表示分割ユーティリティの単一責務モジュール。
  - 依存: なし（標準APIのみ）。
- モデル/DB:
  - `models/Post.ts`（または `src/models/Post.ts` / `src/models/Post.unified.ts`）に `tags: string[]`, `displayTags: string[]` を統合。
  - `tags` コレクション（新規）で集計・表示名・最終利用日時を管理。
- API:
  - `app/api/tags/search/route.ts`: サジェスト検索。
  - `app/api/tags/trending/route.ts`: ランキング集計（期間・件数）
  - 既存 `app/api/posts/route.ts`（POST/PUT）：抽出→保存→集計アップサートを追加。
- UI:
  - 表示: `src/components/HashtagText.tsx` で本文をリンク化。
  - 入力: `src/hooks/useHashtagAutocomplete.ts` + `src/components/HashtagSuggestions.tsx` を `src/components/PostForm.tsx` へ組み込み。
- ルーティング:
  - `app/tags/[tag]/page.tsx`（SSR/ISR）。`revalidate = 60` もしくは `dynamic = 'force-dynamic'` を用途に応じて選択。

---

### 3. データモデル/インデックス

- Post ドキュメント（拡張）
  - `tags: string[]`（正規化キー, 検索用）
  - `displayTags: string[]`（表示用）
  - インデックス: `{ tags: 1, createdAt: -1 }`
- Tag 集計（新規コレクション `tags`）
  - `key: string`（unique）
  - `display: string`
  - `countTotal: number`
  - `lastUsedAt: Date`
  - インデックス: `{ key: 1 } unique, { countTotal: -1 }, { lastUsedAt: -1 }`
- スキーマ/型の出所:
  - モデル/型は既存 `models/Post.ts`, `types/post.ts`, `schemas/post.schema.ts` を確認して最も一貫する場所に追加。
  - 変更後は `scripts/setup-indexes.js` にインデックス作成処理を追加。

---

### 4. 抽出・正規化の詳細

- 正規表現（Unicode Property Escapes, Node 20+ 前提）
  ```ts
  // #の直後に、文字/数字/下線/結合文字/絵文字（ZWJ連結含む）を許容
  export const HASHTAG_REGEX =
    /#([\p{L}\p{N}_\p{M}\p{Extended_Pictographic}\p{Emoji_Presentation}]+(?:\u200D[\p{Extended_Pictographic}\p{Emoji_Presentation}]+)*)/gu;
  ```
- 正規化ポリシー（検索一致用 key）:
  1. NFKC 2) 異体字/VS除去 3) ASCII小文字化 4) `#`/空白除去 5) 先頭・末尾トリム 6) 長さ1〜64のみ採用。
- 表示名（display）:
  - 初回出現の表記を記録。後続出現時は `lastUsedAt` のみ更新。
- 重複・上限:
  - 1投稿内の重複はユニーク化。タグ総数は最大20（超過分は破棄）。

---

### 5. 書き込みフロー（POST/PUT での共通手順）

1. 本文から `extractHashtags` → `{ display, key }[]` を取得。
2. `tags` と `displayTags` をユニーク化・上限適用して投稿保存。
3. 集計更新: `tags` コレクションに対し `bulkWrite` upsert
   - `updateOne({ key }, { $setOnInsert: { display }, $set: { lastUsedAt: now }, $inc: { countTotal: 1 } }, { upsert: true })`
   - 1投稿内で同一keyは1増分のみ。
4. 既存投稿の編集:
   - シンプル化のため、差分減算は行わず（非機能要件で許容）。定期バッチで再集計を検討（将来）。

---

### 6. 読み取り/検索

- タグページ `/tags/[tag]`
  - `params.tag` を正規化 → `posts.find({ tags: key }).sort({ createdAt: -1 }).limit(n)`
  - ページ設定: `export const revalidate = 60`（一般）/ `export const dynamic = 'force-dynamic'`（厳密リアルタイム）
- ランキング `/api/tags/trending?days=7&limit=50`
  - Aggregation: `match(createdAt>=now-days)→unwind(tags)→group(_id:tag,count:+1)→sort→limit`
  - `lookup` で `tags.display` を補完可。
  - キャッシュ: Route Handlerの `revalidate: 60`。
- サジェスト `/api/tags/search?q=&limit=10`
  - `q` 正規化→ `key` prefix 正規表現（先頭一致）。
  - `countTotal` 降順で返却。`src/lib/rateLimit.ts` を適用（429対応）。

---

### 7. UI/UX 詳細（MUI）

- 本文リンク化 `src/components/HashtagText.tsx`
  - `linkifyHashtags(text)` で文字列をトークンに分割。`NextLink` + `MUI Link`/`Chip` で表示。
  - クリックで `/tags/[tag]` へ。`aria-label` を付与。
- 入力サジェスト
  - `useHashtagAutocomplete`（新規）
    - テキストエリア/入力欄のカーソル左側 `#...` を検知。
    - `debounce(150ms)` で `/api/tags/search` を呼ぶ。キャンセル/最新反映を保証。
    - アンカーRectは textarea の selection 座標を mirror 要素で算出（ズレ防止）。
  - `HashtagSuggestions.tsx`（新規）
    - `MUI Popper` + `List`。上下キー/Enter/Tab確定、Escで閉じる。
    - 決定時に `#未確定` → `#候補` へ置換。
  - 組み込み先: `src/components/PostForm.tsx`（既存投稿フォーム）

---

### 8. フィーチャーフラグ/設定

```env
TAGS_FEATURE_ENABLED=true
TAGS_SUGGESTION_MIN_CHARS=1
TAGS_SUGGESTION_LIMIT=10
TAGS_TRENDING_DAYS=7
TAGS_TRENDING_LIMIT=50
```

- 初期は `TAGS_FEATURE_ENABLED` により UI 表示やAPI公開を切替可能。

---

### 9. エラーハンドリング/セキュリティ

- XSS: 出力はReactのエスケープに依存。`dangerouslySetInnerHTML` を使わない。
- 入力制御: 長さ・個数・禁止タグ（任意のNGワードリスト）を弾く。
- API: サジェストはレート制限/IPベース制御。必要に応じてログ。
- 正規表現DoS: `u` フラグ + 短いprefix検索/長さ制限で軽減。

---

### 10. 実装タスクリスト（段階的）

1. 基盤ユーティリティ
   - `src/lib/hashtags.ts` 作成: `HASHTAG_REGEX`, `normalizeTag`, `extractHashtags`, `linkifyHashtags`。
   - 単体テスト `__tests__/unit/hashtags.test.ts`。
2. モデル/スキーマ/インデックス
   - Postモデル・型に `tags`/`displayTags` 追加。
   - `scripts/setup-indexes.js` に Post・Tag のインデックス作成を追記。
3. API 実装
   - `app/api/posts/route.ts`（POST/PUT）で抽出→保存→集計upsert。
   - `app/api/tags/search/route.ts` と `app/api/tags/trending/route.ts` 新規。
4. ルート/ページ
   - `app/tags/[tag]/page.tsx` 新規（SSR/ISR）。
5. UI 組み込み
   - `src/components/HashtagText.tsx` 新規、`PostItem.tsx`/`EnhancedPostCard.tsx` に適用。
   - `PostForm.tsx` にサジェスト導入。
6. バックフィル/マイグレーション
   - `scripts/backfill-tags.mjs` 新規。全投稿を再抽出して `tags`/`displayTags` を埋め、`tags` 集計を更新。
7. ドキュメント/運用
   - README 追記、環境変数と機能フラグの説明。

---

### 11. テスト計画（Unit / Integration / E2E）

#### 11-1. 単体（Jest: `__tests__/unit/hashtags.test.ts`）

- 正規表現抽出
  - 英語: `#Hello_World`, 日本語: `#東京2025`, 混在: `#東京2025Expo`。
  - 絵文字: `#😀`, ZWJ: `#👨‍👩‍👧‍👦`, 国旗: `#🇯🇵`。
  - 句読点/改行/スペースで区切り。末尾記号除外。
- 正規化
  - 全/半角、小文字化、VS除去（例: `#東京 FE0F` → `東京`）。
  - 長さ制約: 0文字/65文字以上は除外。
- 抽出→ユニーク化/上限反映
  - 重複タグが1投稿で1つに。
- linkify 分割
  - `"本文 #タグ です"` → `['本文 ', <Link '#タグ'>, ' です']`

#### 11-2. 結合（Jest: `src/__tests__/integration/tags.integration.test.ts`）

- 投稿作成（/api/posts: POST）
  - 本文から `tags/displayTags` 保存、`tags` コレクション upsert（count+1, lastUsedAt更新）。
- 投稿更新（/api/posts/[id]: PUT）
  - 新規追加分のみ count+1、既存は増えないことを検証。
- タグページ取得（/tags/[tag]）
  - 正規化キー一致で投稿が取得される。
- サジェスト（/api/tags/search）
  - prefix一致、`countTotal` 降順、上限適用、レート制限の 429 を確認。
- ランキング（/api/tags/trending）
  - 期間内出現数が降順で返る。`display` が補完される。

#### 11-3. E2E（Playwright: `tests/e2e/tags.spec.ts`）

- 入力サジェスト
  - `#to` 入力で候補が表示。上下キー/Enterで確定置換。
  - 日本語: `#東` で `#東京` 候補が出る。
  - 絵文字: `#😀` 入力で候補表示（存在すれば）。
- 表示/遷移
  - 投稿カードの `#東京` クリックで `/tags/東京` に遷移し、該当投稿がある。
- ランキング
  - ランキング表示コンポーネントが直近上位タグを表示（APIと整合）。

---

### 12. パフォーマンス/運用

- インデックス最適化: `posts(tags, createdAt)`、`tags(key, countTotal)`。
- キャッシュ:
  - タグページ `revalidate=60`、ランキングAPI `revalidate=60`。
  - サジェストは短期キャッシュ（HTTP Cache-Control: `s-maxage=30` など）を検討。
- 監視: 主要APIのエラーレート/レイテンシをログ収集。サジェスト429の割合も観測。

---

### 13. マイグレーション/ロールアウト

1. コード実装→ローカル/CIでUnit/Integration/E2Eを通過。
2. インデックス作成スクリプト実行。
3. バックフィル（低負荷バッチ）。`BATCH_SIZE=500` 等で段階実行。
4. フィーチャーフラグ `TAGS_FEATURE_ENABLED=true` を有効化。
5. デプロイ後、ランキング/サジェストのレイテンシとエラー監視→問題なければ完全有効化。
6. ロールバック: フラグOFFでUI非表示/エンドポイント403, またはルーティング無効化。

---

### 14. リスクと対策

- 正規表現性能: `u` フラグ + 先頭一致 + 長さ制限で軽減。
- 絵文字表現揺れ: VS除去/ZWJ保持で大半を吸収。将来は別途 alias 管理を検討。
- 集計カウントの歪み（編集時）: 月次メンテ or バックフィルで整合性回復。
- スパム: サジェストにレート制限と簡易NGワード。

---

### 15. 受け入れ基準（要約）

- 抽出/正規化/保存/検索/ランキング/サジェスト/リンク化が各環境で機能。
- 日本語/英語/絵文字/ZWJを含む代表ケースがUnit/E2Eでグリーン。
- 主要API（search/trending）のP95レイテンシ < 200ms（開発環境基準）。

---

### 16. 実装開始に向けた前提チェック（この順で確認）

1. `models/Post.ts` / `types/post.ts` / `schemas/post.schema.ts` の整合と採用先決定。
2. 既存投稿APIのエントリポイント確認: `app/api/posts/route.ts`（POST/PUT）と更新系の有無。
3. 表示箇所の特定: `src/components/PostItem.tsx`, `EnhancedPostCard.tsx` のどちらで本文整形しているか確認。
4. 入力フォーム: `src/components/PostForm.tsx` のテキストエリアを特定。
5. `src/lib/rateLimit.ts` の使用方法と既存のAPIレート制限ポリシーを確認。

---

以上の計画に沿って、本AIが実装（コード追加/変更、テスト、マイグレーション作成、インデックス適用）を段階的に実行します。必要であれば途中で観測結果に応じて計画を微修正します。
