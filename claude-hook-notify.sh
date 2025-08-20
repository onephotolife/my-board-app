#!/bin/bash

# Claude Code Hook用通知スクリプト（完全版）
# 複数の通知方法を使用して確実に通知を送信

# 設定
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="$SCRIPT_DIR/claude-hook.log"
SOUND_NAME="Glass"

# 引数処理
HOOK_TYPE="${1:-unknown}"
MESSAGE="${2:-Claude Code Hook}"
TITLE="${3:-🔔 Claude}"

# タイムスタンプ
TIMESTAMP="$(date '+%Y-%m-%d %H:%M:%S')"

# ログ記録開始
{
    echo "=========================================="
    echo "[HOOK NOTIFICATION] $TIMESTAMP"
    echo "Type: $HOOK_TYPE"
    echo "Message: $MESSAGE"
    echo "Title: $TITLE"
    echo "------------------------------------------"
    
    # 方法1: osascript直接実行（最も確実）
    echo "Method 1: Direct osascript..."
    if osascript -e "display notification \"$MESSAGE\" with title \"$TITLE\" sound name \"$SOUND_NAME\"" 2>&1; then
        echo "  ✅ osascript成功"
    else
        echo "  ❌ osascript失敗"
    fi
    
    # 方法2: terminal-notifierを使用（インストール済みの場合）
    if command -v terminal-notifier &> /dev/null; then
        echo "Method 2: terminal-notifier..."
        if terminal-notifier -message "$MESSAGE" -title "$TITLE" -sound "$SOUND_NAME" 2>&1; then
            echo "  ✅ terminal-notifier成功"
        else
            echo "  ❌ terminal-notifier失敗"
        fi
    fi
    
    # 方法3: 音声再生（確実に音を鳴らす）
    echo "Method 3: Sound playback..."
    SOUND_FILE="/System/Library/Sounds/${SOUND_NAME}.aiff"
    if [ -f "$SOUND_FILE" ]; then
        afplay "$SOUND_FILE" &
        echo "  ✅ 音声再生開始"
    else
        # 代替音声
        afplay "/System/Library/Sounds/Ping.aiff" &
        echo "  ⚠️ 代替音声（Ping）再生"
    fi
    
    # 方法4: sayコマンドで音声読み上げ（オプション）
    if [ "$HOOK_TYPE" == "user_prompt" ]; then
        say "コマンド入力待ちです" &
        echo "  ✅ 音声読み上げ実行"
    fi
    
    echo "------------------------------------------"
    echo "Notification completed at $TIMESTAMP"
    echo "=========================================="
    echo ""
} >> "$LOG_FILE" 2>&1

# 成功を返す（Hookがエラーと判断しないように）
exit 0