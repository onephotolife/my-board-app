# セキュリティ実装ガイド

## 実装済みセキュリティ機能

### 1. ミドルウェア保護 (`src/middleware.ts`)
- ✅ レート制限（API保護）
- ✅ 認証チェック（保護されたルート）
- ✅ セキュリティヘッダー（CSP, HSTS等）
- ✅ 入力サニタイゼーション
- ✅ メール確認チェック
- ⚠️ CSRF保護（一時無効化中 - Edge Runtime対応作業中）

### 2. セキュリティヘッダー設定
```javascript
// 本番環境で適用されるヘッダー
Content-Security-Policy: 厳格なCSPポリシー
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: カメラ、マイク、位置情報を無効化
Strict-Transport-Security: HTTPS強制（本番のみ）
```

## 追加セキュリティ実装

### 1. 環境変数の暗号化スクリプト
```bash
#!/bin/bash
# scripts/encrypt-env.sh

# 本番環境変数の暗号化
openssl enc -aes-256-cbc -salt -in .env.production.local -out .env.production.encrypted -k $ENCRYPTION_KEY

# 復号化
openssl enc -aes-256-cbc -d -in .env.production.encrypted -out .env.production.local -k $ENCRYPTION_KEY
```

### 2. セキュリティスキャンスクリプト
```json
// package.json に追加
{
  "scripts": {
    "security:audit": "npm audit --audit-level=moderate",
    "security:scan": "npx snyk test",
    "security:headers": "npx securityheaders https://your-domain.com",
    "security:ssl": "npx ssllabs-scan your-domain.com"
  }
}
```

### 3. WAF設定（Cloudflare推奨）
```yaml
Cloudflare設定:
  - WAFルール: OWASP Core Ruleset有効
  - DDoS保護: 自動モード
  - Bot対策: Challenge疑わしいトラフィック
  - Rate Limiting: 
    - /api/*: 100req/min per IP
    - /auth/*: 5req/min per IP
  - Page Rules:
    - Cache Level: Standard
    - Security Level: High
    - SSL: Full (Strict)
```

## セキュリティチェックリスト

### デプロイ前必須確認
- [ ] 全環境変数が強力なランダム値
- [ ] NEXTAUTH_SECRET設定済み（32文字以上）
- [ ] MongoDB接続がSSL/TLS有効
- [ ] 本番環境でデバッグモード無効
- [ ] エラーメッセージが詳細を露出しない
- [ ] 依存パッケージの脆弱性スキャン完了
- [ ] HTTPS強制設定
- [ ] セキュリティヘッダー検証

### 定期監査項目（月次）
- [ ] npm audit実行
- [ ] 依存パッケージ更新
- [ ] アクセスログ監査
- [ ] 異常なトラフィックパターン確認
- [ ] データベースアクセス権限確認
- [ ] APIキーローテーション
- [ ] バックアップ復元テスト

## インシデント対応手順

### 1. セキュリティ侵害検知時
```bash
# 1. アプリケーションを即座にメンテナンスモードへ
vercel env pull .env.production.local
echo "MAINTENANCE_MODE=true" >> .env.production.local
vercel env push

# 2. ログの保全
vercel logs --output=incident-$(date +%Y%m%d-%H%M%S).log

# 3. 影響範囲の特定
mongosh $MONGODB_URI --eval "db.sessions.countDocuments()"
mongosh $MONGODB_URI --eval "db.users.find({lastLogin: {$gte: new Date(Date.now() - 24*60*60*1000)}})"

# 4. 全セッション無効化
mongosh $MONGODB_URI --eval "db.sessions.deleteMany({})"

# 5. 全ユーザーのパスワードリセット強制
mongosh $MONGODB_URI --eval "db.users.updateMany({}, {$set: {mustResetPassword: true}})"
```

### 2. データ漏洩時の対応
1. 影響を受けたユーザーの特定
2. 該当ユーザーへの通知（72時間以内）
3. パスワードリセットの強制
4. 監査ログの保全
5. 原因分析と再発防止策の実施

## ペネトレーションテスト

### 自動テストツール
```bash
# OWASP ZAP スキャン
docker run -t owasp/zap2docker-stable zap-baseline.py -t https://your-domain.com

# Nikto スキャン
nikto -h https://your-domain.com

# SQLMap（SQLインジェクションテスト）
sqlmap -u "https://your-domain.com/api/posts?id=1" --batch --random-agent

# XSStrike（XSSテスト）
python xsstrike.py -u "https://your-domain.com/search?q=test"
```

### 手動テスト項目
1. 認証バイパステスト
2. セッション固定攻撃
3. CSRF攻撃シミュレーション
4. ファイルアップロード脆弱性
5. APIエンドポイントの権限昇格テスト

## コンプライアンス対応

### GDPR対応
- ✅ プライバシーポリシー明示
- ✅ Cookie同意バナー
- ✅ データ削除機能
- ✅ データエクスポート機能
- ✅ 明示的な同意取得

### 個人情報保護法対応
- ✅ 利用目的の明示
- ✅ 第三者提供の制限
- ✅ 安全管理措置
- ✅ 開示請求への対応

## セキュリティ連絡先

```yaml
セキュリティ報告:
  Email: security@your-domain.com
  PGP Key: [公開鍵]
  
緊急連絡先:
  インシデント対応: incident@your-domain.com
  24時間ホットライン: +81-XX-XXXX-XXXX
```

## 参考資料

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Next.js Security Best Practices](https://nextjs.org/docs/advanced-features/security-headers)
- [MongoDB Security Checklist](https://docs.mongodb.com/manual/administration/security-checklist/)
- [Vercel Security](https://vercel.com/security)