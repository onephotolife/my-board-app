#!/bin/bash

# Claude Code フォールバック通知システム
# hookが動作しない場合の代替通知メカニズム
# プロセス監視とファイル監視による通知トリガー

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FALLBACK_LOG="$SCRIPT_DIR/fallback-notification.log"
NOTIFY_SCRIPT="$SCRIPT_DIR/claude-hook-notify.sh"
PID_FILE="$SCRIPT_DIR/fallback-notifier.pid"

# 設定
CHECK_INTERVAL=2
CLAUDE_IDLE_THRESHOLD=5
LAST_ACTIVITY_FILE="$SCRIPT_DIR/.claude-activity"

echo "🔄 Claude Code フォールバック通知システム開始"

# PIDファイルを作成
echo $$ > "$PID_FILE"

# ログ初期化
{
    echo "=========================================="
    echo "フォールバック通知システム開始: $(date)"
    echo "PID: $$"
    echo "監視間隔: ${CHECK_INTERVAL}秒"
    echo "アイドル検出閾値: ${CLAUDE_IDLE_THRESHOLD}秒"
    echo "=========================================="
} > "$FALLBACK_LOG"

# 前回の状態を記録する変数
PREV_CLAUDE_COUNT=0
CLAUDE_BUSY_TIME=0
NOTIFICATION_SENT=false

# アクティビティファイルを初期化
touch "$LAST_ACTIVITY_FILE"

# メイン監視ループ
while true; do
    CURRENT_TIME=$(date '+%s')
    TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
    
    # Claude Codeプロセス数を取得
    CLAUDE_COUNT=$(pgrep -f "claude" | wc -l | tr -d ' ')
    
    # CPU使用率でClaude Codeの活動を検出
    CLAUDE_CPU=$(ps aux | grep -E "(claude|Claude)" | grep -v grep | awk '{sum += $3} END {printf "%.1f", sum}')
    CLAUDE_CPU=${CLAUDE_CPU:-0}
    
    {
        echo "[$TIMESTAMP] プロセス数: $CLAUDE_COUNT, CPU: ${CLAUDE_CPU}%"
    } >> "$FALLBACK_LOG"
    
    # フォールバック条件1: プロセス数の変化検出
    if [ "$CLAUDE_COUNT" != "$PREV_CLAUDE_COUNT" ]; then
        if [ "$CLAUDE_COUNT" -gt "$PREV_CLAUDE_COUNT" ]; then
            # Claude Code開始
            echo "🟢 Claude Code開始検出"
            "$NOTIFY_SCRIPT" "fallback_start" "Claude Code開始を検出" "🟢 フォールバック通知"
            NOTIFICATION_SENT=true
        elif [ "$CLAUDE_COUNT" -lt "$PREV_CLAUDE_COUNT" ] && [ "$PREV_CLAUDE_COUNT" -gt 0 ]; then
            # Claude Code終了
            echo "🔴 Claude Code終了検出"
            "$NOTIFY_SCRIPT" "fallback_end" "Claude Code終了を検出" "🔴 フォールバック通知"
            NOTIFICATION_SENT=true
        fi
        PREV_CLAUDE_COUNT="$CLAUDE_COUNT"
    fi
    
    # フォールバック条件2: CPU使用率によるアクティビティ検出
    if [ "$CLAUDE_COUNT" -gt 0 ]; then
        # Claude Codeが実行中
        if (( $(echo "$CLAUDE_CPU > 1.0" | bc -l) )); then
            # アクティブ状態
            CLAUDE_BUSY_TIME=0
            NOTIFICATION_SENT=false
            echo "$CURRENT_TIME" > "$LAST_ACTIVITY_FILE"
        else
            # アイドル状態
            CLAUDE_BUSY_TIME=$((CLAUDE_BUSY_TIME + CHECK_INTERVAL))
            
            if [ "$CLAUDE_BUSY_TIME" -ge "$CLAUDE_IDLE_THRESHOLD" ] && [ "$NOTIFICATION_SENT" = false ]; then
                echo "⏳ Claude Codeアイドル状態検出 (${CLAUDE_BUSY_TIME}秒)"
                "$NOTIFY_SCRIPT" "fallback_idle" "入力待機中（フォールバック検出）" "⏳ フォールバック通知"
                NOTIFICATION_SENT=true
            fi
        fi
    fi
    
    # フォールバック条件3: ファイル変更監視による通知
    # Claude Codeのログファイルや設定ファイルの変更を監視
    SETTINGS_FILE="$SCRIPT_DIR/.claude/settings.local.json"
    if [ -f "$SETTINGS_FILE" ]; then
        SETTINGS_MTIME=$(stat -f %m "$SETTINGS_FILE" 2>/dev/null || echo "0")
        LAST_SETTINGS_MTIME=$(cat "$SCRIPT_DIR/.last_settings_mtime" 2>/dev/null || echo "0")
        
        if [ "$SETTINGS_MTIME" != "$LAST_SETTINGS_MTIME" ] && [ "$LAST_SETTINGS_MTIME" != "0" ]; then
            echo "⚙️ 設定ファイル変更検出"
            "$NOTIFY_SCRIPT" "fallback_config" "設定ファイル更新を検出" "⚙️ フォールバック通知"
        fi
        
        echo "$SETTINGS_MTIME" > "$SCRIPT_DIR/.last_settings_mtime"
    fi
    
    # フォールバック条件4: 定期的な生存確認通知（オプション）
    HOURLY_CHECK=$((CURRENT_TIME % 3600))
    if [ "$HOURLY_CHECK" -lt "$CHECK_INTERVAL" ]; then
        echo "💗 定期生存確認"
        "$NOTIFY_SCRIPT" "fallback_heartbeat" "フォールバック通知システム動作中" "💗 生存確認"
        
        {
            echo "[$TIMESTAMP] 定期生存確認通知送信"
        } >> "$FALLBACK_LOG"
    fi
    
    sleep "$CHECK_INTERVAL"
done

# クリーンアップ関数
cleanup() {
    echo ""
    echo "🛑 フォールバック通知システム停止中..."
    
    {
        echo "=========================================="
        echo "フォールバック通知システム終了: $(date)"
        echo "=========================================="
    } >> "$FALLBACK_LOG"
    
    # PIDファイルを削除
    rm -f "$PID_FILE"
    rm -f "$SCRIPT_DIR/.last_settings_mtime"
    
    echo "✅ フォールバックシステムを停止しました"
    exit 0
}

# シグナルハンドラー設定
trap cleanup SIGINT SIGTERM

# バックグラウンド実行用の関数
run_in_background() {
    if [ "$1" = "--daemon" ]; then
        nohup "$0" > /dev/null 2>&1 &
        echo "🔄 フォールバック通知システムをバックグラウンドで開始しました"
        echo "停止するには: kill \$(cat '$PID_FILE')"
        exit 0
    fi
}

# コマンドライン引数処理
run_in_background "$@"