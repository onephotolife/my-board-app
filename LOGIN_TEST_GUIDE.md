# 📋 ログイン機能包括的テストガイド
**20人天才エンジニア会議により策定**

## 🎯 テスト目的
Next.js 15 + NextAuth.js v5で実装されたログイン機能の完全性・セキュリティ・ユーザビリティを検証

## 🔧 事前準備

### 環境セットアップ
```bash
# 1. 環境変数確認
echo "AUTH_SECRET: ${AUTH_SECRET:0:10}..." 
echo "MONGODB_URI: ${MONGODB_URI}"

# 2. サーバー起動
npm run dev

# 3. MongoDB接続確認
npm run db:check
```

### テストアカウント作成
```bash
# テスト用アカウント作成スクリプトを実行
node scripts/create-test-accounts.js
```

**作成されるアカウント:**
| メール | パスワード | 状態 |
|--------|----------|------|
| verified@test.com | Test123! | メール確認済み |
| unverified@test.com | Test123! | メール未確認 |
| admin@test.com | Admin123! | 管理者権限・確認済み |

---

## 📝 テスト項目詳細

### TEST-1: 正常なログインフロー
**担当:** フロントエンドリード + QAリード

#### 手順:
1. ブラウザで `http://localhost:3000/auth/signin` にアクセス
2. メール: `verified@test.com`、パスワード: `Test123!` を入力
3. 「ログイン」ボタンをクリック

#### チェックポイント:
- [ ] **即座性**: 2秒以内にレスポンス（パフォーマンスエンジニア）
- [ ] **リダイレクト**: `/dashboard` へ自動遷移（ソリューションアーキテクト）
- [ ] **セッション**: DevToolsでCookie `authjs.session-token` 確認（セキュリティエンジニア）
- [ ] **UI更新**: ヘッダーにユーザー名表示（UIエンジニア）
- [ ] **エラーなし**: コンソールにエラーなし（QAリード）

#### 期待される結果:
```javascript
// DevTools > Application > Cookies
authjs.session-token: eyJ... (JWT形式)
authjs.csrf-token: xxx...

// Network タブ
POST /api/auth/callback/credentials → 200 OK
GET /dashboard → 200 OK
```

---

### TEST-2: 間違ったパスワード
**担当:** バックエンドエンジニア（認証） + セキュリティエンジニア

#### 手順:
1. `http://localhost:3000/auth/signin` にアクセス
2. メール: `verified@test.com`、パスワード: `WrongPass!` を入力
3. 「ログイン」ボタンをクリック

#### チェックポイント:
- [ ] **エラー表示**: 「メールアドレスまたはパスワードが間違っています」（UIエンジニア）
- [ ] **残留**: ログインページに留まる（フロントエンドリード）
- [ ] **入力保持**: メールアドレスは残る（UXベストプラクティス）
- [ ] **タイミング攻撃対策**: レスポンス時間が一定（セキュリティエンジニア）
- [ ] **ログ記録**: サーバーログに失敗記録（SRE）

#### 期待される結果:
```javascript
// UIエラー表示
{
  type: 'error',
  message: 'メールアドレスまたはパスワードが間違っています',
  detail: 'もう一度お試しください'
}

// サーバーログ
[Auth] Login failed: verified@test.com - Invalid password
```

---

### TEST-3: 未認証メールアドレス
**担当:** バックエンドエンジニア（会員管理） + QAオートメーション

#### 手順:
1. `http://localhost:3000/auth/signin` にアクセス
2. メール: `unverified@test.com`、パスワード: `Test123!` を入力
3. 「ログイン」ボタンをクリック

#### チェックポイント:
- [ ] **エラー種別**: 「メール確認が必要です」表示（バックエンドリード）
- [ ] **リダイレクト**: `/auth/email-not-verified` へ遷移（フロントエンドリード）
- [ ] **再送信ボタン**: 確認メール再送信UI表示（UIエンジニア）
- [ ] **セッションなし**: Cookieにトークンなし（セキュリティエンジニア）
- [ ] **アクセス制限**: `/dashboard` 直接アクセス不可（ミドルウェア検証）

#### 期待される結果:
```javascript
// リダイレクト先
Location: /auth/email-not-verified

// UIメッセージ
{
  title: 'メール確認が必要です',
  message: 'アカウントを有効化するため、メールをご確認ください',
  action: <EmailResendButton />
}
```

---

### TEST-4: ログアウト処理
**担当:** フロントエンドエンジニア + SRE

#### 手順:
1. ログイン済み状態で開始
2. ヘッダーのメニューボタン（ハンバーガー）をクリック
3. ドロワー内の「ログアウト」ボタンをクリック

#### チェックポイント:
- [ ] **即座反映**: UIが未ログイン状態に変化（フロントエンドリード）
- [ ] **Cookie削除**: `authjs.session-token` 削除確認（セキュリティエンジニア）
- [ ] **リダイレクト**: トップページ `/` へ遷移（ソリューションアーキテクト）
- [ ] **保護ページ**: `/dashboard` アクセス → ログインページへ（ミドルウェア）
- [ ] **完全性**: リロード後も未ログイン維持（QAリード）

#### 期待される結果:
```javascript
// signOut実行後
await signOut({ redirect: false })

// Cookieの状態
authjs.session-token: (削除済み)
authjs.csrf-token: (削除済み)

// UIの変化
ヘッダー: "ログイン" ボタン表示
ドロワー: ユーザー情報非表示
```

---

### TEST-5: セッション維持の確認
**担当:** プラットフォームエンジニア + SRE

#### 手順:
1. ログイン後、異なるページを遷移
   - `/` → `/dashboard` → `/board` → `/profile`
2. ブラウザをリロード（F5）
3. 新しいタブで同じサイトを開く
4. 30分間放置後に操作再開

#### チェックポイント:
- [ ] **ページ遷移**: セッション維持（全ページ）（プラットフォーム）
- [ ] **リロード耐性**: F5後もログイン維持（フロントエンドリード）
- [ ] **タブ間同期**: 新タブでも認証済み（セッション管理）
- [ ] **有効期限**: 30日間維持設定確認（バックエンドリード）
- [ ] **自動更新**: アクティブ時の延長（SRE）

#### 期待される結果:
```javascript
// JWTペイロード（デコード後）
{
  "id": "507f1f77bcf86cd799439011",
  "email": "verified@test.com",
  "name": "Test User",
  "emailVerified": true,
  "iat": 1703001600,
  "exp": 1705593600  // 30日後
}
```

---

### TEST-6: ヘッダー表示の切り替え
**担当:** UIエンジニア + アクセシビリティエンジニア

#### 手順:
1. 未ログイン状態でヘッダー確認
2. ログイン実行
3. ログイン後のヘッダー確認
4. レスポンシブ表示確認（モバイル/タブレット/デスクトップ）

#### チェックポイント:

**未ログイン時:**
- [ ] 「ログイン」ボタン表示
- [ ] ユーザー情報非表示
- [ ] メニューに「ログイン」項目

**ログイン後:**
- [ ] ユーザー名表示（省略対応）
- [ ] アバター表示（イニシャル）
- [ ] 「掲示板」「ダッシュボード」ボタン
- [ ] ドロワーにログアウトボタン

**レスポンシブ:**
- [ ] モバイル: アイコンのみ表示
- [ ] タブレット: 一部テキスト表示
- [ ] デスクトップ: フル表示

**アクセシビリティ:**
- [ ] キーボード操作可能（Tab/Enter）
- [ ] スクリーンリーダー対応
- [ ] aria-label適切設定
- [ ] フォーカス順序正常

#### 期待される結果:
```jsx
// 未ログイン時のヘッダー
<Button href="/auth/signin">ログイン</Button>

// ログイン後のヘッダー
<Box>
  <Typography>{session.user?.name}さん</Typography>
  <Avatar>{getInitials(session.user?.name)}</Avatar>
</Box>
```

---

## 🤖 自動テスト実行

### E2Eテスト（Playwright）
```bash
# 全ログインテスト実行
npm run test:e2e:login

# 個別実行
npx playwright test login-logout.spec.ts
```

### 統合テスト
```bash
# Jest統合テスト
npm run test:integration:auth
```

### パフォーマンステスト
```bash
# k6負荷テスト
k6 run scripts/load-test-login.js
```

---

## 📊 テスト結果記録テンプレート

```markdown
## テスト実施記録

**日時:** 2024-XX-XX HH:MM
**実施者:** [名前]
**環境:** Development / Staging / Production
**ブラウザ:** Chrome 120 / Firefox 121 / Safari 17

### 結果サマリー
- TEST-1 正常ログイン: ✅ PASS / ❌ FAIL
- TEST-2 パスワード誤り: ✅ PASS / ❌ FAIL
- TEST-3 未認証メール: ✅ PASS / ❌ FAIL
- TEST-4 ログアウト: ✅ PASS / ❌ FAIL
- TEST-5 セッション維持: ✅ PASS / ❌ FAIL
- TEST-6 UI切り替え: ✅ PASS / ❌ FAIL

### 発見された問題
1. [問題の説明]
   - 再現手順:
   - 期待値:
   - 実際の結果:
   - 優先度: Critical / High / Medium / Low

### パフォーマンス指標
- ログイン処理時間: XXXms
- ページ遷移時間: XXXms
- セッション確認時間: XXXms
```

---

## 🔍 トラブルシューティング

### よくある問題と対処法

| 問題 | 原因 | 対処法 |
|------|------|--------|
| ログインできない | AUTH_SECRET未設定 | `.env.local`確認 |
| セッション消失 | Cookie設定問題 | `httpOnly`, `sameSite`確認 |
| リダイレクト失敗 | callbackUrl不正 | URLエンコーディング確認 |
| CSRF エラー | トークン不一致 | ミドルウェア設定確認 |

### デバッグコマンド
```bash
# セッション確認
curl http://localhost:3000/api/auth/session

# MongoDB接続確認
npm run db:status

# ログ確認
tail -f logs/auth.log
```

---

## 📈 品質基準

**合格基準（QAリード設定）:**
- 全テストケース合格率: 100%
- ログイン成功率: 99.9%以上
- レスポンス時間: 2秒以内
- エラー率: 0.1%以下
- セキュリティ脆弱性: 0件

**パフォーマンス基準（パフォーマンスエンジニア設定）:**
- LCP: < 2.5秒
- FID: < 100ms
- CLS: < 0.1
- TTFB: < 600ms

---

**作成:** 20人天才エンジニア会議
**最終更新:** 2024年現在