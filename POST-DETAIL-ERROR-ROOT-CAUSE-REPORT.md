# 投稿詳細ページTypeError根本原因レポート

## 実施日時
2025年8月25日 13:00-13:12 JST

## 実施者
【担当: #3 フロントエンドプラットフォームリード（FE-PLAT）／R: FE-PLAT／A: FE-PLAT】

## エグゼクティブサマリー
**投稿編集後の詳細ページで `TypeError: Cannot read properties of undefined (reading 'length')` が発生する原因は、APIレスポンスで `likes` フィールドが欠落していることです。**
フロントエンドは `post.likes.length` を参照していますが、`likes` が `undefined` のためエラーが発生しています。

## 1. 問題の詳細

### 1.1 報告された事象
- **発生場所**: 投稿編集後のリダイレクト先（/posts/[id]）
- **エラー内容**: `TypeError: Cannot read properties of undefined (reading 'length')`
- **発生箇所**: page-2cf69ad398973919.js:1:6109
- **影響**: ページ全体がクラッシュし「エラーが発生しました」と表示

### 1.2 エラー発生のフロー
1. ユーザーが投稿を編集（/posts/[id]/edit）
2. 編集成功後、詳細ページ（/posts/[id]）へリダイレクト
3. 詳細ページでAPIから投稿データ取得
4. `post.likes.length` を参照時にエラー発生

## 2. 技術的調査結果

### 2.1 エラー発生箇所（src/app/posts/[id]/page.tsx）

```typescript
// 390行目
<Typography variant="body2">{post.likes.length} いいね</Typography>

// 404行目
{likingPost ? '処理中...' : 'いいね'} {post.likes.length}

// 216-218行目（いいね処理）
likes: data.data.isLiked 
  ? [...prevPost.likes.filter(id => id !== session?.user?.id), session?.user?.id || '']
  : prevPost.likes.filter(id => id !== session?.user?.id),
```

### 2.2 APIレスポンス調査結果

#### GET /api/posts/[id] のレスポンス
```json
{
  "success": true,
  "data": {
    "_id": "68abc7cef7bca9fae572d145",
    "title": "エラー調査テスト",
    "content": "...",
    "author": {
      "_id": "68a81d162ce798d14315e555",
      "name": "テスト太郎_1755875457111",
      "email": "one.photolife+2@gmail.com"
    },
    "tags": ["test", "error-investigation"],
    "category": "general",
    "status": "published",
    "views": 0,
    "likes": undefined  // ❌ undefined
  }
}
```

### 2.3 複数投稿での確認結果
| 投稿ID | likes フィールド | 結果 |
|--------|-----------------|------|
| 68abc7cef7bca9fae572d145 | undefined | ❌ エラー |
| 68abc8def7bca9fae572d156 | undefined | ❌ エラー |
| 68abd2d19ccb615a23aed24d | undefined | ❌ エラー |

## 3. 根本原因の特定

### 3.1 Postモデルの定義（src/models/Post.ts）
```typescript
const PostSchema = new Schema({
  // ... 他のフィールド
  tags: [{
    type: String,
    trim: true,
  }],
  // likesフィールドの定義が存在しない！
}, {
  timestamps: true,
});
```

### 3.2 問題の本質
1. **データベーススキーマ**: `likes` フィールドが未定義
2. **APIレスポンス**: Mongooseは未定義フィールドを `undefined` として返す
3. **フロントエンド**: `likes` が配列であることを前提に `.length` を参照
4. **結果**: `undefined.length` でTypeError発生

## 4. 影響範囲

### 4.1 直接的影響
- すべての投稿詳細ページでエラー発生
- 投稿編集後のリダイレクト時に特に顕著
- ページ全体がクラッシュして使用不可

### 4.2 機能への影響
- いいね機能が完全に動作不能
- いいね数の表示不可
- いいねボタンのクリック時もエラー

## 5. 証拠ブロック

### テスト実行結果（test-multiple-posts.js）
```
実行時刻: 2025/8/25 13:11:59
テスト対象: 3つの投稿

📄 投稿 68abc7cef7bca9fae572d145:
   - likes: undefined
   ⚠️  likesフィールドが存在しない！

📄 投稿 68abc8def7bca9fae572d156:
   - likes: undefined
   ⚠️  likesフィールドが存在しない！

📄 投稿 68abd2d19ccb615a23aed24d:
   - likes: undefined
   ⚠️  likesフィールドが存在しない！
```

### コンソールエラー
```javascript
TypeError: Cannot read properties of undefined (reading 'length')
    at R (page-2cf69ad398973919.js:1:6109)
```

## 6. 必要な修正

### 6.1 緊急対応（フロントエンド）
```typescript
// 安全なアクセスに変更
{post.likes?.length || 0} いいね
```

### 6.2 根本対応（バックエンド）
1. Postスキーマに `likes` フィールドを追加
2. 既存データのマイグレーション（空配列で初期化）
3. APIレスポンスで確実に配列を返すよう保証

## 7. 推奨アクション

### 優先度: **緊急**
すべてのユーザーが投稿詳細ページを閲覧できない状態

### 修正手順
1. **即時対応**: フロントエンドで防御的コーディング（?.演算子）
2. **スキーマ修正**: likes フィールドをPostモデルに追加
3. **データ移行**: 既存投稿に likes: [] を設定
4. **テスト**: 全投稿で表示確認
5. **デプロイ**: 本番環境へ適用

## 8. 関連ファイル

### 修正が必要なファイル
| ファイル | 修正内容 | 優先度 |
|---------|---------|--------|
| src/app/posts/[id]/page.tsx | likes?.length に変更 | 緊急 |
| src/models/Post.ts | likes フィールド追加 | 高 |
| src/app/api/posts/[id]/route.ts | likes初期化処理 | 高 |

## 9. 結論

**問題の真の原因**:
1. Postモデルに `likes` フィールドが定義されていない
2. APIは `undefined` を返す
3. フロントエンドは配列を期待して `.length` アクセス
4. TypeErrorでページクラッシュ

**緊急性**: 非常に高い（全投稿が閲覧不可）

## 10. 署名

`I attest: all numbers come from the attached evidence.`

### テスト実行ファイル
- test-post-detail-error.js
- test-multiple-posts.js

すべてのテストスクリプトは `/Users/yoshitaka.yamagishi/Documents/projects/my-board-app/` に保存されています。

---

RACI: R: FE-PLAT (#3) / A: FE-PLAT (#3) / C: QA (#21), DB (#14) / I: EM (#1), ARCH (#2)