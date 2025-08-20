#!/bin/bash

# フェイルセーフ通知システム - 絶対に動作する最小限の実装
# macOS 15.6 対応

# 基本設定
NOTIFICATION_TYPE="$1"
MESSAGE="$2"
TITLE="$3"

# デフォルト値設定
[ -z "$TITLE" ] && TITLE="Claude Code"
[ -z "$MESSAGE" ] && MESSAGE="通知"

# ログファイル
FAILSAFE_LOG="/Users/yoshitaka.yamagishi/Documents/projects/my-board-app/notification-failsafe.log"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] フェイルセーフ通知開始: $TITLE - $MESSAGE" >> "$FAILSAFE_LOG"

# 通知送信の実行（複数手法を並行実行）
{
    # 手法1: terminal-notifier
    if command -v terminal-notifier >/dev/null 2>&1; then
        terminal-notifier -title "$TITLE" -message "$MESSAGE" -sound "Glass" 2>/dev/null &
    fi
    
    # 手法2: AppleScript
    osascript -e "display notification \"$MESSAGE\" with title \"$TITLE\" sound name \"Glass\"" 2>/dev/null &
    
    # 手法3: 音だけでも確実に鳴らす
    afplay "/System/Library/Sounds/Glass.aiff" 2>/dev/null &
    
    # 手法4: システムアラート（緊急時のみ、通常はコメントアウト）
    # osascript -e "display alert \"$TITLE\" message \"$MESSAGE\" as warning giving up after 3" 2>/dev/null &
    
} &

# すべてのバックグラウンドプロセス完了まで少し待機
sleep 0.5
wait

# ログ記録
echo "$(date '+%Y-%m-%d %H:%M:%S') - フェイルセーフ通知: $TITLE - $MESSAGE" >> "$HOME/.claude-notifications.log"
echo "[$(date '+%Y-%m-%d %H:%M:%S')] フェイルセーフ通知完了" >> "$FAILSAFE_LOG"

# 常に成功終了
exit 0