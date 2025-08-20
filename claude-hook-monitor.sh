#!/bin/bash

# Claude Code Hook監視システム
# hookの動作をリアルタイムで監視し、問題を特定する

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MONITOR_LOG="$SCRIPT_DIR/hook-monitor.log"
HOOK_LOG="$SCRIPT_DIR/claude-hook.log"

# ログディレクトリの作成
mkdir -p "$(dirname "$MONITOR_LOG")"

echo "🔍 Claude Code Hook監視システム開始"
echo "監視ログ: $MONITOR_LOG"
echo "Hookログ: $HOOK_LOG"
echo "Ctrl+Cで停止"
echo ""

# 監視開始時刻
START_TIME=$(date '+%Y-%m-%d %H:%M:%S')

{
    echo "=========================================="
    echo "Hook監視システム開始: $START_TIME"
    echo "監視対象ログファイル: $HOOK_LOG"
    echo "=========================================="
} > "$MONITOR_LOG"

# Hookログファイルの監視
if [ -f "$HOOK_LOG" ]; then
    echo "📝 既存のHookログを監視開始..."
    
    # バックグラウンドでログを監視
    tail -f "$HOOK_LOG" | while read line; do
        echo "[$(date '+%H:%M:%S')] $line"
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] $line" >> "$MONITOR_LOG"
        
        # Hook実行を検出したら通知
        if [[ "$line" =~ "HOOK NOTIFICATION" ]]; then
            osascript -e 'display notification "Hook実行を検出!" with title "🔍 Monitor" sound name "Ping"' &
        fi
    done &
    
    TAIL_PID=$!
else
    echo "⚠️ Hookログファイルが存在しません。作成を待機中..."
    
    # ログファイルの作成を待機
    while [ ! -f "$HOOK_LOG" ]; do
        sleep 1
    done
    
    echo "✅ Hookログファイルが作成されました。監視開始..."
    exec "$0" # 再実行
fi

# プロセス監視ループ
echo "🔄 Claude Codeプロセス監視開始..."

while true; do
    CURRENT_TIME=$(date '+%H:%M:%S')
    
    # Claude Codeプロセスの確認
    CLAUDE_PROCESSES=$(pgrep -f "claude" | wc -l | tr -d ' ')
    
    if [ "$CLAUDE_PROCESSES" -gt 0 ]; then
        echo "[$CURRENT_TIME] ✅ Claude Code実行中 (プロセス数: $CLAUDE_PROCESSES)"
        
        # プロセス詳細をログに記録
        {
            echo "[$CURRENT_TIME] Claude Code プロセス詳細:"
            ps aux | grep -E "(claude|Claude)" | grep -v grep
            echo "---"
        } >> "$MONITOR_LOG"
    else
        echo "[$CURRENT_TIME] ❌ Claude Codeプロセス未検出"
    fi
    
    # 設定ファイルの変更監視
    SETTINGS_FILE="$SCRIPT_DIR/.claude/settings.local.json"
    if [ -f "$SETTINGS_FILE" ]; then
        SETTINGS_MTIME=$(stat -f %m "$SETTINGS_FILE" 2>/dev/null || echo "0")
        echo "[$CURRENT_TIME] 📋 設定ファイル変更時刻: $(date -r "$SETTINGS_MTIME" '+%H:%M:%S' 2>/dev/null || echo 'unknown')"
    fi
    
    sleep 5
done

# クリーンアップ
cleanup() {
    echo ""
    echo "🛑 監視システム停止中..."
    if [ ! -z "$TAIL_PID" ]; then
        kill $TAIL_PID 2>/dev/null
    fi
    
    END_TIME=$(date '+%Y-%m-%d %H:%M:%S')
    {
        echo "=========================================="
        echo "Hook監視システム終了: $END_TIME"
        echo "開始時刻: $START_TIME"
        echo "終了時刻: $END_TIME"
        echo "=========================================="
    } >> "$MONITOR_LOG"
    
    echo "✅ 監視ログは $MONITOR_LOG に保存されました。"
    exit 0
}

# シグナルハンドラー設定
trap cleanup SIGINT SIGTERM