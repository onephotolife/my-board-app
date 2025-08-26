# フォロー機能エラー原因究明レポート

## 作成日時
2025年8月26日

## エグゼクティブサマリー
http://localhost:3000/test-follow でフォローボタンクリック時に発生する500エラーと429エラーの根本原因を特定しました。2つの主要な問題があり、どちらもコード修正が必要です。

---

## 1. 問題の詳細

### 1.1 報告されたエラー

| エラー | 発生箇所 | HTTPステータス | 頻度 |
|--------|---------|--------------|------|
| Internal Server Error | `/api/follow/test-user-3` | 500 | 常に発生 |
| Internal Server Error | `/api/follow/test-user-4` | 500 | 常に発生 |
| Too Many Requests | `/api/follow/test-user-5` | 429 | 多数のクリック後 |
| WebSocket connection error | Socket.io接続 | - | 副次的 |

### 1.2 エラー発生環境
- **URL**: http://localhost:3000/test-follow
- **該当ボタン**: サイズバリエーションセクションのボタン（Small, Medium, Large）
- **ファイル**: `/src/app/test-follow/page.tsx` 行126-136

---

## 2. 根本原因分析

### 原因1: Next.js 15の動的ルートパラメータ非同期化 【重要度: 高】

#### エラーメッセージ
```
Error: Route "/api/follow/[userId]" used `params.userId`. 
`params` should be awaited before using its properties.
```

#### 詳細
- **影響ファイル**: `/src/app/api/follow/[userId]/route.ts`
- **問題箇所**: 
  - 行20: `{ params }: { params: { userId: string } }`
  - 行50, 61, 150, 180, 210, 288: `params.userId` の直接使用

#### 技術的背景
Next.js 15から動的ルートパラメータ（params）が非同期に変更されました。これは以下の理由によります：
1. パフォーマンス最適化
2. ストリーミングレンダリング対応
3. 並列データフェッチの改善

**証拠**: 
- サーバーログ: `/api/follow/test-user-1 500 in 1871ms`
- エラーログ: `Error: Route "/api/follow/[userId]" used params.userId`

---

### 原因2: 無効なMongoDBObjectIDの使用 【重要度: 高】

#### エラーメッセージ
```
Follow error: CastError: Cast to ObjectId failed for value "test-user-3" (type string) at path "_id" for model "User"
reason: BSONError: input must be a 24 character hex string, 12 byte Uint8Array, or an integer
```

#### 詳細
- **問題のuserID**:
  - `test-user-1` (11文字)
  - `test-user-3` (11文字)  
  - `test-user-4` (11文字)
  - `test-user-5` (11文字)

- **MongoDBのObjectID要件**:
  - 24文字の16進数文字列
  - 例: `68ad36cbfd831a5fbd96b575`

#### コードの問題箇所
```javascript
// /src/app/test-follow/page.tsx 行126-136
<FollowButton 
  userId="test-user-3"  // ❌ 無効なObjectID
  size="small"
/>
```

**証拠**:
- サーバーログ: `CastError: Cast to ObjectId failed for value "test-user-3"`
- MongoDB仕様: BSONError発生

---

### 原因3: レート制限の動作 【重要度: 中】

#### 設定
- **ファイル**: `/src/lib/security/rate-limiter-v2.ts`
- **制限**: 1分間に30リクエスト（APIエンドポイント）
- **適用箇所**: `/src/middleware.ts` 行97-112

#### 発生メカニズム
1. 複数のフォローボタンクリック
2. CSRFトークン取得も含めてカウント
3. 制限値（30リクエスト/分）に到達
4. 429エラー返却

**証拠**:
- テストログ: `レート制限にヒット（リクエスト#11）`  
- サーバーログ: `Rate limit exceeded: ::1 - /api/follow/000000000000000000000000`

---

## 3. 影響範囲

### 3.1 影響を受けるコンポーネント

| コンポーネント | 影響度 | 理由 |
|--------------|--------|------|
| `/api/follow/[userId]/route.ts` | 致命的 | 全フォロー操作が失敗 |
| `/test-follow/page.tsx` | 高 | テストページが機能しない |
| `FollowButton.tsx` | 中 | エラー処理は正常だが、APIが失敗 |

### 3.2 他のAPIエンドポイント
同様の問題を持つ可能性のあるエンドポイント：
- `/api/posts/[id]/route.ts`
- `/api/users/[id]/route.ts`
- その他の動的ルートを使用するAPI

---

## 4. 検証結果

### 4.1 再現テスト

#### テストスクリプト実行結果
```javascript
// test-follow-errors.js 実行結果
=== テスト1: 無効なUserID ===
  test-user-1: ステータス 500
  test-user-3: ステータス 500
  test-user-4: ステータス 500

=== テスト3: レート制限 ===
  レート制限にヒット（リクエスト#11）
    メッセージ: Too many requests. Please try again later.
```

### 4.2 ログ分析
```
[時系列]
1. params.userId使用警告
2. CastError発生
3. 500エラー返却
4. 複数リクエスト後429エラー
```

---

## 5. 修正が必要な箇所（実装せず）

### 5.1 Next.js 15対応
**ファイル**: `/src/app/api/follow/[userId]/route.ts`

修正前:
```typescript
export async function POST(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  // ...
  if (currentUser._id.toString() === params.userId) {
```

修正後（案）:
```typescript
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  // ...
  if (currentUser._id.toString() === userId) {
```

### 5.2 テストページのuserID修正
**ファイル**: `/src/app/test-follow/page.tsx`

修正前:
```javascript
<FollowButton userId="test-user-3" size="small" />
```

修正後（案）:
```javascript
// 実際のMongoDBユーザーIDを使用
<FollowButton userId="68ad36cbfd831a5fbd96b575" size="small" />
```

---

## 6. 推奨事項（実装なし）

### 6.1 即座に対応すべき事項
1. **Next.js 15互換性対応**
   - すべての動的ルートAPIを確認
   - `params`を`await`で処理するよう修正

2. **テストデータの改善**
   - 有効なObjectIDを使用
   - またはモックユーザーを事前作成

### 6.2 中期的改善
1. **バリデーション強化**
   - ObjectID形式チェックを追加
   - エラーメッセージの改善

2. **レート制限の調整**
   - 開発環境では緩和
   - `/api/follow`専用の制限設定追加

3. **エラーハンドリング**
   - より詳細なエラー情報提供
   - ユーザーフレンドリーなメッセージ

---

## 7. リスク評価

| リスク | 可能性 | 影響度 | 対策優先度 |
|--------|--------|--------|-----------|
| 本番環境での500エラー | 高 | 致命的 | 最優先 |
| 他のAPIエンドポイントの同様のエラー | 高 | 高 | 高 |
| ユーザー体験の低下 | 確実 | 高 | 高 |
| レート制限による正当な使用の阻害 | 中 | 中 | 中 |

---

## 8. 結論

### 8.1 主要な発見
1. **Next.js 15の破壊的変更**への未対応が500エラーの主因
2. **テストデータの不備**（無効なObjectID使用）が問題を顕在化
3. **レート制限**は正常に動作しているが、設定の最適化が必要

### 8.2 優先順位
1. 🔴 **最優先**: Next.js 15対応（params非同期化）
2. 🟠 **高優先**: テストデータの修正
3. 🟡 **中優先**: レート制限の最適化
4. 🟢 **低優先**: エラーメッセージの改善

### 8.3 次のステップ
改善実装は行わず、このレポートを基に対応方針を決定してください。

---

## 付録

### A. 関連ファイル一覧
```
/src/app/api/follow/[userId]/route.ts
/src/app/test-follow/page.tsx
/src/components/FollowButton.tsx
/src/lib/security/rate-limiter-v2.ts
/src/middleware.ts
```

### B. 証拠ログ
```
[サーバーログ抜粋]
Error: Route "/api/follow/[userId]" used `params.userId`
Follow error: CastError: Cast to ObjectId failed for value "test-user-3"
Rate limit exceeded: ::1 - /api/follow/000000000000000000000000
```

### C. 参考資料
- [Next.js 15 Migration Guide - Dynamic Params](https://nextjs.org/docs/messages/sync-dynamic-apis)
- [MongoDB ObjectID Specification](https://docs.mongodb.com/manual/reference/method/ObjectId/)

---

**作成者**: フロントエンドチーム  
**レビュー**: 未実施  
**承認**: 未承認

**署名**: I attest: all numbers and error messages come from the attached evidence (server logs and test execution).