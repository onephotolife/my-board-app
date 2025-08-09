# Gmail アプリパスワード設定ガイド

## 🔐 アプリパスワードの正しい設定方法

### ステップ1: 2段階認証を有効にする
1. [Googleアカウントのセキュリティ](https://myaccount.google.com/security)にアクセス
2. 「2段階認証プロセス」をクリック
3. 指示に従って2段階認証を有効化

### ステップ2: アプリパスワードを生成
1. [アプリパスワード](https://myaccount.google.com/apppasswords)にアクセス
2. Googleアカウントのパスワードを入力してログイン
3. 「アプリを選択」→「メール」を選択
4. 「デバイスを選択」→「その他（カスタム名）」
5. 「Board App」と入力して「生成」

### ステップ3: パスワードをコピー
Googleが表示するパスワード例：
```
abcd efgh ijkl mnop
```

### ステップ4: .env.localに設定

**重要: スペースを削除して入力！**

```env
# ❌ 間違い（スペースあり）
GMAIL_APP_PASSWORD=abcd efgh ijkl mnop

# ❌ 間違い（ハイフンあり）  
GMAIL_APP_PASSWORD=abcd-efgh-ijkl-mnop

# ✅ 正解（スペース・ハイフンなし）
GMAIL_APP_PASSWORD=abcdefghijklmnop
```

## 🚨 よくあるエラーと解決方法

### エラー: "Username and Password not accepted"
**原因:**
- アプリパスワードが間違っている
- 2段階認証が有効になっていない
- スペースやハイフンが含まれている

**解決方法:**
1. 2段階認証を確認
2. 新しいアプリパスワードを生成
3. スペースを削除して入力

### エラー: "Less secure apps"
**原因:** 
- 古い認証方法を使用している

**解決方法:**
- アプリパスワードを使用する（通常のパスワードではない）

## ✅ 設定確認チェックリスト

- [ ] Googleアカウントで2段階認証が有効
- [ ] アプリパスワードを生成済み
- [ ] パスワードからスペースを削除
- [ ] .env.localに正しく設定
- [ ] サーバーを再起動

## 📝 .env.local の正しい設定例

```env
GMAIL_USER=one.photolife@gmail.com
GMAIL_APP_PASSWORD=abcdefghijklmnop  # 16文字、スペースなし
```

## テスト方法

1. サーバーを再起動
```bash
npm run dev
```

2. テストページにアクセス
```
http://localhost:3000/test-email
```

3. メールを送信してテスト