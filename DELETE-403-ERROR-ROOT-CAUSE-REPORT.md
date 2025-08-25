# 投稿削除403エラー根本原因調査レポート

## 実施日時
2025年8月25日 17:00-17:10 JST

## エグゼクティブサマリー
**投稿削除時の403 Forbiddenエラーは、CSRFトークンの欠落が根本原因です。**
middleware.tsがDELETEリクエストにCSRF保護を要求しているにも関わらず、3つのページ（/board、/my-posts、/posts/[id]）の削除処理でCSRFトークンヘッダーが送信されていません。唯一/posts/[id]/editページのみが正しく実装されています。

## 1. 問題の詳細

### 1.1 エラー概要
| 項目 | 内容 |
|------|------|
| エラーコード | 403 Forbidden |
| エラーメッセージ | CSRF token validation failed |
| 影響範囲 | 3ページ（掲示板一覧、マイ投稿、投稿詳細） |
| 発生頻度 | 100%（該当ページでの削除操作時） |

### 1.2 影響を受けるページ
| ページ | URL | 削除機能 | CSRF実装 |
|--------|-----|----------|----------|
| 掲示板一覧 | /board | ❌ 動作しない | ❌ 未実装 |
| マイ投稿 | /my-posts | ❌ 動作しない | ❌ 未実装 |
| 投稿詳細 | /posts/[id] | ❌ 動作しない | ❌ 未実装 |
| 投稿編集 | /posts/[id]/edit | ✅ 正常動作 | ✅ 実装済み |

## 2. 根本原因の分析

### 2.1 技術的原因
```
┌──────────────────────────────────┐
│  クライアント（ブラウザ）         │
│  - /board                        │
│  - /my-posts                     │
│  - /posts/[id]                   │
└──────────────┬───────────────────┘
               │
               │ DELETE /api/posts/[id]
               │ ❌ x-csrf-tokenヘッダーなし
               ▼
┌──────────────────────────────────┐
│  middleware.ts                   │
│  - CSRF保護チェック              │
│  - DELETEメソッドを検証          │
└──────────────┬───────────────────┘
               │
               │ CSRFトークンが見つからない
               ▼
          403 Forbidden
     "CSRF token validation failed"
```

### 2.2 コードレベルの原因

#### 問題のあるコード（3箇所共通パターン）
```typescript
// ❌ CSRFトークンなしの削除処理
const handleDelete = async () => {
  const response = await fetch(`/api/posts/${postId}`, {
    method: 'DELETE',
    // x-csrf-tokenヘッダーが欠落
  });
};
```

#### 正しい実装（EditPostPageのみ）
```typescript
// ✅ CSRFトークン付きの削除処理
import { useCSRFContext } from '@/components/CSRFProvider';

const { token: csrfToken } = useCSRFContext();

const handleDelete = async () => {
  const response = await fetch(`/api/posts/${postId}`, {
    method: 'DELETE',
    headers: {
      'x-csrf-token': csrfToken || ''
    }
  });
};
```

## 3. 詳細な調査結果

### 3.1 削除機能の仕様
| 仕様項目 | 内容 |
|----------|------|
| エンドポイント | DELETE /api/posts/[id] |
| 認証要件 | ログイン必須（NextAuth） |
| CSRF保護 | middleware.tsで強制 |
| 権限チェック | 投稿者のみ削除可能 |
| レスポンス | 成功時200、失敗時403/404/500 |

### 3.2 ファイル構成と役割

#### 影響を受けるファイル
1. **src/components/RealtimeBoard.tsx**
   - 行285-303: handleDelete関数
   - CSRFContext未使用
   - x-csrf-tokenヘッダー欠落

2. **src/app/my-posts/page.tsx**
   - 行95-113: handleDelete関数
   - CSRFContext未使用
   - x-csrf-tokenヘッダー欠落

3. **src/app/posts/[id]/page.tsx**
   - 行140-158: handleDelete関数
   - CSRFContext未使用
   - x-csrf-tokenヘッダー欠落

#### 正常動作ファイル
4. **src/app/posts/[id]/edit/page.tsx**
   - 行199-224: handleDelete関数
   - ✅ CSRFContext使用
   - ✅ x-csrf-tokenヘッダー送信

#### インフラストラクチャ
5. **src/middleware.ts**
   - 行132: DELETE, POST, PUT, PATCHにCSRF保護適用
   - x-csrf-tokenヘッダーを検証

6. **src/components/CSRFProvider.tsx**
   - CSRFトークン管理
   - React Contextでトークン配布

## 4. エラー発生時の影響

### 4.1 直接的影響
| 影響 | 重要度 | 詳細 |
|------|--------|------|
| 削除機能の停止 | 高 | 3ページで投稿削除不可 |
| ユーザー体験の悪化 | 高 | エラーメッセージが技術的 |
| データ整合性 | 低 | 削除されないため影響なし |

### 4.2 潜在的リスク（修正時）
| リスク | 可能性 | 対策 |
|--------|--------|------|
| 型エラー | 低 | TypeScript型定義で防止 |
| ランタイムエラー | 低 | 防御的コーディング |
| CSRFトークン取得失敗 | 中 | エラーハンドリング必要 |
| 既存機能への影響 | 低 | 独立した修正のため影響小 |

## 5. テスト結果

### 5.1 本番環境テスト（2025/8/25 17:06:08）
```
テストURL: https://board.blankbrainai.com
対象投稿: 68abc8def7bca9fae572d156

【CSRFトークンなしの削除リクエスト】
Status: 403 Forbidden
Response: {
  "success": false,
  "error": {
    "message": "CSRF token validation failed",
    "code": "CSRF_VALIDATION_FAILED"
  }
}

【ページ実装確認】
/board: CSRFContext ❌ / x-csrf-token ❌
/my-posts: CSRFContext ❌ / x-csrf-token ❌  
/posts/[id]: CSRFContext ❌ / x-csrf-token ❌
/posts/[id]/edit: CSRFContext ✅ / x-csrf-token ✅
```

## 6. 問題の真の原因

### 6.1 開発プロセスの問題
1. **不完全な実装**
   - CSRF保護の部分的実装
   - 一部のページのみ対応

2. **テスト不足**
   - 削除機能の動作確認不足
   - CSRF保護のエンドツーエンドテスト欠如

3. **知識共有の不足**
   - CSRF実装パターンの文書化なし
   - コンポーネント間の実装差異

### 6.2 技術的要因
1. **React Contextの未使用**
   - CSRFProviderが存在するが3ページで未使用
   - useCSRFContextフックの呼び出し忘れ

2. **HTTPヘッダーの欠落**
   - x-csrf-tokenヘッダーの設定漏れ
   - fetchオプションの不完全な実装

## 7. 推奨される解決策

### 7.1 即時対応（推奨度: ⭐⭐⭐⭐⭐）
**3つのコンポーネントにCSRFトークン実装を追加**

```typescript
// 各コンポーネントの修正例
import { useCSRFContext } from '@/components/CSRFProvider';

const Component = () => {
  const { token: csrfToken } = useCSRFContext();
  
  const handleDelete = async (postId: string) => {
    const response = await fetch(`/api/posts/${postId}`, {
      method: 'DELETE',
      headers: {
        'x-csrf-token': csrfToken || ''
      }
    });
  };
};
```

### 7.2 長期的改善
1. **共通削除フック作成**
   - useDeletePostカスタムフック
   - CSRF処理の一元化

2. **テスト強化**
   - 削除機能のE2Eテスト追加
   - CSRF保護の自動テスト

3. **ドキュメント整備**
   - CSRF実装ガイドライン作成
   - コンポーネント実装チェックリスト

## 8. 結論

**根本原因**: CSRFトークンヘッダーの実装漏れ
- middleware.tsはDELETEリクエストにCSRF保護を要求
- 3つのページでx-csrf-tokenヘッダーが未送信
- CSRFProviderとuseCSRFContextの利用忘れ

**影響**: 投稿削除機能の完全停止（3ページ）
- /board、/my-posts、/posts/[id]で削除不可
- ユーザーは403エラーに遭遇

**解決の緊急度**: 高
- 基本機能が動作しない重大な問題
- 修正は比較的簡単（3ファイルの小規模変更）

## 9. 証拠資料

### テストスクリプト
- test-delete-403-error.js（本調査用）

### 関連ファイル
- src/components/RealtimeBoard.tsx
- src/app/my-posts/page.tsx
- src/app/posts/[id]/page.tsx
- src/app/posts/[id]/edit/page.tsx（参考実装）
- src/middleware.ts
- src/components/CSRFProvider.tsx

---

報告者: Claude Code
日時: 2025年8月25日 17:10 JST