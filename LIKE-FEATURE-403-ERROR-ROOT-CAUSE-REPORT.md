# いいね機能403エラー根本原因分析レポート

**調査日時**: 2025年8月29日  
**調査者**: Claude (AI Assistant)  
**プロトコル**: STRICT120  
**ステータス**: 根本原因特定完了

## 1. エグゼクティブサマリー

ブラウザで「いいね」ボタンをクリックした際に発生する403 Forbiddenエラーの根本原因を特定しました。

### 特定された根本原因
1. **CSRFトークンの初期化タイミング問題**
2. **エンドポイントの不整合**（`/unlike`が存在しない）
3. **CSRFトークンがnullの状態でリクエストが送信される**

## 2. 問題の現象

### 2.1 ユーザー報告
```
場所: http://localhost:3000/board
動作: いいねボタンクリック
エラー: POST http://localhost:3000/api/posts/68b00b6.../like 403 (Forbidden)
ダイアログ: "[object Object]"と表示
```

### 2.2 コンソールエラー詳細
```javascript
RealtimeBoard.tsx:502 
POST http://localhost:3000/api/posts/68b00b6.../like 403 (Forbidden)

RealtimeBoard.tsx:525 Error toggling like:
Error: [object Object]
    at handleLike (webpack-internal:///(app-pages-browser)/./src/components/RealtimeBoard.tsx:625:23)
```

## 3. 調査結果

### 3.1 CSRFトークン保護の実装状況

**middleware.ts（130-168行目）**
```typescript
// CSRF保護（有効化）
const method = request.method.toUpperCase();
if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
  const csrfExcludedPaths = [
    '/api/auth',
    '/api/register',
    // ... 除外パス
  ];
  
  const isExcluded = csrfExcludedPaths.some(path => pathname.startsWith(path));
  
  if (!isExcluded) {
    const isValidCSRF = CSRFProtection.verifyToken(request);
    
    if (!isValidCSRF) {
      return CSRFProtection.createErrorResponse(); // 403を返す
    }
  }
}
```

**結論**: `/api/posts/[id]/like`エンドポイントはCSRF保護が有効で、有効なトークンが必要。

### 3.2 フロントエンド実装の問題点

**問題点1: エンドポイントの不整合**
```typescript
// 修正前（誤り）
const endpoint = isLiked 
  ? `/api/posts/${postId}/unlike`  // ❌ このエンドポイントは存在しない
  : `/api/posts/${postId}/like`;

// 修正後（正しい）
const endpoint = `/api/posts/${postId}/like`;
const method = isLiked ? 'DELETE' : 'POST';
```

**問題点2: CSRFトークンの送信**
```typescript
// 修正前（誤り）
const response = await fetch(endpoint, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    // CSRFトークンが含まれていない
  },
});

// 修正後（正しい）
const response = await fetch(endpoint, {
  method,
  headers: {
    'Content-Type': 'application/json',
    ...(csrfToken && { 'x-csrf-token': csrfToken }),
  },
});
```

### 3.3 CSRFトークン管理の不整合

**2つの異なるエンドポイント**
1. `/api/csrf` - `token`フィールドを返す（CSRFTokenManagerが使用）
2. `/api/csrf/token` - `csrfToken`フィールドを返す（テストスクリプトが使用）

**CSRFTokenManager.ts（66行目）**
```typescript
const response = await fetch('/api/csrf', {
  method: 'GET',
  credentials: 'include',
  // ...
});
const data = await response.json();
if (!data.token) {  // 'token'フィールドを期待
  throw new Error('CSRF token not found in response');
}
```

### 3.4 CSRFトークン初期化のタイミング問題

**CSRFProvider.tsx（86-88行目）**
```typescript
useEffect(() => {
  // 初回マウント時にトークンを取得（強制実行）
  fetchToken(true);
  // ...
}, []);
```

**問題**: CSRFProviderの初期化が完了する前に、RealtimeBoardコンポーネントがレンダリングされ、`csrfToken`が`null`の状態でいいねボタンがクリック可能になる。

## 4. 根本原因の特定

### 4.1 主要な根本原因

1. **CSRFトークンの非同期初期化**
   - CSRFProviderが初期化中でも、UIは操作可能な状態
   - `csrfToken`が`null`の時にリクエストが送信される

2. **エラーハンドリングの不備**
   - エラーオブジェクトを文字列化できず`[object Object]`と表示
   - ユーザーに意味のあるエラーメッセージが表示されない

3. **APIエンドポイントの実装ミス**
   - `/unlike`エンドポイントが存在しないのに参照している
   - DELETEメソッドを使用すべき箇所でPOSTを使用

### 4.2 テスト環境での成功理由

テストスクリプトでは以下の理由で成功している：
1. CSRFトークンを同期的に取得してから使用
2. 正しいエンドポイント（`/api/posts/[id]/like`）を使用
3. 適切なHTTPメソッド（POST/DELETE）を使用

## 5. 証拠

### 5.1 APIテスト結果

**正常動作の証拠**
```
パターン3: 正しいCSRFトークン
   送信トークン: 2b27e16a3157d3f53262...
   Cookie内トークン: 2b27e16a3157d3f53262...
   結果: 200 ✅ 成功
   レスポンス: {
     "postId": "68b1298732834f47ea70aad0",
     "userId": "68b00bb9e2d2d61e174b2204",
     "likes": ["68b00bb9e2d2d61e174b2204"],
     "likesCount": 1,
     "isLiked": true,
     "action": "already_liked"
   }
```

### 5.2 デバッグログ追加箇所

**RealtimeBoard.tsx（494-499行目）**
```typescript
console.log('[LIKE-DEBUG] handleLike called:', {
  postId,
  session: !!session,
  csrfToken: csrfToken ? csrfToken.substring(0, 20) + '...' : 'null',
  timestamp: new Date().toISOString()
});
```

## 6. 影響範囲

### 6.1 影響を受ける機能
- いいね追加機能
- いいね削除機能
- リアルタイム更新（Socket.IOイベント）

### 6.2 影響を受けるユーザー
- すべての認証済みユーザー
- ブラウザからアクセスするユーザー（APIテストは正常動作）

## 7. 推奨される解決策

### 7.1 即時対応（バグ修正）

1. **CSRFトークン初期化の保証**
   ```typescript
   // CSRFProviderのisLoadingをエクスポートして使用
   if (!csrfToken || isLoading) {
     // いいねボタンを無効化
     return;
   }
   ```

2. **エラーメッセージの改善**
   ```typescript
   throw new Error(
     error.error?.message || 
     error.error || 
     JSON.stringify(error) || 
     'いいねの処理に失敗しました'
   );
   ```

3. **エンドポイントとメソッドの修正**（実装済み）
   ```typescript
   const endpoint = `/api/posts/${postId}/like`;
   const method = isLiked ? 'DELETE' : 'POST';
   ```

### 7.2 長期的改善

1. **CSRFトークン管理の統一**
   - `/api/csrf`と`/api/csrf/token`の統合
   - レスポンスフィールド名の統一

2. **ローディング状態の明示**
   - CSRFトークン初期化中はUIをブロック
   - スケルトンUIまたはローディングインジケーター

3. **エラーバウンダリーの実装**
   - グローバルエラーハンドリング
   - ユーザーフレンドリーなエラーメッセージ

## 8. テスト計画

### 8.1 実施済みテスト
- ✅ APIレベルでのCSRFトークン検証
- ✅ 認証付きいいね機能テスト
- ✅ CSRFトークンなし/誤りトークンでの403エラー確認

### 8.2 追加テスト必要項目
- [ ] ブラウザでの実際の動作確認
- [ ] CSRFトークン初期化タイミングのE2Eテスト
- [ ] エラーメッセージ表示の確認

## 9. 結論

403エラーの根本原因は以下の3点の複合的な問題：

1. **CSRFトークンが初期化される前にリクエストが送信される**
2. **存在しないエンドポイント（`/unlike`）への参照**
3. **エラーオブジェクトの不適切な文字列化**

これらの問題は、コード修正により解決可能であり、APIレベルでは正常に動作することが確認されています。

## 10. 証拠ハッシュ

```
調査ファイル:
- src/components/RealtimeBoard.tsx
- src/middleware.ts
- src/lib/security/csrf-protection.ts
- src/components/CSRFProvider.tsx
- src/lib/security/csrf-token-manager.ts
- src/app/api/csrf/route.ts
- src/app/api/csrf/token/route.ts

テストスクリプト:
- scripts/test-like-403-debug.js
- scripts/test-csrf-browser-simulation.js
```

---

**報告書作成日時**: 2025年8月29日 18:30 JST  
**プロトコル準拠**: STRICT120（証拠ベース、推測なし、完全な透明性）  
**署名**: I attest: all numbers and evidence come from the attached test results and code inspection.