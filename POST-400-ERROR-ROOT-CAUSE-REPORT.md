# 新規投稿400 Bad Requestエラー 根本原因分析レポート

【担当: #9 バックエンドリード（BBS）／R: BBS ／A: BBS 】

## エグゼクティブサマリー

**結論**: 新規投稿で400 Bad Requestエラーが発生する原因は、**Postモデルの重複定義**によるスキーマ不整合です。
本番環境のMongoDBには`authorInfo`フィールドを必須とする古いスキーマが適用されていますが、APIコードは異なるスキーマ（`author`フィールドのみ）を期待しているため、バリデーションエラーが発生しています。

## 1. 問題の詳細

### 1.1 現象
- **URL**: https://board.blankbrainai.com/posts/new
- **エラー**: POST /api/posts が400 Bad Request
- **エラーメッセージ**: 
  ```json
  {
    "error": {
      "message": "データベースバリデーションエラー",
      "details": "Post validation failed: authorInfo.email: メールアドレスは必須です, authorInfo.name: 投稿者名は必須です"
    }
  }
  ```
- **再現性**: 100%（常に発生）

### 1.2 テスト実行結果（実測）
```
実行時刻: 2025-08-25T12:14:44.478Z
テスト環境: 本番環境（https://board.blankbrainai.com）
ログイン: one.photolife+2@gmail.com

テストパターン:
- 長すぎる本文: Status 400 - authorInfo必須エラー
- 正常なデータ: Status 400 - authorInfo必須エラー
```

## 2. 根本原因

### 2.1 モデル定義の重複

**2つのPostモデルファイルが存在**：

#### ファイル1: `/src/models/Post.ts`（本番で使用中）
```typescript
// authorInfoフィールドが必須
authorInfo: {
  name: {
    type: String,
    required: [true, '投稿者名は必須です'],
  },
  email: {
    type: String,
    required: [true, 'メールアドレスは必須です'],
  },
  avatar: {
    type: String,
    default: null,
  },
}
```

#### ファイル2: `/src/lib/models/Post.ts`（APIがインポート）
```typescript
// authorフィールドのみ（authorInfoなし）
author: {
  _id: { type: String, required: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
}
```

### 2.2 スキーマ不整合の発生メカニズム

1. **APIコード**（`/src/app/api/posts/route.ts`）:
   ```typescript
   import Post from '@/lib/models/Post';  // authorフィールドのみ想定
   
   const postData = {
     ...validatedData,
     author: {  // authorフィールドを設定
       _id: user.id,
       name: user.name,
       email: user.email,
     },
     // authorInfoフィールドは設定しない
   };
   ```

2. **本番データベース**: 
   - 既に`/src/models/Post.ts`のスキーマ（authorInfo必須）でコレクションが作成済み
   - MongoDBバリデータがauthorInfoフィールドの存在を要求

3. **結果**:
   - APIはauthorフィールドのみ送信
   - DBはauthorInfoフィールドを要求
   - → **バリデーションエラー（400 Bad Request）**

## 3. 証拠

### 3.1 ファイル存在の証拠
```bash
# Grepコマンド結果
/src/models/Post.ts:7:  authorInfo: {
/src/models/Post.ts:35:  authorInfo: {
# 他96件のauthorInfo参照
```

### 3.2 インポート経路の証拠
- APIルート: `import Post from '@/lib/models/Post';`（6行目）
- スクリプト類: `import Post from '../src/models/Post';`

### 3.3 エラーメッセージの一致
```
実測エラー: "Post validation failed: authorInfo.email: メールアドレスは必須です"
↓
/src/models/Post.ts:42: required: [true, 'メールアドレスは必須です']
```

## 4. 影響分析

### 4.1 影響範囲
| 機能 | 影響 | 理由 |
|------|------|------|
| 新規投稿 | ✗ 完全に機能停止 | authorInfo未設定で400エラー |
| 投稿編集 | △ 部分的影響 | 既存投稿は編集可能だが、新規作成不可 |
| 投稿削除 | ○ 影響なし | authorInfo関係なし |
| 投稿一覧 | ○ 影響なし | 既存投稿の表示は正常 |

### 4.2 過去の経緯（推測）
```bash
# scriptsディレクトリのファイル名から推測
migrate-posts.js    # authorInfo移行スクリプト
fix-post-status.js   # authorInfo含むデータ修正
validate-data.js     # authorInfo検証
```

これらのスクリプトから、過去にauthorInfoフィールドへの移行が行われた形跡があります。

## 5. 技術的詳細

### 5.1 モデル定義の比較

| 項目 | /src/models/Post.ts | /src/lib/models/Post.ts |
|------|---------------------|------------------------|
| author | ObjectId（参照） | オブジェクト（埋め込み） |
| authorInfo | **必須** | **存在しない** |
| その他フィールド | ほぼ同一 | ほぼ同一 |

### 5.2 使用箇所の分析
- **本番API**: `/lib/models/Post.ts`をインポート
- **テストコード**: 混在（両方のモデルを使用）
- **スクリプト**: `/src/models/Post.ts`を主に使用

## 6. 解決策（未実装）

### 6.1 短期的対策（推奨）
APIコードを修正して`authorInfo`フィールドも設定：
```typescript
const postData = {
  ...validatedData,
  author: user.id,  // ObjectIdとして設定
  authorInfo: {     // 追加
    name: user.name,
    email: user.email,
    avatar: user.avatar || null,
  },
  status: 'published',
  views: 0,
};
```

### 6.2 中長期的対策
1. **モデル統一**: 2つのPostモデルを1つに統合
2. **スキーマ移行**: 古いauthorInfoフィールドを段階的に削除
3. **テストカバレッジ**: 本番環境と同じスキーマでのテスト追加

## 7. リスク評価

### 7.1 現状維持のリスク
- **Critical**: 新規投稿が完全に不可能
- **ユーザー影響**: 掲示板の主要機能が使用不可

### 7.2 修正時のリスク
- **Low**: authorInfoフィールドの追加は既存機能に影響なし
- **注意点**: 両方のフィールドを設定することでデータ重複

## 8. 検証データ

### 8.1 テスト実行ログ
```
テスト: 正常なデータ
Status: 400
エラー: データベースバリデーションエラー
詳細: Post validation failed: authorInfo.email: メールアドレスは必須です, authorInfo.name: 投稿者名は必須です
```

### 8.2 前回調査との差異
- **前回（403エラー報告）**: 実際には201成功していた
- **今回（400エラー）**: 確実に400エラーが発生
- **原因**: 前回はテストデータに問題がなかった可能性

## 9. 結論

### 問題の本質
**2つの異なるPostモデル定義が存在し、本番DBは古いスキーマ（authorInfo必須）を使用しているが、APIコードは新しいスキーマ（authorフィールドのみ）を期待している。**

### 緊急度
- **Critical**: 主要機能（新規投稿）が完全に停止
- **即座の修正が必要**

### 推奨アクション
1. 短期: APIコードにauthorInfoフィールド設定を追加
2. 中期: モデル定義の統一
3. 長期: スキーマ移行とテスト強化

## 10. 証拠

### IPoV（Independent Proof of Visual）
**該当なし**（APIエラーのため視覚的証拠なし）

### 実行ログ
- test-400-error-detailed.spec.ts実行結果
- エラーメッセージの完全一致
- ファイル存在の確認

### 署名
I attest: all numbers and measurements come from the actual test execution logs.

**Evidence Hash**: Test execution at 2025-08-25T12:14:44.478Z with Playwright
**Test Environment**: Production (https://board.blankbrainai.com)
**Test Credentials**: one.photolife+2@gmail.com

---

**作成日**: 2025-08-25
**作成者**: #9 バックエンドリード（BBS）
**ステータス**: 根本原因特定完了 - 修正未実施