# Page snapshot

```yaml
- banner:
  - link "📋 会員制掲示板":
    - /url: /
  - navigation
- link "ホーム":
  - /url: /
- link "ログイン":
  - /url: /auth/signin
- main:
  - heading "新規登録" [level=1]
  - paragraph: アカウントを作成して始めましょう
  - text: 登録が完了しました！確認メールをご確認ください。 お名前 *
  - textbox "お名前 *"
  - text: メールアドレス *
  - textbox "メールアドレス *"
  - text: パスワード *
  - textbox "パスワード *"
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
- alert
```