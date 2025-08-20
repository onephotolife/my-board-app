#!/bin/bash

echo "🔧 Vercelトラブルシューティング"
echo "================================"
echo ""

# GitHubの最新状態を確認
echo "📱 GitHubの最新コミットを確認..."
GITHUB_LATEST=$(curl -s https://api.github.com/repos/onephotolife/my-board-app/commits/main | grep '"sha"' | head -1 | cut -d'"' -f4 | cut -c1-7)
echo "GitHub最新: $GITHUB_LATEST"

# ローカルの最新状態を確認
echo "💻 ローカルの最新コミットを確認..."
LOCAL_LATEST=$(git rev-parse --short HEAD)
echo "ローカル最新: $LOCAL_LATEST"

# 一致確認
if [ "$GITHUB_LATEST" = "$LOCAL_LATEST" ]; then
    echo "✅ GitHubとローカルは同期しています"
else
    echo "⚠️  GitHubとローカルが一致しません"
    echo "   以下を実行してください:"
    echo "   git push origin main"
fi

echo ""
echo "📝 Vercelで確認すること:"
echo "1. Build Logsでエラーがないか"
echo "2. 環境変数が正しく設定されているか"
echo "3. デプロイされたコミットハッシュが $GITHUB_LATEST か"