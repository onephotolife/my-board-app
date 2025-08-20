#!/usr/bin/env node

/**
 * 本番環境用の環境変数生成スクリプト
 * 使用方法: node scripts/generate-production-env.js
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// ランダム文字列生成
function generateSecret(length = 32) {
  return crypto.randomBytes(length).toString('hex').slice(0, length);
}

// 強力なパスワード生成
function generateStrongPassword() {
  const length = 24;
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
}

// 質問を促すヘルパー関数
function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function generateEnvFile() {
  console.log('\n🚀 本番環境設定ファイル生成ウィザード\n');
  console.log('=====================================\n');

  const config = {};

  // ドメイン設定
  console.log('📌 基本設定\n');
  config.domain = await question('本番環境のドメイン名 (例: myapp.com): ');
  config.vercelDomain = await question('Vercelのドメイン名 (例: myapp.vercel.app): ') || `${config.domain.replace('.com', '')}.vercel.app`;

  // MongoDB設定
  console.log('\n📌 MongoDB Atlas設定\n');
  config.mongoUsername = await question('MongoDB ユーザー名: ');
  config.mongoPassword = await question('MongoDB パスワード (空白で自動生成): ') || generateStrongPassword();
  config.mongoCluster = await question('MongoDB クラスター名 (例: cluster0.xxxxx): ');

  // メール設定
  console.log('\n📌 メール送信設定\n');
  const emailProvider = await question('メールプロバイダー (resend/sendgrid) [resend]: ') || 'resend';
  if (emailProvider === 'resend') {
    config.resendApiKey = await question('Resend API キー: ');
  } else {
    config.sendgridApiKey = await question('SendGrid API キー: ');
  }

  // Sentry設定（オプション）
  console.log('\n📌 監視設定（オプション - Enterでスキップ）\n');
  config.sentryDsn = await question('Sentry DSN (オプション): ');
  config.sentryOrg = await question('Sentry Organization (オプション): ');
  
  // Google Analytics（オプション）
  config.gaId = await question('Google Analytics ID (オプション): ');

  // 自動生成される値
  console.log('\n🔐 セキュリティキーを自動生成中...\n');
  
  const secrets = {
    NEXTAUTH_SECRET: crypto.randomBytes(32).toString('base64'),
    CSRF_SECRET: generateSecret(32),
    SESSION_SECRET: generateSecret(32),
    ENCRYPTION_KEY: generateSecret(32),
    JWT_SECRET: generateSecret(32),
    HEALTH_CHECK_TOKEN: generateSecret(16),
    METRICS_TOKEN: generateSecret(16)
  };

  // 環境変数ファイルの内容を生成
  let envContent = `# =====================================
# 本番環境設定
# 生成日時: ${new Date().toISOString()}
# =====================================

# MongoDB Atlas Production
MONGODB_URI=mongodb+srv://${config.mongoUsername}:${config.mongoPassword}@${config.mongoCluster}.mongodb.net/board-app-prod?retryWrites=true&w=majority&maxPoolSize=10&minPoolSize=2

# NextAuth Configuration
NEXTAUTH_URL=https://${config.domain}
NEXTAUTH_SECRET=${secrets.NEXTAUTH_SECRET}

# Email Service
`;

  if (emailProvider === 'resend') {
    envContent += `RESEND_API_KEY=${config.resendApiKey}
EMAIL_FROM=noreply@${config.domain}
`;
  } else {
    envContent += `EMAIL_SERVER_HOST=smtp.sendgrid.net
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER=apikey
EMAIL_SERVER_PASSWORD=${config.sendgridApiKey}
EMAIL_FROM=noreply@${config.domain}
`;
  }

  envContent += `
# Security Keys
CSRF_SECRET=${secrets.CSRF_SECRET}
SESSION_SECRET=${secrets.SESSION_SECRET}
ENCRYPTION_KEY=${secrets.ENCRYPTION_KEY}
JWT_SECRET=${secrets.JWT_SECRET}

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_AUTH_MAX=5
RATE_LIMIT_API_MAX=50
`;

  if (config.sentryDsn) {
    envContent += `
# Error Monitoring (Sentry)
SENTRY_DSN=${config.sentryDsn}
NEXT_PUBLIC_SENTRY_DSN=${config.sentryDsn}
SENTRY_ORG=${config.sentryOrg}
SENTRY_PROJECT=board-app
SENTRY_ENVIRONMENT=production
SENTRY_TRACES_SAMPLE_RATE=0.1
`;
  }

  if (config.gaId) {
    envContent += `
# Analytics
NEXT_PUBLIC_GA_MEASUREMENT_ID=${config.gaId}
NEXT_PUBLIC_VERCEL_ANALYTICS_ID=auto
`;
  }

  envContent += `
# Feature Flags
ENABLE_REGISTRATION=true
ENABLE_PASSWORD_RESET=true
ENABLE_EMAIL_VERIFICATION=true
ENABLE_SOCIAL_LOGIN=false
ENABLE_TWO_FACTOR_AUTH=false
MAINTENANCE_MODE=false
DEBUG_MODE=false

# Logging
LOG_LEVEL=error
LOG_FORMAT=json
ENABLE_DEBUG_LOGS=false

# Performance
REVALIDATE_INTERVAL=3600
CACHE_TTL=86400
ENABLE_CACHE=true

# Database Options
DB_CONNECTION_TIMEOUT=5000
DB_SOCKET_TIMEOUT=45000
DB_MAX_IDLE_TIME=10000

# Health Check
HEALTH_CHECK_TOKEN=${secrets.HEALTH_CHECK_TOKEN}
METRICS_TOKEN=${secrets.METRICS_TOKEN}

# Production Flags
NODE_ENV=production
VERCEL_ENV=production
IS_PRODUCTION=true
`;

  // ファイルを書き込み
  const envPath = path.join(process.cwd(), '.env.production.local');
  fs.writeFileSync(envPath, envContent);

  // セキュアな権限を設定（Unix系のみ）
  if (process.platform !== 'win32') {
    fs.chmodSync(envPath, 0o600);
  }

  // サマリーファイルも生成（機密情報を除く）
  const summaryContent = `# 本番環境設定サマリー
# 生成日時: ${new Date().toISOString()}

## 設定情報（機密情報除く）
- ドメイン: ${config.domain}
- Vercelドメイン: ${config.vercelDomain}
- MongoDBクラスター: ${config.mongoCluster}
- メールプロバイダー: ${emailProvider}
- Sentry設定: ${config.sentryDsn ? '有効' : '未設定'}
- Google Analytics: ${config.gaId ? '有効' : '未設定'}

## 生成されたセキュリティキー
- NEXTAUTH_SECRET: ✅ 生成済み（${secrets.NEXTAUTH_SECRET.length}文字）
- CSRF_SECRET: ✅ 生成済み（32文字）
- SESSION_SECRET: ✅ 生成済み（32文字）
- ENCRYPTION_KEY: ✅ 生成済み（32文字）
- JWT_SECRET: ✅ 生成済み（32文字）
- HEALTH_CHECK_TOKEN: ✅ 生成済み（16文字）
- METRICS_TOKEN: ✅ 生成済み（16文字）

## 重要な注意事項
1. .env.production.local は絶対にGitにコミットしないでください
2. このファイルは安全な場所（1Password等）にバックアップしてください
3. Vercelの環境変数設定にこれらの値をコピーしてください
4. MongoDBのパスワード: ${config.mongoPassword ? '手動設定' : '自動生成済み'}

## 次のステップ
1. Vercelダッシュボードで環境変数を設定
2. MongoDB Atlasでユーザーとネットワークアクセスを設定
3. メールプロバイダーのAPIキーを確認
4. デプロイ前チェックリストを実行: npm run deploy:check
`;

  const summaryPath = path.join(process.cwd(), '.env.production.summary.txt');
  fs.writeFileSync(summaryPath, summaryContent);

  console.log('✅ 環境変数ファイルが生成されました！\n');
  console.log(`📁 生成されたファイル:`);
  console.log(`   - ${envPath}`);
  console.log(`   - ${summaryPath}\n`);
  console.log('⚠️  重要: .env.production.local は絶対にGitにコミットしないでください！');
  console.log('📋 次のステップ: Vercelダッシュボードで環境変数を設定してください。\n');

  rl.close();
}

// メイン実行
generateEnvFile().catch(console.error);