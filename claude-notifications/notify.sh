#!/bin/bash

# Claude Code Notification System
# Mac音声、デスクトップ通知、外部サービス（iPhone/Slack/Discord/Chatwork）対応

# 設定ファイルのパス
CONFIG_FILE="$HOME/.claude-notifications-config"

# デフォルト設定
DEFAULT_SOUND="Glass"  # Mac通知音
DEFAULT_VOLUME=50      # 音量（0-100）

# 設定ファイルが存在する場合は読み込み
if [ -f "$CONFIG_FILE" ]; then
    source "$CONFIG_FILE"
fi

# 引数処理
NOTIFICATION_TYPE="$1"  # "input_waiting" または "response_complete"
MESSAGE="$2"            # 通知メッセージ
TITLE="$3"              # 通知タイトル（オプション）

# デフォルトタイトルとメッセージ
if [ -z "$TITLE" ]; then
    if [ "$NOTIFICATION_TYPE" = "input_waiting" ]; then
        TITLE="⏳ Claude Code - 入力待ち"
    elif [ "$NOTIFICATION_TYPE" = "response_complete" ]; then
        TITLE="✅ Claude Code - 応答完了"
    else
        TITLE="🔔 Claude Code"
    fi
fi

if [ -z "$MESSAGE" ]; then
    if [ "$NOTIFICATION_TYPE" = "input_waiting" ]; then
        MESSAGE="Claudeがあなたの入力を待っています"
    elif [ "$NOTIFICATION_TYPE" = "response_complete" ]; then
        MESSAGE="Claudeの応答が完了しました"
    else
        MESSAGE="通知"
    fi
fi

# 通知タイプに応じて異なる音を設定
case "$NOTIFICATION_TYPE" in
    "input_waiting")
        SOUND="${INPUT_SOUND:-Ping}"
        ;;
    "response_complete")
        SOUND="${COMPLETE_SOUND:-Glass}"
        ;;
    *)
        SOUND="${DEFAULT_SOUND}"
        ;;
esac

# ============================================
# 1. Mac デスクトップ通知
# ============================================
send_mac_notification() {
    # 通知を表示と音を同時に実行
    # 方法1: 通知センター経由（音付き）
    osascript <<EOF
display notification "$MESSAGE" with title "$TITLE" sound name "$SOUND"
EOF
    
    # 方法2: 音が鳴らない場合のフォールバック
    # システムサウンドを直接再生
    if [ "${FORCE_SOUND:-true}" = "true" ]; then
        # macOSのビルトインサウンドを再生
        case "$SOUND" in
            "Glass"|"Ping"|"Pop"|"Purr"|"Tink")
                afplay "/System/Library/Sounds/${SOUND}.aiff" 2>/dev/null &
                ;;
            "Basso"|"Blow"|"Bottle"|"Frog"|"Funk"|"Hero"|"Morse"|"Sosumi"|"Submarine")
                afplay "/System/Library/Sounds/${SOUND}.aiff" 2>/dev/null &
                ;;
            *)
                # デフォルトでビープ音
                osascript -e "beep" 2>/dev/null &
                ;;
        esac
    fi
}

# ============================================
# 2. iPhone通知（Pushover経由）
# ============================================
send_iphone_notification() {
    if [ -n "$PUSHOVER_USER_KEY" ] && [ -n "$PUSHOVER_APP_TOKEN" ]; then
        curl -s -X POST "https://api.pushover.net/1/messages.json" \
            -d "token=$PUSHOVER_APP_TOKEN" \
            -d "user=$PUSHOVER_USER_KEY" \
            -d "title=$TITLE" \
            -d "message=$MESSAGE" \
            -d "sound=${PUSHOVER_SOUND:-pushover}" \
            -d "priority=${PUSHOVER_PRIORITY:-0}" \
            > /dev/null 2>&1
    fi
}

# ============================================
# 3. Slack通知
# ============================================
send_slack_notification() {
    if [ -n "$SLACK_WEBHOOK_URL" ]; then
        local emoji=""
        case "$NOTIFICATION_TYPE" in
            "input_waiting")
                emoji=":hourglass_flowing_sand:"
                ;;
            "response_complete")
                emoji=":white_check_mark:"
                ;;
            *)
                emoji=":bell:"
                ;;
        esac
        
        curl -s -X POST "$SLACK_WEBHOOK_URL" \
            -H 'Content-Type: application/json' \
            -d "{
                \"text\": \"$TITLE\",
                \"attachments\": [{
                    \"text\": \"$MESSAGE\",
                    \"color\": \"${SLACK_COLOR:-#0084FF}\",
                    \"footer\": \"Claude Code\",
                    \"footer_icon\": \"https://www.anthropic.com/favicon.ico\",
                    \"ts\": $(date +%s)
                }],
                \"icon_emoji\": \"$emoji\"
            }" > /dev/null 2>&1
    fi
}

# ============================================
# 4. Discord通知
# ============================================
send_discord_notification() {
    if [ -n "$DISCORD_WEBHOOK_URL" ]; then
        local color=""
        case "$NOTIFICATION_TYPE" in
            "input_waiting")
                color="16776960"  # Yellow
                ;;
            "response_complete")
                color="65280"     # Green
                ;;
            *)
                color="3447003"   # Blue
                ;;
        esac
        
        curl -s -X POST "$DISCORD_WEBHOOK_URL" \
            -H 'Content-Type: application/json' \
            -d "{
                \"username\": \"Claude Code\",
                \"avatar_url\": \"https://www.anthropic.com/favicon.ico\",
                \"embeds\": [{
                    \"title\": \"$TITLE\",
                    \"description\": \"$MESSAGE\",
                    \"color\": $color,
                    \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%S.000Z)\",
                    \"footer\": {
                        \"text\": \"Claude Code Notification\"
                    }
                }]
            }" > /dev/null 2>&1
    fi
}

# ============================================
# 5. Chatwork通知
# ============================================
send_chatwork_notification() {
    if [ -n "$CHATWORK_API_TOKEN" ] && [ -n "$CHATWORK_ROOM_ID" ]; then
        local icon=""
        case "$NOTIFICATION_TYPE" in
            "input_waiting")
                icon="[info]"
                ;;
            "response_complete")
                icon="[info]"
                ;;
            *)
                icon="[info]"
                ;;
        esac
        
        curl -s -X POST "https://api.chatwork.com/v2/rooms/$CHATWORK_ROOM_ID/messages" \
            -H "X-ChatWorkToken: $CHATWORK_API_TOKEN" \
            -d "body=$icon $TITLE%0A$MESSAGE" > /dev/null 2>&1
    fi
}

# ============================================
# メイン処理
# ============================================

# Mac通知（常に実行）
send_mac_notification

# 外部サービス通知（設定されている場合のみ）
if [ "${ENABLE_IPHONE:-false}" = "true" ]; then
    send_iphone_notification &
fi

if [ "${ENABLE_SLACK:-false}" = "true" ]; then
    send_slack_notification &
fi

if [ "${ENABLE_DISCORD:-false}" = "true" ]; then
    send_discord_notification &
fi

if [ "${ENABLE_CHATWORK:-false}" = "true" ]; then
    send_chatwork_notification &
fi

# すべてのバックグラウンドジョブの完了を待つ
wait

exit 0