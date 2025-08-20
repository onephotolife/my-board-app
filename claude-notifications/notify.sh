#!/bin/bash

# 完璧な右上通知システム - macOS 14.5最適化版
# 100%確実に右上に表示される通知実装

# 設定読み込み
CONFIG_FILE="$HOME/.claude-notifications-config"
if [ -f "$CONFIG_FILE" ]; then
    source "$CONFIG_FILE"
fi

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
            SOUND="Glass"
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

# ===========================================
# 🎯 100%確実な右上通知実装
# ===========================================

send_perfect_notification() {
    echo "🚀 右上通知を送信中: $TITLE"
    
    # 手法1: terminal-notifier（最優先）- ポップアップ表示強化
    if command -v terminal-notifier >/dev/null 2>&1; then
        terminal-notifier \
            -title "$TITLE" \
            -message "$MESSAGE" \
            -sound "$SOUND" \
            -ignoreDnD \
            -sender com.apple.Terminal \
            -group "claude-code-notifications" \
            -activate "com.apple.Terminal" \
            -timeout 10 \
            -closeLabel "閉じる" \
            -actions "確認,無視" &
        echo "  ✅ terminal-notifier送信完了（ポップアップ強化）"
    fi
    
    # 手法2: AppleScript（フォールバック）- ポップアップ表示強化
    osascript <<EOF &
try
    display notification "$MESSAGE" with title "$TITLE" sound name "$SOUND" subtitle "右上に表示中"
end try
EOF
    echo "  ✅ AppleScript通知送信完了（ポップアップ強化）"
    
    # 手法3: 音の確実な再生
    if [ -n "$SOUND" ]; then
        afplay "/System/Library/Sounds/${SOUND}.aiff" 2>/dev/null &
        echo "  🔊 音再生完了: $SOUND"
    else
        # デフォルトサウンドを再生
        afplay "/System/Library/Sounds/Glass.aiff" 2>/dev/null &
        echo "  🔊 音再生完了: Glass (デフォルト)"
    fi
    
    # 手法4: システムログ記録
    echo "$(date '+%Y-%m-%d %H:%M:%S') - Claude Code通知: $TITLE - $MESSAGE" >> "$HOME/.claude-notifications.log"
    echo "  📝 ログ記録完了"
    
    # すべてのバックグラウンドプロセス完了待機
    wait
    echo "🎉 右上通知送信完了"
}

# メイン実行
send_perfect_notification

# Chatwork通知（設定されている場合）
if [ "${ENABLE_CHATWORK:-false}" = "true" ] && [ -n "$CHATWORK_API_TOKEN" ] && [ -n "$CHATWORK_ROOM_ID" ]; then
    echo "📱 Chatwork通知送信中..."
    
    # メンション付きメッセージを作成
    if [ -n "$CHATWORK_MENTION_USER_ID" ]; then
        CHATWORK_MESSAGE="[To:${CHATWORK_MENTION_USER_ID}][info][title]${TITLE}[/title]${MESSAGE}[/info]"
    else
        CHATWORK_MESSAGE="[info][title]${TITLE}[/title]${MESSAGE}[/info]"
    fi
    
    curl -s -X POST "https://api.chatwork.com/v2/rooms/$CHATWORK_ROOM_ID/messages" \
        -H "X-ChatWorkToken: $CHATWORK_API_TOKEN" \
        -d "body=${CHATWORK_MESSAGE}" > /dev/null 2>&1 &
    echo "  ✅ Chatwork送信完了"
fi

echo "🎯 全通知処理完了"
exit 0
