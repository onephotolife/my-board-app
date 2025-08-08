# Page snapshot

```yaml
- banner:
  - heading "会員制掲示板" [level=1]
  - text: 読み込み中...
- main:
  - main:
    - heading "新規登録" [level=1]
    - text: お名前
    - textbox "お名前": A
    - text: メールアドレス
    - textbox "メールアドレス"
    - text: パスワード
    - textbox "パスワード"
    - text: パスワード（確認）
    - textbox "パスワード（確認）"
    - button "登録"
    - link "既にアカウントをお持ちの方はこちら":
      - /url: /auth/signin
- alert
```