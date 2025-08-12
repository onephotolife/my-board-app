#!/bin/bash

# クイック通知テスト
echo "🔔 Claude Code 通知テスト"
echo "========================="
echo ""

# 通知送信
echo "1. after_commandテスト..."
./claude-hook-notify.sh "after_command" "コマンド実行完了" "✅ Claude Code"

sleep 2

echo "2. user_promptテスト..."
./claude-hook-notify.sh "user_prompt" "入力待機中" "⏳ Claude Code"

echo ""
echo "✅ テスト完了"
echo ""
echo "📝 ログ確認: tail claude-hook.log"
echo "🔄 次のステップ: Claude Codeを再起動してください"