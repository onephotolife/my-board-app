#\!/bin/bash

echo "=== 通知システム診断スクリプト ==="
echo "日時: $(date)"
echo ""

echo "1. terminal-notifier の確認:"
if command -v terminal-notifier >/dev/null 2>&1; then
    echo "  ✅ terminal-notifier インストール済み"
    echo "  バージョン: $(terminal-notifier -version)"
    echo "  パス: $(which terminal-notifier)"
else
    echo "  ❌ terminal-notifier がインストールされていません"
fi
echo ""

echo "2. macOS 通知システムの確認:"
echo "  OS バージョン: $(sw_vers -productVersion)"
echo "  通知センターのステータス:"
if pgrep -x "NotificationCenter" > /dev/null; then
    echo "    ✅ NotificationCenter プロセス実行中"
else
    echo "    ❌ NotificationCenter プロセスが見つかりません"
fi
echo ""

echo "3. AppleScript 通知テスト:"
echo "  AppleScript通知送信中..."
osascript -e 'display notification "診断テスト通知" with title "通知診断" sound name "Glass"'
echo "  AppleScript通知送信完了"
echo ""

echo "4. terminal-notifier 通知テスト:"
echo "  terminal-notifier通知送信中..."
terminal-notifier -title "通知診断" -message "terminal-notifier診断テスト通知" -sound "Glass" -sender com.apple.Terminal
echo "  terminal-notifier通知送信完了"
echo ""

echo "5. 音再生テスト:"
echo "  音再生中..."
afplay "/System/Library/Sounds/Glass.aiff" 2>/dev/null &
echo "  音再生完了"
echo ""

echo "6. 通知設定の確認:"
echo "  Terminal の通知許可:"
if defaults read com.apple.ncprefs | grep -q "com.apple.Terminal"; then
    echo "    ✅ Terminal の通知設定が見つかりました"
else
    echo "    ⚠️  Terminal の通知設定が見つかりません"
fi
echo ""

if defaults read com.apple.ncprefs | grep -q "terminal-notifier"; then
    echo "    ✅ terminal-notifier の通知設定が見つかりました"
else
    echo "    ⚠️  terminal-notifier の通知設定が見つかりません"
fi
echo ""

echo "=== 診断完了 ==="
