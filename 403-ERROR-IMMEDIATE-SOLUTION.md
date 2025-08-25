# 403エラー即時解決方案

## 実施日時
2025年8月25日 11:30 JST

## 実施者
【担当: #18 AppSec（SEC）／R: SEC ／A: SEC】

## 解決方針
最小の変更で最大の効果を得るため、**SameSite属性の調整**を優先実施します。

## 優先度1: SameSite属性の変更

### 対象ファイル
1. src/app/api/csrf/route.ts
2. src/lib/security/csrf-protection.ts

### 修正内容

#### 1. src/app/api/csrf/route.ts
```typescript
// 修正前（28行目）
sameSite: 'strict',

// 修正後
sameSite: 'lax',  // strictからlaxに変更

// 修正前（39行目）
sameSite: 'strict',

// 修正後  
sameSite: 'lax',  // strictからlaxに変更
```

#### 2. src/lib/security/csrf-protection.ts
```typescript
// 修正前（40行目）
sameSite: 'strict',

// 修正後
sameSite: 'lax',  // strictからlaxに変更

// 修正前（49行目）
sameSite: 'strict',

// 修正後
sameSite: 'lax',  // strictからlaxに変更
```

### 変更の根拠
- **strict**: 同一サイトからのリクエストのみクッキー送信
- **lax**: 通常のナビゲーション（リンククリック、フォーム送信）でもクッキー送信
- CSRFProviderの初期化タイミングによる問題を回避

## 優先度2: セッショントークンの分離（オプション）

### 対象ファイル
src/app/api/csrf/route.ts

### 修正内容
```typescript
// 修正前（33-42行目）
response.cookies.set({
  name: 'app-csrf-session',
  value: token, // 同じトークンを使用
  ...
});

// 修正後
const sessionToken = crypto.randomBytes(16).toString('hex');
response.cookies.set({
  name: 'app-csrf-session',
  value: sessionToken, // 別のトークンを使用
  ...
});
```

## テスト手順

### 1. 修正後のローカルテスト
```bash
node test-csrf-detailed.js
```

### 2. デプロイ
```bash
git add -A
git commit -m "fix: CSRFクッキーのSameSite属性をlaxに変更して403エラーを解決"
git push
```

### 3. 本番環境テスト
```bash
# 60秒待機後
node test-csrf-detailed.js
```

### 4. ブラウザテスト
1. https://board.blankbrainai.com/posts/new にアクセス
2. ログイン: one.photolife+2@gmail.com / ?@thc123THC@?
3. 新規投稿を作成
4. 成功確認

## 期待される結果

### 変更前
- SameSite=strict により、一部の状況でクッキーが送信されない
- 403 Forbidden エラー

### 変更後
- SameSite=lax により、通常のフォーム送信でクッキーが送信される
- 投稿が正常に作成される

## リスク評価
- **セキュリティ**: laxでも十分なCSRF保護を提供
- **互換性**: すべてのモダンブラウザで動作
- **影響範囲**: CSRFトークン処理のみ

## 実行承認
上記の修正を実行してよろしいでしょうか？

署名: `I attest: all numbers come from the attached evidence.`

RACI: R: SEC (#18) / A: SEC (#18) / C: AUTH (#10), FE (#4), QA (#21) / I: EM (#1), ARCH (#2)