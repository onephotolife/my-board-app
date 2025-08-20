#!/bin/bash

# Claude Code 起動スクリプト
# 通知機能付きで起動

echo "🚀 Claude Code を通知機能付きで起動しています..."

# 設定ファイルのパスを確認
SETTINGS_FILE="/Users/yoshitaka.yamagishi/Documents/projects/my-board-app/claude-settings.json"

if [ ! -f "$SETTINGS_FILE" ]; then
    echo "❌ 設定ファイルが見つかりません: $SETTINGS_FILE"
    exit 1
fi

echo "✅ 設定ファイルを読み込みます: $SETTINGS_FILE"

# Claude Codeを設定ファイル付きで起動
claude --settings "$SETTINGS_FILE" "$@"