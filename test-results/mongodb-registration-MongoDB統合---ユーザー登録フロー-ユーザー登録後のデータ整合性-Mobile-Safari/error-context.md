# Page snapshot

```yaml
- banner:
  - link "📋 会員制掲示板":
    - /url: /
  - button
- main:
  - heading "新規登録" [level=1]
  - paragraph: アカウントを作成して始めましょう
  - text: 登録の試行回数が多すぎます。15分後に再試行してください。 お名前 *
  - textbox "お名前 *": Integrity Test
  - text: メールアドレス *
  - textbox "メールアドレス *": integrity-test-1754823112754@example.com
  - text: パスワード *
  - textbox "パスワード *": IntegrityTest123!
  - button "👁️‍🗨️"
  - text: "パスワード強度 強い 推定解読時間:"
  - strong: 数時間
  - text: "パスワード要件: ✅ 8文字以上 ✅ 大文字を含む ✅ 小文字を含む ✅ 数字を含む ✅ 特殊文字を含む パスワード（確認） *"
  - textbox "パスワード（確認） *": IntegrityTest123!
  - button "👁️‍🗨️"
  - text: ✅ パスワードが一致しています 登録することで、
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