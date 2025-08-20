#!/bin/bash

echo "🚀 Vercel Deploy Hookを使って強制デプロイを実行します"
echo "=================================================="

# Deploy Hook URLを設定
DEPLOY_HOOK_URL="https://api.vercel.com/v1/integrations/deploy/prj_0jSG4q8kLrX1RO20S0CChr9mGrTR/Fdy6jgFgQv"

echo "📦 デプロイを開始中..."

# Deploy Hookを実行
curl -X POST "$DEPLOY_HOOK_URL"

echo ""
echo "✅ デプロイリクエストを送信しました！"
echo ""
echo "📊 デプロイ状況を確認："
echo "https://vercel.com/yoshitaka-yamagishis-projects/my-board-app/deployments"
echo ""
echo "🌐 本番サイト："
echo "https://board.blankbrainai.com"
echo ""
echo "⏳ デプロイ完了まで2-5分お待ちください"