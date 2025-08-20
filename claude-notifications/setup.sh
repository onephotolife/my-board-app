#!/bin/bash

# Claude Code Notification セットアップスクリプト

echo "========================================"
echo "Claude Code 通知システム セットアップ"
echo "========================================"
echo ""

# スクリプトのディレクトリを取得
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# 1. 設定ファイルのセットアップ
echo "1. 設定ファイルをセットアップしています..."
if [ ! -f "$HOME/.claude-notifications-config" ]; then
    cp "$SCRIPT_DIR/config-template.sh" "$HOME/.claude-notifications-config"
    echo "   ✅ 設定ファイルを作成しました: ~/.claude-notifications-config"
else
    echo "   ⚠️  設定ファイルは既に存在します: ~/.claude-notifications-config"
fi

# 2. Claude Code設定ディレクトリの確認
echo ""
echo "2. Claude Code設定を確認しています..."
CLAUDE_CONFIG_DIR="$HOME/.config/claude-code"
if [ ! -d "$CLAUDE_CONFIG_DIR" ]; then
    echo "   ⚠️  Claude Code設定ディレクトリが見つかりません"
    echo "   代替として、このプロジェクトディレクトリ内に設定例を作成します"
    CLAUDE_CONFIG_DIR="$SCRIPT_DIR/claude-code-config-example"
    mkdir -p "$CLAUDE_CONFIG_DIR"
fi

# 3. settings.json の作成または更新
SETTINGS_FILE="$CLAUDE_CONFIG_DIR/settings.json"
echo ""
echo "3. Claude Code設定ファイルを準備しています..."

# settings.json の例を作成
cat > "$SCRIPT_DIR/claude-code-settings-example.json" << 'EOF'
{
  "hooks": {
    "user-prompt-submit-hook": "/Users/yoshitaka.yamagishi/Documents/projects/my-board-app/claude-notifications/notify.sh response_complete 'Claudeが応答を完了しました'",
    "response-received-hook": "/Users/yoshitaka.yamagishi/Documents/projects/my-board-app/claude-notifications/notify.sh input_waiting 'Claudeがあなたの入力を待っています'"
  }
}
EOF

echo "   ✅ 設定例を作成しました: $SCRIPT_DIR/claude-code-settings-example.json"

# 4. テスト用スクリプトの作成
echo ""
echo "4. テストツールを作成しています..."
cat > "$SCRIPT_DIR/test-notification.sh" << 'EOF'
#!/bin/bash

# テストスクリプト
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo "通知テストを開始します..."
echo ""

echo "1. 入力待ち通知のテスト"
"$SCRIPT_DIR/notify.sh" "input_waiting"
sleep 2

echo "2. 応答完了通知のテスト"
"$SCRIPT_DIR/notify.sh" "response_complete"
sleep 2

echo "3. カスタムメッセージのテスト"
"$SCRIPT_DIR/notify.sh" "custom" "これはテストメッセージです" "カスタムタイトル"

echo ""
echo "テスト完了！"
echo "通知が表示されましたか？"
EOF

chmod +x "$SCRIPT_DIR/test-notification.sh"
echo "   ✅ テストスクリプトを作成しました: $SCRIPT_DIR/test-notification.sh"

# 5. 使い方の説明
echo ""
echo "========================================"
echo "セットアップ完了！"
echo "========================================"
echo ""
echo "【次のステップ】"
echo ""
echo "1. 通知のテスト:"
echo "   ./claude-notifications/test-notification.sh"
echo ""
echo "2. 外部サービスの設定（オプション）:"
echo "   vi ~/.claude-notifications-config"
echo ""
echo "3. Claude Codeへの設定追加:"
echo "   以下の内容を Claude Code の settings.json に追加してください:"
echo ""
echo '   "hooks": {'
echo '     "user-prompt-submit-hook": "'$SCRIPT_DIR'/notify.sh response_complete",'
echo '     "response-received-hook": "'$SCRIPT_DIR'/notify.sh input_waiting"'
echo '   }'
echo ""
echo "【利用可能な通知音】"
echo "  Basso, Blow, Bottle, Frog, Funk, Glass, Hero, Morse,"
echo "  Ping, Pop, Purr, Sosumi, Submarine, Tink"
echo ""
echo "【外部サービス設定】"
echo "  iPhone通知: Pushover (https://pushover.net/)"
echo "  Slack: Webhook URL が必要"
echo "  Discord: Webhook URL が必要"
echo "  Chatwork: API Token が必要"
echo ""