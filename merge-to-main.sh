#!/bin/bash

# mainブランチへのマージスクリプト
echo "🔄 feature/member-board を main にマージします"
echo "================================="

# 現在のブランチを保存
CURRENT_BRANCH=$(git branch --show-current)
echo "現在のブランチ: $CURRENT_BRANCH"

# 変更がないか確認
if ! git diff-index --quiet HEAD --; then
    echo "⚠️  コミットされていない変更があります"
    echo "先にコミットしてください"
    exit 1
fi

echo ""
echo "📋 マージ予定のコミット:"
git log --oneline origin/main..HEAD | head -10
echo ""

# 確認
read -p "mainブランチにマージしますか？ (y/n): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ マージをキャンセルしました"
    exit 1
fi

# mainブランチに切り替え
echo "🔀 mainブランチに切り替え中..."
git checkout main

# 最新のmainを取得
echo "📥 リモートから最新のmainを取得中..."
git pull origin main

# feature/member-boardをマージ
echo "🔗 feature/member-boardをマージ中..."
git merge feature/member-board --no-ff -m "Merge branch 'feature/member-board' into main

feat: 会員制掲示板の本番デプロイ設定と機能改善

- Vercel本番デプロイ設定
- セキュリティ強化（CSRF保護、レート制限）
- Sentry監視設定
- UI/UX改善
- 包括的なドキュメント追加"

# マージ成功確認
if [ $? -eq 0 ]; then
    echo "✅ マージ成功！"
    echo ""
    echo "📤 リモートにプッシュしますか？ (y/n): "
    read -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git push origin main
        echo "✅ mainブランチをプッシュしました"
        
        # Vercelが自動デプロイする
        echo ""
        echo "🚀 Vercelが自動的にデプロイを開始します"
        echo "📊 デプロイ状況: https://vercel.com/yoshitaka-yamagishis-projects/my-board-app/deployments"
    else
        echo "⚠️  ローカルでマージ完了。プッシュは手動で実行してください:"
        echo "   git push origin main"
    fi
else
    echo "❌ マージに失敗しました"
    echo "コンフリクトを解決してください"
    exit 1
fi

echo ""
echo "🎉 完了！"