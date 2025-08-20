#\!/bin/bash

echo "=== macOS 通知設定診断 ==="
echo ""

echo "1. 集中モード（Do Not Disturb）の状態確認:"
if shortcuts run "集中モード状況確認" 2>/dev/null; then
    echo "  ✅ 集中モード確認完了"
else
    echo "  ⚠️  集中モード確認スクリプトなし"
fi
echo ""

echo "2. システム通知設定のオープン（手動確認用）:"
echo "  システム設定 > 通知とフォーカス > 通知 を開くには："
echo "  open \"x-apple.systempreferences:com.apple.Notifications-Settings.extension\""
echo ""

echo "3. Terminal の通知設定詳細:"
defaults read com.apple.ncprefs | grep -A 10 -B 5 "com.apple.Terminal" | head -20
echo ""

echo "4. terminal-notifier の通知設定詳細:"
defaults read com.apple.ncprefs | grep -A 10 -B 5 "terminal-notifier" | head -20
echo ""

echo "5. 手動での通知テスト:"
echo "  以下のコマンドで手動テストができます："
echo "  terminal-notifier -title 'テスト' -message '手動テスト' -sound 'Glass'"
echo ""

echo "=== 診断完了 ==="
