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
  - text: お名前 *
  - textbox "お名前 *" [disabled]: Playwright Test User
  - text: メールアドレス *
  - textbox "メールアドレス *" [disabled]: playwright-test-1754823097016@example.com
  - text: このメールアドレスは既に登録されています パスワード *
  - textbox "パスワード *" [disabled]: TestPassword123!
  - button "👁️‍🗨️"
  - text: "パスワード強度 強い 推定解読時間:"
  - strong: 数時間
  - text: "パスワード要件: ✅ 8文字以上 ✅ 大文字を含む ✅ 小文字を含む ✅ 数字を含む ✅ 特殊文字を含む パスワード（確認） *"
  - textbox "パスワード（確認） *" [disabled]: TestPassword123!
  - button "👁️‍🗨️"
  - text: ✅ パスワードが一致しています 登録することで、
  - link "利用規約":
    - /url: /terms
  - text: と
  - link "プライバシーポリシー":
    - /url: /privacy
  - text: に同意したものとみなされます。
  - button "登録中..." [disabled]
  - text: 既にアカウントをお持ちですか？
  - link "ログイン":
    - /url: /auth/signin
- alert
```