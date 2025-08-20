#!/bin/bash

echo "🔍 デプロイ確認スクリプト"
echo "========================"
echo ""

# サイトにアクセスしてタイトルを確認
echo "📱 サイトのタイトルを確認中..."
TITLE=$(curl -s https://board.blankbrainai.com | grep -o '<title>.*</title>' | sed 's/<[^>]*>//g')

if [[ "$TITLE" == *"会員制掲示板"* ]]; then
    echo "✅ 成功！新しいデザインが表示されています"
    echo "   タイトル: $TITLE"
else
    echo "⚠️  まだ古いデザインです"
    echo "   タイトル: $TITLE"
    echo ""
    echo "以下を確認してください："
    echo "1. Vercelのデプロイが完了しているか"
    echo "2. カスタムドメインが正しく設定されているか"
    echo "3. ブラウザのキャッシュをクリアしたか"
fi

echo ""
echo "🌐 サイトURL: https://board.blankbrainai.com"
echo ""
echo "📝 確認方法："
echo "1. Ctrl+Shift+R (Windows) / Cmd+Shift+R (Mac) でハードリロード"
echo "2. シークレットモードで開く"
echo "3. 別のブラウザで確認"