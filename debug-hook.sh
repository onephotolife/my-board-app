#!/bin/bash

# ログファイルのパス
LOG_FILE="/Users/yoshitaka.yamagishi/Documents/projects/my-board-app/debug-hook.log"

# デバッグ用フック - 呼び出しを記録
echo "==========================================" >> "$LOG_FILE"
echo "[DEBUG HOOK START] $(date '+%Y-%m-%d %H:%M:%S')" >> "$LOG_FILE"
echo "Arguments: $@" >> "$LOG_FILE"
echo "Argument count: $#" >> "$LOG_FILE"
echo "Working directory: $(pwd)" >> "$LOG_FILE"
echo "User: $(whoami)" >> "$LOG_FILE"
echo "------------------------------------------" >> "$LOG_FILE"

# notify.shが存在するか確認
NOTIFY_SCRIPT="/Users/yoshitaka.yamagishi/Documents/projects/my-board-app/claude-notifications/notify.sh"
if [ -f "$NOTIFY_SCRIPT" ]; then
    echo "notify.sh found at: $NOTIFY_SCRIPT" >> "$LOG_FILE"
    echo "Executing notify.sh..." >> "$LOG_FILE"
    
    # notify.shを実行してすべての出力を記録
    "$NOTIFY_SCRIPT" "$@" >> "$LOG_FILE" 2>&1
    EXIT_CODE=$?
    
    echo "notify.sh exit code: $EXIT_CODE" >> "$LOG_FILE"
else
    echo "ERROR: notify.sh not found at: $NOTIFY_SCRIPT" >> "$LOG_FILE"
fi

echo "[DEBUG HOOK END] $(date '+%Y-%m-%d %H:%M:%S')" >> "$LOG_FILE"
echo "==========================================" >> "$LOG_FILE"
echo "" >> "$LOG_FILE"

# 常に成功として終了（フックが失敗してもClaude Codeの動作を妨げない）
exit 0