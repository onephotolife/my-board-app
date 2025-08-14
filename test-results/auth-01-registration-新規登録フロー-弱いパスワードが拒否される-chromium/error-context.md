# Page snapshot

```yaml
- alert
- heading "新規登録" [level=1]
- paragraph: アカウントを作成して始めましょう
- text: お名前 *
- textbox "お名前 *"
- text: メールアドレス *
- textbox "メールアドレス *"
- text: パスワード *
- textbox "パスワード *": "12345678"
- button "👁️‍🗨️"
- text: パスワード（確認） *
- textbox "パスワード（確認） *"
- button "👁️‍🗨️"
- text: 登録することで、
- link "利用規約":
  - /url: /terms
- text: と
- link "プライバシーポリシー":
  - /url: /privacy
- text: に同意したものとみなされます。
- button "新規登録"
- text: 既にアカウントをお持ちですか？
- link "ログイン":
  - /url: /auth/signin
```