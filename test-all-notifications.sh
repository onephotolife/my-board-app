#!/bin/bash

# すべての通知システムをテストするスクリプト
echo "=== Claude Code 通知システム 総合テスト ==="
echo "開始時刻: $(date)"
echo ""

# 1. オリジナルの通知スクリプトをテスト
echo "1. オリジナル通知スクリプトのテスト:"
if [ -f "/Users/yoshitaka.yamagishi/Documents/projects/my-board-app/claude-notifications/notify.sh" ]; then
    echo "  実行中..."
    /Users/yoshitaka.yamagishi/Documents/projects/my-board-app/claude-notifications/notify.sh "test" "オリジナルスクリプト" "Original Test"
    echo "  完了"
else
    echo "  ❌ ファイルが見つかりません"
fi

echo ""
sleep 2

# 2. 強化版通知スクリプトをテスト
echo "2. 強化版通知スクリプトのテスト:"
if [ -f "/Users/yoshitaka.yamagishi/Documents/projects/my-board-app/claude-notifications/notify-enhanced.sh" ]; then
    echo "  実行中..."
    /Users/yoshitaka.yamagishi/Documents/projects/my-board-app/claude-notifications/notify-enhanced.sh "test_enhanced" "強化版スクリプト" "Enhanced Test"
    echo "  完了"
else
    echo "  ❌ ファイルが見つかりません"
fi

echo ""
sleep 2

# 3. フェイルセーフ通知スクリプトをテスト
echo "3. フェイルセーフ通知スクリプトのテスト:"
if [ -f "/Users/yoshitaka.yamagishi/Documents/projects/my-board-app/claude-notifications/notify-failsafe.sh" ]; then
    echo "  実行中..."
    /Users/yoshitaka.yamagishi/Documents/projects/my-board-app/claude-notifications/notify-failsafe.sh "test_failsafe" "フェイルセーフスクリプト" "Failsafe Test"
    echo "  完了"
else
    echo "  ❌ ファイルが見つかりません"
fi

echo ""
sleep 2

# 4. ダイレクトコマンドテスト
echo "4. ダイレクトコマンドのテスト:"

echo "  4-1. terminal-notifier:"
terminal-notifier -title "Direct Test" -message "terminal-notifier直接実行" -sound "Glass"
echo "    完了"

echo "  4-2. AppleScript:"
osascript -e 'display notification "AppleScript直接実行" with title "Direct AppleScript Test" sound name "Glass"'
echo "    完了"

echo ""
sleep 2

echo "=== テスト完了 ==="
echo "終了時刻: $(date)"
echo ""
echo "すべてのテストが実行されました。"
echo "通知が表示されない場合は、システム設定 > 通知とフォーカス を確認してください。"