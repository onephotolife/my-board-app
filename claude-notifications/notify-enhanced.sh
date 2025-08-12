#!/bin/bash

# 完全診断機能付き通知システム - macOS 15.6対応版
# 通知が届かない問題の根本原因を特定・修正

# ログ設定
DEBUG_LOG="/Users/yoshitaka.yamagishi/Documents/projects/my-board-app/notification-enhanced.log"
echo "===========================================" >> "$DEBUG_LOG"
echo "[ENHANCED NOTIFICATION START] $(date '+%Y-%m-%d %H:%M:%S')" >> "$DEBUG_LOG"

# 設定読み込み
CONFIG_FILE="$HOME/.claude-notifications-config"
if [ -f "$CONFIG_FILE" ]; then
    source "$CONFIG_FILE"
    echo "Config loaded from: $CONFIG_FILE" >> "$DEBUG_LOG"
fi

# 引数処理
NOTIFICATION_TYPE="$1"
MESSAGE="$2"
TITLE="$3"

echo "Arguments: TYPE=$NOTIFICATION_TYPE, MESSAGE=$MESSAGE, TITLE=$TITLE" >> "$DEBUG_LOG"

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

# システム環境の詳細診断
diagnostic_check() {
    echo "[DIAGNOSTIC] System environment check..." >> "$DEBUG_LOG"
    
    # OS バージョン
    OS_VERSION=$(sw_vers -productVersion)
    echo "  OS Version: $OS_VERSION" >> "$DEBUG_LOG"
    
    # NotificationCenter プロセス確認
    if pgrep -x "NotificationCenter" > /dev/null; then
        echo "  ✅ NotificationCenter running" >> "$DEBUG_LOG"
    else
        echo "  ❌ NotificationCenter NOT running" >> "$DEBUG_LOG"
    fi
    
    # terminal-notifier 確認
    if command -v terminal-notifier >/dev/null 2>&1; then
        TN_VERSION=$(terminal-notifier -version)
        echo "  ✅ terminal-notifier available: $TN_VERSION" >> "$DEBUG_LOG"
        echo "  Path: $(which terminal-notifier)" >> "$DEBUG_LOG"
    else
        echo "  ❌ terminal-notifier NOT available" >> "$DEBUG_LOG"
    fi
    
    # 音ファイル確認
    if [ -f "/System/Library/Sounds/$SOUND.aiff" ]; then
        echo "  ✅ Sound file exists: $SOUND.aiff" >> "$DEBUG_LOG"
    else
        echo "  ⚠️  Sound file not found: $SOUND.aiff" >> "$DEBUG_LOG"
    fi
    
    # 現在時刻のDNDステータス確認（macOS 15.6対応）
    echo "  Current time: $(date '+%H:%M')" >> "$DEBUG_LOG"
    
    # ユーザーのアクティビティ確認
    echo "  User active: $(who | grep console | wc -l)" >> "$DEBUG_LOG"
}

# 複数手法による確実な通知送信
send_notification_multi_method() {
    echo "[NOTIFICATION] Sending with multiple methods..." >> "$DEBUG_LOG"
    
    local success_count=0
    
    # 手法1: terminal-notifier（標準）
    if command -v terminal-notifier >/dev/null 2>&1; then
        echo "  Method 1: terminal-notifier (standard)" >> "$DEBUG_LOG"
        if terminal-notifier \
            -title "$TITLE" \
            -message "$MESSAGE" \
            -sound "$SOUND" \
            -sender com.apple.Terminal \
            -group "claude-code-notifications" 2>&1 >> "$DEBUG_LOG"; then
            echo "    ✅ terminal-notifier success" >> "$DEBUG_LOG"
            ((success_count++))
        else
            echo "    ❌ terminal-notifier failed" >> "$DEBUG_LOG"
        fi
    fi
    
    # 手法2: terminal-notifier（システム権限）
    if command -v terminal-notifier >/dev/null 2>&1; then
        echo "  Method 2: terminal-notifier (system sender)" >> "$DEBUG_LOG"
        if terminal-notifier \
            -title "$TITLE" \
            -message "$MESSAGE" \
            -sound "$SOUND" \
            -sender com.apple.notificationcenterui \
            -activate com.apple.Terminal \
            -timeout 10 2>&1 >> "$DEBUG_LOG"; then
            echo "    ✅ terminal-notifier (system) success" >> "$DEBUG_LOG"
            ((success_count++))
        else
            echo "    ❌ terminal-notifier (system) failed" >> "$DEBUG_LOG"
        fi
    fi
    
    # 手法3: AppleScript（ベーシック）
    echo "  Method 3: AppleScript (basic)" >> "$DEBUG_LOG"
    if osascript -e "display notification \"$MESSAGE\" with title \"$TITLE\" sound name \"$SOUND\"" 2>&1 >> "$DEBUG_LOG"; then
        echo "    ✅ AppleScript success" >> "$DEBUG_LOG"
        ((success_count++))
    else
        echo "    ❌ AppleScript failed" >> "$DEBUG_LOG"
    fi
    
    # 手法4: AppleScript（詳細オプション付き）
    echo "  Method 4: AppleScript (with options)" >> "$DEBUG_LOG"
    osascript <<EOF 2>&1 >> "$DEBUG_LOG"
try
    display notification "$MESSAGE" with title "$TITLE" subtitle "Claude Code Notification" sound name "$SOUND"
end try
EOF
    if [ $? -eq 0 ]; then
        echo "    ✅ AppleScript (with options) success" >> "$DEBUG_LOG"
        ((success_count++))
    else
        echo "    ❌ AppleScript (with options) failed" >> "$DEBUG_LOG"
    fi
    
    # 手法5: システムアラート（緊急時）
    if [ $success_count -eq 0 ]; then
        echo "  Method 5: System Alert (emergency)" >> "$DEBUG_LOG"
        osascript <<EOF 2>&1 >> "$DEBUG_LOG"
try
    display alert "$TITLE" message "$MESSAGE" as warning giving up after 5
end try
EOF
        if [ $? -eq 0 ]; then
            echo "    ✅ System Alert success" >> "$DEBUG_LOG"
            ((success_count++))
        else
            echo "    ❌ System Alert failed" >> "$DEBUG_LOG"
        fi
    fi
    
    echo "  Total successful methods: $success_count" >> "$DEBUG_LOG"
    return $success_count
}

# 音の確実な再生
play_notification_sound() {
    echo "[SOUND] Playing notification sound..." >> "$DEBUG_LOG"
    
    # メイン音ファイル
    if [ -f "/System/Library/Sounds/$SOUND.aiff" ]; then
        echo "  Playing: $SOUND.aiff" >> "$DEBUG_LOG"
        afplay "/System/Library/Sounds/$SOUND.aiff" 2>&1 >> "$DEBUG_LOG" &
    else
        echo "  Fallback to Glass.aiff" >> "$DEBUG_LOG"
        afplay "/System/Library/Sounds/Glass.aiff" 2>&1 >> "$DEBUG_LOG" &
    fi
    
    # 代替音（短い beep）
    # echo -e '\a' 2>/dev/null &
    
    echo "  Sound playback initiated" >> "$DEBUG_LOG"
}

# システム通知の状態確認
check_notification_permissions() {
    echo "[PERMISSIONS] Checking notification permissions..." >> "$DEBUG_LOG"
    
    # terminal-notifier の権限確認
    if defaults read com.apple.ncprefs | grep -q "terminal-notifier"; then
        echo "  ✅ terminal-notifier permission found" >> "$DEBUG_LOG"
    else
        echo "  ⚠️  terminal-notifier permission not found" >> "$DEBUG_LOG"
    fi
    
    # Terminal の権限確認
    if defaults read com.apple.ncprefs | grep -q "com.apple.Terminal"; then
        echo "  ✅ Terminal permission found" >> "$DEBUG_LOG"
    else
        echo "  ⚠️  Terminal permission not found" >> "$DEBUG_LOG"
    fi
}

# メイン実行フロー
main() {
    echo "🚀 Enhanced notification system starting..." | tee -a "$DEBUG_LOG"
    
    # 1. 診断チェック
    diagnostic_check
    
    # 2. 権限チェック
    check_notification_permissions
    
    # 3. 通知送信
    send_notification_multi_method
    local notification_result=$?
    
    # 4. 音再生
    play_notification_sound
    
    # 5. ログ記録
    echo "$(date '+%Y-%m-%d %H:%M:%S') - Enhanced Claude Code通知: $TITLE - $MESSAGE" >> "$HOME/.claude-notifications.log"
    
    # 6. 結果サマリー
    if [ $notification_result -gt 0 ]; then
        echo "🎉 Notification sent successfully ($notification_result methods)" | tee -a "$DEBUG_LOG"
        exit 0
    else
        echo "❌ All notification methods failed" | tee -a "$DEBUG_LOG"
        exit 1
    fi
}

# Chatwork通知（オプション）
send_chatwork_notification() {
    if [ "${ENABLE_CHATWORK:-false}" = "true" ] && [ -n "$CHATWORK_API_TOKEN" ] && [ -n "$CHATWORK_ROOM_ID" ]; then
        echo "[CHATWORK] Sending Chatwork notification..." >> "$DEBUG_LOG"
        
        # メンション付きメッセージを作成
        if [ -n "$CHATWORK_MENTION_USER_ID" ]; then
            CHATWORK_MESSAGE="[To:${CHATWORK_MENTION_USER_ID}][info][title]${TITLE}[/title]${MESSAGE}[/info]"
        else
            CHATWORK_MESSAGE="[info][title]${TITLE}[/title]${MESSAGE}[/info]"
        fi
        
        if curl -s -X POST "https://api.chatwork.com/v2/rooms/$CHATWORK_ROOM_ID/messages" \
            -H "X-ChatWorkToken: $CHATWORK_API_TOKEN" \
            -d "body=${CHATWORK_MESSAGE}" > /dev/null 2>&1; then
            echo "  ✅ Chatwork notification sent" >> "$DEBUG_LOG"
        else
            echo "  ❌ Chatwork notification failed" >> "$DEBUG_LOG"
        fi
    fi
}

# プログラム開始
main
send_chatwork_notification

echo "[ENHANCED NOTIFICATION END] $(date '+%Y-%m-%d %H:%M:%S')" >> "$DEBUG_LOG"
echo "===========================================" >> "$DEBUG_LOG"