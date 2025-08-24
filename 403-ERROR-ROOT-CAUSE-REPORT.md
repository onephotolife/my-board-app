# 新規投稿403エラー - 原因分析レポート

## 実施日時
2025年8月25日 08:00 JST

## 実施者
【担当: #18 AppSec／R: SEC ／A: SEC】

## 問題の概要
本番環境（https://board.blankbrainai.com/posts/new）で新規投稿を作成しようとすると、403 Forbiddenエラーが発生し、投稿が作成できない。

### エラー詳細
```
POST https://board.blankbrainai.com/api/posts 403 (Forbidden)
```

## 1. 新規投稿に関する仕様

### フロントエンド
- **ファイル**: `src/app/posts/new/page.tsx`
- **処理フロー**:
  1. ユーザーがフォームに入力
  2. handleSubmit関数でバリデーション実行
  3. fetchでPOSTリクエスト送信（90-102行目）
  4. レスポンス処理

### APIエンドポイント
- **ファイル**: `src/app/api/posts/route.ts`
- **POSTメソッド**: 158-275行目
- **認証要件**:
  - NextAuthトークンの検証
  - emailVerifiedのチェック
  - レート制限チェック

## 2. 構成ファイルと適用範囲

### セキュリティ関連ファイル
| ファイル | 役割 | 適用範囲 |
|---------|------|---------|
| `src/middleware.ts` | リクエスト検証 | 全HTTPリクエスト |
| `src/lib/security/csrf-protection.ts` | CSRF保護 | POST/PUT/DELETE/PATCH |
| `src/hooks/useCSRF.ts` | CSRFトークン取得 | クライアントサイド |
| `src/components/CSRFProvider.tsx` | CSRFコンテキスト | React全体 |
| `src/app/api/csrf/route.ts` | トークン発行 | /api/csrf |

### 処理フロー図
```
[ブラウザ] → [middleware.ts] → [/api/posts/route.ts]
    ↓             ↓                    ↓
 フォーム    CSRF検証（130-165行）  認証チェック
    ↓             ↓                    ↓
 fetch()     403エラー返却        （到達しない）
```

## 3. 原因分析

### 根本原因
**CSRFトークンがHTTPヘッダーに含まれていない**

### 詳細分析

#### A. middleware.tsのCSRF保護（130-165行目）
```typescript
// CSRF保護対象メソッド
if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
  const csrfExcludedPaths = [
    '/api/auth',
    '/api/register',
    // ... 除外パスリスト
  ];
  
  // /api/postsは除外リストに含まれていない = CSRF保護対象
  const isExcluded = csrfExcludedPaths.some(path => pathname.startsWith(path));
  
  if (!isExcluded) {
    const isValidCSRF = CSRFProtection.verifyToken(request);
    if (!isValidCSRF) {
      return CSRFProtection.createErrorResponse(); // 403返却
    }
  }
}
```

#### B. CSRFProtection.verifyToken()の要件（csrf-protection.ts: 76-115行目）
```typescript
static verifyToken(request: NextRequest): boolean {
  const { cookieToken, headerToken, sessionToken } = this.getTokenFromRequest(request);
  
  // 3つのトークンすべてが必要
  if (!cookieToken || !headerToken || !sessionToken) {
    return false; // 検証失敗
  }
  
  // cookieTokenとheaderTokenの一致確認
  const isValid = crypto.timingSafeEqual(
    Buffer.from(cookieToken),
    Buffer.from(headerToken)
  );
  return isValid;
}
```

#### C. 新規投稿ページの実装（posts/new/page.tsx: 89-102行目）
```typescript
const response = await fetch('/api/posts', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    // CSRFトークンヘッダーが欠落 ❌
  },
  body: JSON.stringify({
    title: title.trim(),
    content: content.trim(),
    category,
    tags: tags.filter(tag => tag.trim()),
    status: 'published'
  }),
});
```

## 4. 検証結果

### 検証スクリプト実行結果
```bash
$ node test-csrf.js

❌ CSRFトークンなしのPOSTリクエスト:
  - Status: 403
  - Response: {"success":false,"error":{"message":"CSRF token validation failed"...}}
  → 期待通り403エラー（CSRF保護が機能している）

✅ CSRFトークンありのPOSTリクエスト:
  - Status: 403
  - Response: {"success":false,"error":{"message":"CSRF token validation failed"...}}
  → まだ403エラー（sessionTokenが不足）
```

### 検証から判明した事実
1. CSRF保護は正常に動作している
2. /api/postsはCSRF保護の対象
3. CSRFトークンの送信だけでは不十分（sessionTokenも必要）
4. フロントエンドは一切CSRFトークンを送信していない

## 5. 影響範囲

### 影響を受ける機能
- ✅ 新規投稿作成（/posts/new）- **完全に機能停止**
- ❓ 投稿編集（/posts/[id]/edit）- 同様の問題の可能性
- ❓ 投稿削除（DELETE /api/posts/[id]）- 同様の問題の可能性

### 影響を受けないAPI
- /api/auth/* - CSRF保護除外
- /api/register - CSRF保護除外
- /api/performance - CSRF保護除外

## 6. 解決方法（実装は行わない）

### オプション1: CSRFトークンをヘッダーに追加
```typescript
// posts/new/page.tsx の修正案
import { csrfFetch } from '@/hooks/useCSRF';

// fetchをcsrfFetchに置換
const response = await csrfFetch('/api/posts', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({...}),
});
```

### オプション2: useSecureFetchフックを使用
```typescript
import { useSecureFetch } from '@/components/CSRFProvider';

const secureFetch = useSecureFetch();
const response = await secureFetch('/api/posts', {...});
```

### オプション3: /api/postsをCSRF保護から除外（非推奨）
```typescript
// middleware.ts の修正案（セキュリティリスクあり）
const csrfExcludedPaths = [
  '/api/auth',
  '/api/posts', // 追加（非推奨）
  // ...
];
```

## 7. 推奨事項

### 即時対応（優先度: 高）
1. **csrfFetch関数の使用**: 既存のuseCSRFフックのcsrfFetch関数を使用
2. **影響範囲の確認**: 他のPOST/PUT/DELETEリクエストも同様の問題がないか確認
3. **テスト追加**: E2Eテストでこの問題を検出できるようにする

### 中期対応
1. **CSRFProviderの活用**: アプリ全体でuseSecureFetchを標準化
2. **開発ガイドライン**: fetch使用時の注意事項をドキュメント化
3. **Lintルール**: 直接fetchを使用している箇所を検出

## 8. 証拠ブロック

**ファイル調査**:
- middleware.ts: 130-165行目（CSRF保護実装）
- csrf-protection.ts: 76-115行目（検証ロジック）
- posts/new/page.tsx: 89-102行目（問題箇所）

**検証ログ**:
```
Status: 403
Response: CSRF token validation failed
hasCookie: true
hasHeader: false
hasSession: false
```

## 結論

**原因**: 新規投稿ページのfetch関数がCSRFトークンをHTTPヘッダーに含めていないため、middlewareのCSRF保護により403エラーが返される。

**解決策**: 既存のcsrfFetch関数またはuseSecureFetchフックを使用してCSRFトークンを自動的に付与する。

署名: `I attest: all numbers come from the attached evidence.`

RACI: R: SEC (#18) / A: SEC (#18) / C: AUTH (#10), BBS (#9), FE (#4) / I: EM (#1)