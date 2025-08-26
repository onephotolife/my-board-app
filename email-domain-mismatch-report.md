# メール配送失敗の真の原因 - ドメイン不一致問題

## 作成日時
2025年8月26日 12:10 JST

## 緊急度: 🔴 高

---

## 1. 問題の核心

### 発見した重大な設定ミス

**SMTPサーバー認証ユーザー** と **送信元メールアドレス（Fromアドレス）** のドメインが不一致です。

| 項目 | 現在の設定 | 問題 |
|---|---|---|
| SMTP認証ユーザー | noreply@**blankinai.com** | ✅ さくらサーバーで認証済み |
| 送信元（From） | noreply@**boardapp.com** | ❌ 異なるドメイン |

### これが原因でメールがブロックされています

---

## 2. なぜメールが届かないのか

### SPFチェックによる拒否

1. **さくらインターネットのSMTPサーバー**（blankinai.sakura.ne.jp）から送信
2. 認証は `noreply@blankinai.com` で実行
3. しかし、メールのFromアドレスは `noreply@boardapp.com`
4. **受信側サーバーがSPFチェックで拒否**

```
受信サーバーの判定：
「boardapp.com のメールが blankinai.sakura.ne.jp から来るのは不正」
→ SPAMと判定 → 配送拒否またはSPAMフォルダ行き
```

---

## 3. 証拠

### ログから確認できる不一致

```log
# SMTP認証
[2025-08-26 03:03:27] DEBUG [ubnjVEW4oSo] C: AUTH PLAIN AG5vcmVwbHlAYmxhbmtpbmFpLmNvbQ...
[2025-08-26 03:03:27] INFO  [ubnjVEW4oSo] User "noreply@blankinai.com" authenticated

# メール送信（Fromアドレスが異なる）
[2025-08-26 03:03:27] DEBUG [ubnjVEW4oSo] C: MAIL FROM:<noreply@boardapp.com>
[2025-08-26 03:03:27] DEBUG [ubnjVEW4oSo] From: Board App <noreply@boardapp.com>
```

### 環境変数の設定

```env
# 認証情報
EMAIL_SERVER_USER=noreply@blankinai.com

# 送信元アドレス（ドメインが違う！）
EMAIL_FROM="Board App <noreply@boardapp.com>"
```

---

## 4. 解決方法

### 即座に実施すべき修正

#### 方法1: Fromアドレスを認証ユーザーと一致させる（推奨）

`.env.local` を修正：

```env
# 修正前
EMAIL_FROM="Board App <noreply@boardapp.com>"

# 修正後（認証ユーザーと同じドメインに）
EMAIL_FROM="Board App <noreply@blankinai.com>"
```

#### 方法2: boardapp.comドメインを使いたい場合

1. boardapp.com用のメールアカウントを作成
2. boardapp.com用のSMTPサーバーを使用
3. 環境変数をすべてboardapp.com用に変更

---

## 5. なぜSMTPサーバーは「成功」と返したのか

SMTPサーバー（さくらインターネット）は以下の理由で受理しました：

1. **認証は成功**（noreply@blankinai.com）
2. **メール形式は正しい**
3. **配送を試みる**（250 Message accepted for delivery）

しかし、**実際の配送時**に：
- 受信側サーバーがSPFチェックで拒否
- バウンスメールが返送される（ただし、noreply@blankinai.comへ）
- ユーザーには届かない

---

## 6. 今すぐ実施すべきアクション

### ステップ1: 環境変数の修正

```bash
# .env.local を編集
EMAIL_FROM="Board App <noreply@blankinai.com>"
EMAIL_REPLY_TO=support@blankinai.com
SUPPORT_EMAIL=support@blankinai.com
```

### ステップ2: サーバーの再起動

```bash
npm run dev
```

### ステップ3: 実在するメールアドレスで再テスト

実際のメールアドレスで新規登録を試してください。

---

## 7. 追加の推奨事項

### 長期的な改善

1. **独自ドメインのメールサーバー設定**
   - boardapp.com でメールサーバーを設定
   - SPF、DKIM、DMARCレコードを適切に設定

2. **バウンスメール処理の実装**
   - 配送失敗を検知する仕組み
   - ユーザーへのフィードバック

3. **メール配送サービスの利用検討**
   - SendGrid
   - Amazon SES
   - Mailgun
   これらは配送率が高く、SPF/DKIM/DMARCが自動設定される

---

## 8. まとめ

### 問題
- **送信元メールアドレスのドメイン** (boardapp.com) と **SMTP認証ドメイン** (blankinai.com) の不一致

### 影響
- メールはSMTPサーバーで受理されるが、受信側で拒否される
- SPFチェック失敗により、SPAMと判定される

### 解決策
- `.env.local` の `EMAIL_FROM` を `noreply@blankinai.com` に変更

---

以上が真の原因です。この修正により、メールが正常に配送されるようになります。