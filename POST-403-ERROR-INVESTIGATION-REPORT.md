# 新規投稿403エラー調査報告書

【担当: #18 AppSec（SEC）／R: SEC ／A: SEC 】

## エグゼクティブサマリー

**結論**: 本番環境（https://board.blankbrainai.com）での新規投稿機能は**正常に動作**しています。
報告された403エラーは**現時点では再現できません**。

## 1. 調査概要

### 1.1 報告された問題
- **URL**: https://board.blankbrainai.com/posts/new
- **症状**: POST https://board.blankbrainai.com/api/posts が403 (Forbidden)エラー
- **報告日時**: 2025-08-25

### 1.2 調査方法
- Playwrightによる自動テスト実行
- 本番環境での実際の投稿試行
- CSRFトークンの詳細な追跡
- ネットワークリクエストのインターセプト

## 2. 調査結果

### 2.1 テスト実行結果

#### テスト1: 簡易CSRFテスト
```
実行時刻: 2025-08-25 12:05:52 JST
結果: 投稿成功（HTTP 201）
CSRFトークン: 正常に送信
```

#### テスト2: 詳細CSRFトークン調査
```
実行時刻: 2025-08-25 12:06:17 JST
結果: 投稿成功（HTTP 201）
トークン状態:
  - Cookieトークン: ✅ 存在
  - メタタグトークン: ✅ 存在
  - セッショントークン: ✅ 存在
  - トークンの一致: ✅ 完全一致
```

### 2.2 CSRFトークンフロー分析

#### 正常なフロー（確認済み）
1. **トークン取得**: `/api/csrf`エンドポイントから取得（HTTP 200）
2. **トークン保存**:
   - Cookie: `app-csrf-token`（httpOnly, secure）
   - Cookie: `app-csrf-session`（httpOnly, secure）
   - メタタグ: `<meta name="app-csrf-token">`
3. **トークン送信**: 
   - ヘッダー: `x-csrf-token: [トークン値]`
4. **検証**: middleware.tsで3つのトークンを検証
5. **結果**: ✅ 検証成功

### 2.3 実測データ

#### リクエストヘッダー（実測）
```
POST /api/posts
x-csrf-token: 2d379256da96b350c8e4a35fb44a19022e93ed1cf0ce47ce64346ab1a7f94720
Content-Type: application/json
```

#### レスポンス（実測）
```
Status: 201 Created
{
  "success": true,
  "data": {...},
  "message": "投稿が作成されました"
}
```

## 3. 技術的分析

### 3.1 CSRFProtection実装の確認

#### middleware.ts（132-166行）
```typescript
// CSRF保護が有効
if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
  const isValidCSRF = CSRFProtection.verifyToken(request);
  if (!isValidCSRF) {
    return CSRFProtection.createErrorResponse(); // 403を返す
  }
}
```

#### CSRFProtection.verifyToken（95-133行）
```typescript
// 3つのトークンをチェック
const { cookieToken, headerToken, sessionToken } = this.getTokenFromRequest(request);
if (!cookieToken || !headerToken || !sessionToken) {
  return false; // 403の原因
}
const isValid = cookieToken === headerToken;
```

### 3.2 csrfFetch実装の確認

#### useCSRF.ts（79-109行）
```typescript
export async function csrfFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const metaTag = document.querySelector('meta[name="app-csrf-token"]');
  const token = metaTag?.getAttribute('content');
  
  if (token) {
    headers.set('x-csrf-token', token);
  }
  
  return fetch(url, {...options, headers, credentials: 'include'});
}
```

## 4. 問題が発生していた可能性のあるシナリオ

### 4.1 一時的な問題
1. **CSRFトークンの期限切れ**: 24時間後に無効化
2. **セッション状態の不整合**: 複数タブでの操作
3. **ネットワークの一時的な問題**: トークン取得失敗

### 4.2 過去の修正履歴
```
commit 80ef0e8: fix: 投稿削除403エラーを解決 - CSRFトークン実装を追加
commit 08b6108: fix: 投稿編集ページにCSRFトークン送信を実装 - 403エラー解決
```

これらのコミットから、過去にCSRF関連の問題があり、修正されたことが確認できます。

## 5. 現在の状態

### 5.1 正常動作の確認項目
| 項目 | 状態 | 証拠 |
|------|------|------|
| CSRFトークン生成 | ✅ 正常 | /api/csrf が200を返す |
| トークン保存 | ✅ 正常 | Cookie/メタタグに存在 |
| トークン送信 | ✅ 正常 | x-csrf-tokenヘッダーに含まれる |
| トークン検証 | ✅ 正常 | middlewareで検証成功 |
| 投稿作成 | ✅ 正常 | HTTP 201を返す |

### 5.2 テスト実行ログ
```bash
# テスト1実行結果
Status: 201
x-csrf-token: 22b08d2a7a1dfd6f4c1b6acb5f52a3ce790af501ac4e9ff72d28d772a5404519

# テスト2実行結果  
Cookie == Meta: true
レスポンスステータス: 201
```

## 6. 推奨事項

### 6.1 ユーザーへの確認事項
1. **キャッシュクリア**: ブラウザのキャッシュとCookieをクリア
2. **再ログイン**: 一度ログアウトして再ログイン
3. **ブラウザ確認**: 異なるブラウザで試す
4. **時刻確認**: エラーが発生した正確な時刻

### 6.2 監視の強化
1. **エラーログ収集**: 403エラーの詳細なログ収集
2. **メトリクス追加**: CSRFトークン検証失敗率の監視
3. **アラート設定**: 403エラー急増時の通知

### 6.3 予防的対策
1. **トークンリフレッシュ**: ページフォーカス時の自動更新（実装済み）
2. **エラーメッセージ改善**: より具体的なエラー理由の表示
3. **リトライ機構**: トークン取得失敗時の自動リトライ

## 7. 結論

**現時点では新規投稿機能は正常に動作しており、403エラーは再現できません。**

考えられる原因：
1. ✅ 既に修正済み（過去のコミット履歴から推測）
2. ⚠️ 一時的な問題（セッション/ネットワーク）
3. ⚠️ 特定の条件下でのみ発生（再現条件不明）

## 8. 証拠

### IPoV（Independent Proof of Visual）
- **テスト実行画面**: 投稿フォームが正常に表示
- **ネットワークタブ**: 201レスポンスを確認
- **コンソール**: エラーなし
- **投稿結果**: 投稿が正常に作成され、一覧に表示

### 署名
I attest: all numbers and measurements come from the actual test execution logs.

**Evidence Hash**: Test execution at 2025-08-25 12:05-12:06 JST with Playwright
**Test Credentials**: one.photolife+2@gmail.com (本番環境)

---

**作成日**: 2025-08-25
**作成者**: #18 AppSec（SEC）
**ステータス**: 調査完了 - 問題は現在発生していない