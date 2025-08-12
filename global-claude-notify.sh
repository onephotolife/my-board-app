#!/bin/bash

# Claude Code グローバル通知スクリプト
# 右上に音付きで通知を表示

# 引数処理
NOTIFICATION_TYPE="$1"
MESSAGE="$2"
TITLE="$3"

# デフォルト設定
if [ -z "$TITLE" ]; then
    case "$NOTIFICATION_TYPE" in
        "input_waiting")
            TITLE="⏳ Claude Code - 入力待ち"
            SOUND="Ping"
            ;;
        "response_complete")
            TITLE="✅ Claude Code - 応答完了"
            SOUND="Glass"
            ;;
        *)
            TITLE="🔔 Claude Code"
            SOUND="Default"
            ;;
    esac
fi

if [ -z "$MESSAGE" ]; then
    case "$NOTIFICATION_TYPE" in
        "input_waiting")
            MESSAGE="Claudeがあなたの入力を待っています"
            ;;
        "response_complete")
            MESSAGE="Claudeの応答が完了しました"
            ;;
        *)
            MESSAGE="通知"
            ;;
    esac
fi

# 音の再生（バックグラウンドで実行）
if [ -n "$SOUND" ]; then
    afplay "/System/Library/Sounds/${SOUND}.aiff" 2>/dev/null &
fi

# 右上通知の表示（複数の方法を試行）
# 1. terminal-notifierを使用（インストール済みの場合）
if command -v terminal-notifier &> /dev/null; then
    terminal-notifier \
        -title "$TITLE" \
        -message "$MESSAGE" \
        -sender "com.apple.Terminal" \
        -sound "$SOUND" \
        -group "claude-code" 2>/dev/null &
fi

# 2. osascriptを使用（フォールバック）
osascript -e "display notification \"$MESSAGE\" with title \"$TITLE\" sound name \"$SOUND\"" 2>/dev/null &

# ログ記録（デバッグ用）
LOG_FILE="$HOME/.claude-notifications.log"
echo "[$(date '+%Y-%m-%d %H:%M:%S')] $NOTIFICATION_TYPE: $TITLE - $MESSAGE" >> "$LOG_FILE"

exit 0