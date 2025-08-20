#!/bin/bash

echo "🧹 Vercelの完全クリーンデプロイを実行"
echo "======================================"

# 環境変数を設定
export VERCEL_FORCE_NO_BUILD_CACHE=1

echo "📦 Vercel CLIでデプロイ（キャッシュ無効）..."
vercel --prod --force --yes \
  --build-env VERCEL_FORCE_NO_BUILD_CACHE=1 \
  --env NEXT_TELEMETRY_DISABLED=1

echo ""
echo "✅ デプロイリクエストを送信しました"
echo ""
echo "⚠️  もしVercel CLIがエラーになった場合は、以下を実行してください："
echo ""
echo "1. Vercelダッシュボードにログイン"
echo "2. Settings → Git → Disconnect & Reconnect"
echo "3. Deploy Hookを使って再デプロイ"