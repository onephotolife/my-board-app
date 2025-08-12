# 🚀 認証テスト実行ガイド

## クイックスタート

### 1. 自動テストの実行

```bash
# サーバーを起動
npm run dev

# 別のターミナルで自動テストを実行
node scripts/test-auth.js
```

### 2. 手動テストの実行

#### ステップ 1: ブラウザ準備
1. シークレット/プライベートウィンドウを開く
2. 開発者ツールを開く（F12）
3. Networkタブを開いてリダイレクトを監視

#### ステップ 2: 基本テスト
```bash
# 以下のURLに順番にアクセス
http://localhost:3000/dashboard     # → /auth/signin へリダイレクト
http://localhost:3000/profile        # → /auth/signin へリダイレクト
http://localhost:3000/posts/new      # → /auth/signin へリダイレクト
```

#### ステップ 3: コンソールで確認
```javascript
// 開発者ツールのコンソールで実行

// 1. CallbackURLの確認
const params = new URLSearchParams(window.location.search);
console.log('Callback URL:', params.get('callbackUrl'));

// 2. セッション状態の確認
fetch('/api/auth/session')
  .then(res => res.json())
  .then(data => console.log('Session:', data));

// 3. CSRFトークンの確認
fetch('/api/auth/csrf')
  .then(res => res.json())
  .then(data => console.log('CSRF Token:', data.csrfToken));
```

### 3. テストユーザーの作成

```bash
# テストユーザー作成スクリプトを実行
node scripts/create-test-user.js
```

または手動で：
1. `/auth/signup` にアクセス
2. 以下の情報で登録:
   - Email: test@example.com
   - Password: TestPassword123!
   - Name: Test User

### 4. ログインフローのテスト

1. 保護されたページ（`/dashboard`）にアクセス
2. サインインページへリダイレクトされることを確認
3. URLに `callbackUrl=/dashboard` が含まれることを確認
4. ログイン情報を入力してサインイン
5. 自動的に `/dashboard` へ遷移することを確認

## 📋 チェックリスト

### 必須テスト項目
- [ ] 未認証でのアクセス拒否
- [ ] サインインページへの自動リダイレクト
- [ ] CallbackURLの保持
- [ ] ログイン後の元ページへの復帰
- [ ] ローディング状態の表示
- [ ] エラーメッセージの表示

### 推奨テスト項目
- [ ] 複数タブでのセッション共有
- [ ] ブラウザリロード後のセッション維持
- [ ] ログアウト後のアクセス制限
- [ ] APIエンドポイントの保護
- [ ] メール未確認ユーザーの制限

## 🛠️ トラブルシューティング

### サーバーが起動しない
```bash
# ポートが使用中の場合
lsof -i :3000
kill -9 [PID]

# 依存関係の再インストール
rm -rf node_modules
npm install
```

### リダイレクトループが発生
```javascript
// コンソールでリダイレクト回数を確認
console.log('Redirect Count:', performance.navigation.redirectCount);

// クッキーをクリア
document.cookie.split(";").forEach(c => {
  document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
});
```

### セッションが保持されない
```javascript
// クッキーの確認
document.cookie.split(';').forEach(cookie => {
  console.log(cookie.trim());
});

// セッション情報の詳細確認
fetch('/api/auth/session', { credentials: 'include' })
  .then(res => res.json())
  .then(console.log);
```

## 📊 テスト結果の記録

テスト完了後、以下の情報を記録してください：

```markdown
## テスト実行記録

日時: [YYYY-MM-DD HH:MM]
環境: [Development/Staging/Production]
ブラウザ: [Chrome/Firefox/Safari] v[XX]

### テスト結果
- ✅ 未認証アクセスの拒否: PASS
- ✅ リダイレクト機能: PASS
- ✅ ログインフロー: PASS
- ✅ セッション管理: PASS
- ✅ API保護: PASS
- ✅ UI/UX: PASS

### 発見された問題
- [問題がある場合は記載]

### 備考
- [特記事項があれば記載]
```

## 🎯 完了基準

以下のすべてが確認できたらテスト完了です：

1. **すべての保護されたページで認証が機能している**
2. **適切なエラーハンドリングが実装されている**
3. **ユーザー体験が損なわれていない**
4. **セキュリティ上の脆弱性がない**

---

テストで問題を発見した場合は、詳細なエラーログと再現手順を記録してください。