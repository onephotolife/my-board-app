# Page snapshot

```yaml
- alert
- heading "おかえりなさい" [level=1]
- paragraph: アカウントにログインして続ける
- text: メールアドレス
- textbox "メールアドレス"
- text: パスワード
- textbox "パスワード"
- button "ログイン"
- text: アカウントをお持ちでない方は
- link "新規登録":
  - /url: /auth/signup
- link "パスワードを忘れた方はこちら":
  - /url: /auth/reset-password
```