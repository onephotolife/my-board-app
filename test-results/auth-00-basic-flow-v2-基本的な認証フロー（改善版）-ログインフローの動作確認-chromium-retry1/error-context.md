# Page snapshot

```yaml
- heading "おかえりなさい" [level=1]
- paragraph: アカウントにログインして続ける
- text: ログインできませんでした メールアドレスまたはパスワードが正しくありません。 💡 パスワードをお忘れの場合は、パスワードリセットをご利用ください。 メールアドレス
- textbox "メールアドレス": test@example.com
- text: パスワード
- textbox "パスワード": TestPassword123!
- button "ログイン"
- text: アカウントをお持ちでない方は
- link "新規登録":
  - /url: /auth/signup
- link "パスワードを忘れた方はこちら":
  - /url: /auth/reset-password
- alert
```