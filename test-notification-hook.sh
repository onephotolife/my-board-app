#!/bin/bash

# Hook動作テストスクリプト

echo "==================================="
echo "Claude Code Hook テスト"
echo "==================================="

# 1. 直接スクリプトテスト
echo ""
echo "1. 直接スクリプト実行テスト:"
echo "-----------------------------------"
/Users/yoshitaka.yamagishi/Documents/projects/my-board-app/claude-notifications/notify-enhanced.sh \
    "test_direct" \
    "直接実行テスト" \
    "✅ Direct Test"

if [ $? -eq 0 ]; then
    echo "✅ 直接実行: 成功"
else
    echo "❌ 直接実行: 失敗"
fi

# 2. 設定ファイル確認
echo ""
echo "2. 設定ファイル確認:"
echo "-----------------------------------"
for file in \
    ".claude/settings.local.json" \
    "claude-settings.json"
do
    if [ -f "$file" ]; then
        echo "✅ $file: 存在"
    else
        echo "❌ $file: 存在しない"
    fi
done

# 3. ログファイル確認
echo ""
echo "3. 最新のログエントリ:"
echo "-----------------------------------"
if [ -f "notification-enhanced.log" ]; then
    echo "最後のログ時刻:"
    tail -n 20 notification-enhanced.log | grep "ENHANCED NOTIFICATION START" | tail -n 1
else
    echo "❌ ログファイルが見つかりません"
fi

echo ""
echo "==================================="
echo "テスト完了"
echo ""
echo "Claude Codeを以下のコマンドで起動してください:"
echo "  ./claude-startup-script.sh"
echo ""
echo "または:"
echo "  claude --settings ./claude-settings.json"
echo "==================================="