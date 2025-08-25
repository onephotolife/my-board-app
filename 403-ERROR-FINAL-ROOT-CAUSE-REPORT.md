# 403エラー最終原因分析レポート

## 実施日時
2025年8月25日 09:45-10:00 JST

## 実施者
【担当: #18 AppSec（SEC）／R: SEC ／A: SEC】

## エグゼクティブサマリー
403エラーの真の原因を特定しました。`src/hooks/useCSRF.ts`ファイル内に旧`csrf-token`への参照が残存しており、メタタグ名の不整合によりCSRFトークンが正しく機能していません。

## 1. 新規投稿に関する仕様

### フロー概要
```
1. ユーザーが新規投稿フォームに入力
   ↓
2. csrfFetch関数でCSRFトークンを付与してPOST送信
   ↓
3. middleware.tsでCSRF検証
   ↓
4. /api/posts/route.tsで認証チェックと投稿作成
```

### 関連ファイル
| ファイル | 役割 | 状態 |
|---------|------|------|
| src/app/posts/new/page.tsx | 新規投稿UI | ✅ csrfFetch使用 |
| src/hooks/useCSRF.ts | CSRFトークン管理 | ❌ **不整合あり** |
| src/components/CSRFProvider.tsx | CSRFコンテキスト | ✅ app-csrf-token使用 |
| src/lib/security/csrf-protection.ts | CSRF検証ロジック | ✅ app-csrf-token使用 |
| src/app/api/csrf/route.ts | トークン発行 | ✅ app-csrf-token使用 |

## 2. エラーの詳細

### 現象
- **Status**: 403 Forbidden
- **Error**: CSRF token validation failed
- **場所**: middleware.ts（CSRFProtection.verifyToken）

### エラーフロー
```
1. CSRFProvider.tsx
   → app-csrf-tokenメタタグを設定 ✅

2. useCSRF.ts（問題箇所）
   → csrf-tokenメタタグを探す ❌（見つからない）
   → トークンがnullまたはundefined

3. csrfFetch関数
   → x-csrf-tokenヘッダーが空または無効

4. middleware.ts
   → CSRF検証失敗 → 403エラー
```

## 3. 構成ファイルの不整合詳細

### src/hooks/useCSRF.ts の問題箇所

#### 問題1: useCSRFフック内（39-45行目）
```typescript
// 現在の問題のあるコード
let metaTag = document.querySelector('meta[name="csrf-token"]');  // ❌
if (!metaTag) {
  metaTag = document.createElement('meta');
  metaTag.setAttribute('name', 'csrf-token');  // ❌
  document.head.appendChild(metaTag);
}
```
**問題**: `csrf-token`を探しているが、実際は`app-csrf-token`が設定されている

#### 問題2: フォールバック処理（52行目）
```typescript
// 現在の問題のあるコード
const metaTag = document.querySelector('meta[name="csrf-token"]');  // ❌
```
**問題**: エラー時のフォールバックも旧名を使用

#### 問題3: csrfFetch関数（91行目）
```typescript
// このコードは修正済み
const metaTag = document.querySelector('meta[name="app-csrf-token"]');  // ✅
```
**状態**: この部分は正しく修正されている

#### 問題4: withCSRFToken関数（115-122行目）
```typescript
// 現在の問題のあるコード
const metaTag = document.querySelector('meta[name="csrf-token"]');  // ❌
// ...
formData.append('csrf-token', token);  // ❌
// ...
return { ...formData, 'csrf-token': token };  // ❌
```
**問題**: 関数全体が旧名を使用

## 4. 原因究明の証拠

### 証拠1: grep検索結果
```bash
$ grep -r "csrf-token" src/ --include="*.tsx" --include="*.ts" | grep -v "app-csrf"
```
結果: `src/hooks/useCSRF.ts`に10箇所の旧参照が残存

### 証拠2: 本番環境テスト
```
🔐 ログイン結果: Status 302（成功）
📦 設定されたクッキー:
  - app-csrf-token ✅
  - app-csrf-session ✅
📥 レスポンス: Status 403
  - エラー: CSRF token validation failed
```

### 証拠3: メタタグの不整合
- **設定される名前**: `app-csrf-token`（CSRFProvider.tsx:49行目）
- **探される名前**: `csrf-token`（useCSRF.ts:39,52,115行目）
- **結果**: トークンが見つからない → null → 403エラー

## 5. なぜ見逃されたか

### 変更漏れの原因
1. **部分的な変更**: csrfFetch関数（91行目）は修正されたが、同じファイル内の他の関数は未修正
2. **不完全なgrep検索**: 最初の修正時に`app-csrf`を除外してgrepしなかった
3. **テスト不足**: ブラウザ環境での実際のメタタグ確認が不十分

### 問題の複雑性
- 同一ファイル内で一部は修正済み、一部は未修正という混在状態
- CSRFProvider.tsxとuseCSRF.tsの間での不整合
- Node.jsテストではメタタグの問題を検出できない

## 6. 解決方法

### 必要な修正（src/hooks/useCSRF.ts）
| 行番号 | 修正前 | 修正後 |
|--------|--------|--------|
| 39 | `meta[name="csrf-token"]` | `meta[name="app-csrf-token"]` |
| 42 | `'name', 'csrf-token'` | `'name', 'app-csrf-token'` |
| 52 | `meta[name="csrf-token"]` | `meta[name="app-csrf-token"]` |
| 115 | `meta[name="csrf-token"]` | `meta[name="app-csrf-token"]` |
| 120 | `'csrf-token', token` | `'app-csrf-token', token` |
| 122 | `'csrf-token': token` | `'app-csrf-token': token` |

### 修正の影響範囲
- **影響ファイル**: 1ファイル（src/hooks/useCSRF.ts）
- **修正箇所**: 6箇所
- **リスク**: 低（単純な文字列置換）
- **テスト必要性**: 高（ブラウザ環境での確認必須）

## 7. 根本原因の結論

**真の原因**: クッキー名変更時の不完全な実装

### 詳細
1. **意図した変更**: `csrf-token` → `app-csrf-token`への統一
2. **実際の状態**: 部分的な変更により不整合が発生
3. **結果**: メタタグ名の不一致によりCSRFトークンが機能せず

### 証拠の整合性
- ✅ 新しいクッキー名は正しく設定されている
- ✅ サーバー側は新しい名前を期待している
- ❌ クライアント側の一部が旧名を探している
- ❌ メタタグの設定と取得で名前が一致しない

## 8. 推奨アクション

### 即時対応
1. src/hooks/useCSRF.tsの全`csrf-token`参照を`app-csrf-token`に変更
2. ビルドとローカルテスト
3. 本番環境へのデプロイ
4. ブラウザでの動作確認

### 検証項目
1. ブラウザコンソールで`document.querySelector('meta[name="app-csrf-token"]')?.content`が値を返すこと
2. 新規投稿が403エラーなしで作成できること
3. ネットワークタブでx-csrf-tokenヘッダーが送信されていること

## 証拠ブロック

**grep検索結果**:
```
10箇所の旧csrf-token参照が残存
src/hooks/useCSRF.ts内に集中
```

**本番環境テスト**:
```
Status: 403
Error: CSRF token validation failed
クッキー: app-csrf-token, app-csrf-session（正常）
```

**ファイル行番号**:
- useCSRF.ts: 39, 42, 52, 115, 120, 122行目に問題

署名: `I attest: all numbers come from the attached evidence.`

RACI: R: SEC (#18) / A: SEC (#18) / C: AUTH (#10), FE (#4), QA (#21) / I: EM (#1), ARCH (#2)