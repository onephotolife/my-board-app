#!/bin/bash

# Vercel環境変数設定スクリプト
# 使用方法: ./scripts/vercel-env-setup.sh

echo "🚀 Vercel環境変数設定スクリプト"
echo "================================="
echo ""

# 必須環境変数リスト
echo "📋 以下の環境変数をVercelダッシュボードで設定してください："
echo ""
echo "1. MongoDB接続設定:"
echo "   - MONGODB_URI"
echo "   - 例: mongodb+srv://username:password@cluster.mongodb.net/board-app-prod"
echo ""
echo "2. NextAuth設定:"
echo "   - NEXTAUTH_URL (https://your-app.vercel.app)"
echo "   - NEXTAUTH_SECRET (32文字以上のランダム文字列)"
echo ""
echo "3. メール送信設定:"
echo "   - RESEND_API_KEY または SendGrid設定"
echo "   - EMAIL_FROM (noreply@your-domain.com)"
echo ""
echo "4. セキュリティキー（以下のコマンドで生成）:"
echo "   CSRF_SECRET: $(openssl rand -hex 16)"
echo "   SESSION_SECRET: $(openssl rand -hex 16)"
echo "   ENCRYPTION_KEY: $(openssl rand -hex 16)"
echo ""
echo "5. オプション設定:"
echo "   - SENTRY_DSN (エラー監視)"
echo "   - NEXT_PUBLIC_GA_MEASUREMENT_ID (Google Analytics)"
echo ""
echo "================================="
echo ""
echo "環境変数の設定方法:"
echo "1. https://vercel.com/yoshitaka-yamagishis-projects/my-board-app/settings/environment-variables"
echo "2. 各変数を「Production」環境に追加"
echo "3. 「Save」をクリック"
echo ""
echo "または、CLIから設定:"
echo "vercel env add MONGODB_URI production"
echo "vercel env add NEXTAUTH_SECRET production"
echo "vercel env add NEXTAUTH_URL production"
echo ""

# 環境変数の確認
echo "現在設定されている環境変数を確認しますか？ (y/n)"
read -r response
if [[ "$response" == "y" ]]; then
    echo "設定済み環境変数:"
    vercel env ls production
fi

echo ""
echo "✅ 環境変数設定後、以下のコマンドでデプロイしてください:"
echo "   vercel --prod"