# メール送信エラー修正レポート

## 🔍 問題の根本原因

### エラー詳細
- **現象**: 新規登録時にメール認証エラーが発生
- **エラーメッセージ**: "Gmail authentication failed"にも関わらず、設定はさくらSMTP
- **発生場所**: https://board.blankbrainai.com/auth/signup

### 根本原因
`src/lib/email/mailer-fixed.ts`ファイルがGmailにハードコードされていました：

```typescript
// 問題のコード（修正前）
service: 'gmail', // Use Gmail service directly
host: 'smtp.gmail.com',
port: 587,
```

### 矛盾の詳細
1. **環境変数**: さくらインターネットSMTP設定
   - `EMAIL_SERVER_HOST=blankinai.sakura.ne.jp`
   - `EMAIL_SERVER_USER=noreply@blankinai.com`

2. **実際の動作**: Gmailに接続しようとして認証エラー
   - `Invalid login: 535-5.7.8 Username and Password not accepted`

## ✅ 実施した修正

### 1. SMTPトランスポート設定の修正
**ファイル**: `src/lib/email/mailer-fixed.ts`

#### 修正内容
- Gmailサービス設定を削除
- さくらインターネットSMTPをハードコード
- 適切なレート制限とタイムアウト設定

```typescript
// 修正後のコード
const sakuraHost = 'blankinai.sakura.ne.jp';
const sakuraPort = 587;

this.transporter = createTransport({
  host: sakuraHost, // さくらインターネットのSMTPサーバー
  port: sakuraPort,
  secure: false, // Use STARTTLS
  auth: {
    user: sakuraUser,
    pass: sakuraPass,
  },
  // さくらSMTP用の最適化設定
  maxConnections: 3,
  maxMessages: 50,
  rateDelta: 2000,
  rateLimit: 3,
});
```

### 2. エラーメッセージの修正
- Gmail専用のエラーメッセージを汎用的なSMTPエラーメッセージに変更
- 日本語でわかりやすいメッセージに更新

## 📊 設定の詳細

### さくらインターネットSMTP設定
| 項目 | 値 |
|------|-----|
| ホスト | blankinai.sakura.ne.jp |
| ポート | 587 |
| セキュリティ | STARTTLS |
| ユーザー名 | noreply@blankinai.com |
| TLS最小バージョン | TLSv1.2 |

### 最適化パラメータ
| パラメータ | 値 | 理由 |
|-----------|-----|------|
| maxConnections | 3 | さくらSMTPの制限に合わせて削減 |
| maxMessages | 50 | さくらSMTPの制限に合わせて削減 |
| rateDelta | 2000ms | レート制限を緩和 |
| rateLimit | 3 | レート制限を緩和 |
| connectionTimeout | 30秒 | 接続タイムアウト |

## 🚀 期待される効果

1. **メール送信の正常化**
   - さくらインターネットSMTPサーバーへの正しい接続
   - 認証エラーの解消

2. **エラーメッセージの改善**
   - わかりやすい日本語メッセージ
   - 適切なエラーハンドリング

3. **デバッグの容易化**
   - 詳細なログ出力
   - 接続先サーバーの明確な表示

## 🔍 確認方法

1. **新規登録テスト**
   ```
   1. https://board.blankbrainai.com/auth/signup にアクセス
   2. テストアカウントで新規登録
   3. メール送信が成功することを確認
   ```

2. **ログ確認**
   - "🌸 Forcing Sakura Internet SMTP"のログが表示
   - Gmail関連のエラーが発生しないことを確認

## ⚠️ 注意事項

- 本番環境でもデバッグログを有効化しています（問題解決後は無効化推奨）
- レート制限を緩和していますが、大量送信時は注意が必要
- TLS証明書の検証を無効化しています（`rejectUnauthorized: false`）

## 📋 今後の推奨事項

1. **短期的対応**
   - メール送信の動作確認
   - エラーログの監視

2. **中期的対応**
   - デバッグログの無効化
   - TLS証明書検証の有効化検討

3. **長期的対応**
   - メールキューシステムの導入
   - 送信失敗時のリトライ機構の強化