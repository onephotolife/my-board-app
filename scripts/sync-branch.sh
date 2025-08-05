#!/bin/bash

# ブランチ同期スクリプト
# 使用方法: ./scripts/sync-branch.sh

set -e

echo "🔄 ブランチ同期を開始します..."

# 現在のブランチを保存
CURRENT_BRANCH=$(git branch --show-current)
echo "📍 現在のブランチ: $CURRENT_BRANCH"

# 未コミットの変更をチェック
if ! git diff-index --quiet HEAD --; then
    echo "⚠️  未コミットの変更があります"
    echo "以下のオプションから選択してください:"
    echo "1) stashして続行"
    echo "2) コミットして続行"
    echo "3) 中止"
    read -p "選択 (1/2/3): " choice
    
    case $choice in
        1)
            git stash push -m "sync-branch: $(date +%Y%m%d-%H%M%S)"
            echo "✅ 変更をstashしました"
            NEED_STASH_POP=true
            ;;
        2)
            echo "コミットメッセージを入力してください:"
            read -p "> " commit_message
            git add -A
            git commit -m "$commit_message"
            echo "✅ コミットしました"
            ;;
        3)
            echo "❌ 同期を中止しました"
            exit 1
            ;;
        *)
            echo "❌ 無効な選択です"
            exit 1
            ;;
    esac
fi

# developブランチの最新を取得
echo "📥 developブランチの最新を取得しています..."
git checkout develop
git pull origin develop

# 元のブランチに戻る
git checkout $CURRENT_BRANCH

# developをマージ
echo "🔀 developブランチをマージしています..."
if git merge develop --no-edit; then
    echo "✅ マージが成功しました"
else
    echo "❌ コンフリクトが発生しました"
    echo "コンフリクトを解決してから、以下のコマンドを実行してください:"
    echo "  git add ."
    echo "  git commit -m 'resolve: developとのコンフリクトを解決'"
    
    # stashがある場合の案内
    if [ "$NEED_STASH_POP" = true ]; then
        echo ""
        echo "📌 注意: stashした変更があります"
        echo "コンフリクト解決後に以下を実行してください:"
        echo "  git stash pop"
    fi
    exit 1
fi

# stashした変更を戻す
if [ "$NEED_STASH_POP" = true ]; then
    echo "📤 stashした変更を戻しています..."
    if git stash pop; then
        echo "✅ stashの適用が成功しました"
    else
        echo "⚠️  stashの適用でコンフリクトが発生しました"
        echo "手動で解決してください"
        exit 1
    fi
fi

echo "✨ ブランチ同期が完了しました！"
echo ""
echo "📊 現在の状態:"
echo "  - ブランチ: $CURRENT_BRANCH"
echo "  - developとの差分: $(git rev-list --count develop..$CURRENT_BRANCH) commits ahead"
echo ""
echo "次のステップ:"
echo "  1. テストを実行: npm test"
echo "  2. 変更をプッシュ: git push origin $CURRENT_BRANCH"