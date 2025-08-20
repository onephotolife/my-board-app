#!/bin/bash

# Hook動作テストスクリプト
LOG_FILE="/Users/yoshitaka.yamagishi/Documents/projects/my-board-app/hook-test-$(date +%Y%m%d_%H%M%S).log"

echo "===========================================" >> "$LOG_FILE"
echo "[HOOK TEST] $(date '+%Y-%m-%d %H:%M:%S')" >> "$LOG_FILE"
echo "Called from: Claude Code Hook" >> "$LOG_FILE"
echo "Arguments: $@" >> "$LOG_FILE"
echo "===========================================" >> "$LOG_FILE"

# 通知も送信
/Users/yoshitaka.yamagishi/Documents/projects/my-board-app/claude-notifications/notify-enhanced.sh "hook_test" "Hookから呼び出されました" "🔔 Hook Test" 2>&1 | tee -a "$LOG_FILE"

echo "Test completed at $(date '+%Y-%m-%d %H:%M:%S')" >> "$LOG_FILE"