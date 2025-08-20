#!/bin/bash

# Claude Code Hook全パターンテストスクリプト
# 可能性のある全てのhook名をテストして動作するものを特定

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SETTINGS_FILE="$SCRIPT_DIR/.claude/settings.local.json"
NOTIFY_SCRIPT="$SCRIPT_DIR/claude-hook-notify.sh"
BACKUP_FILE="$SCRIPT_DIR/.claude/settings.backup.$(date +%s).json"
TEST_LOG="$SCRIPT_DIR/hook-test-all.log"

echo "🧪 Claude Code Hook 全パターンテスト開始"
echo "バックアップ: $BACKUP_FILE"
echo "テストログ: $TEST_LOG"

# 現在の設定をバックアップ
if [ -f "$SETTINGS_FILE" ]; then
    cp "$SETTINGS_FILE" "$BACKUP_FILE"
    echo "✅ 設定ファイルをバックアップしました"
else
    echo "❌ 設定ファイルが見つかりません: $SETTINGS_FILE"
    exit 1
fi

# テスト対象のhook名リスト（可能性のある全パターン）
HOOK_NAMES=(
    # 現在使用中
    "after_command"
    "user-prompt-submit-hook"
    
    # レスポンス完了系
    "response-complete"
    "response-end"
    "response-finished"
    "assistant-response-complete"
    "assistant-response-end"
    "command-complete"
    "command-end"
    "task-complete"
    "output-ready"
    
    # ユーザー入力待ち系
    "user-input-waiting"
    "before-prompt"
    "prompt-ready"
    "input-ready"
    "waiting-for-input"
    "user-prompt-ready"
    "prompt-waiting"
    "before-user-input"
    
    # 汎用的なhook名
    "before_command"
    "after_response"
    "before_response"
    "on_complete"
    "on_ready"
    "session_ready"
    "interaction_complete"
)

# テスト開始時刻記録
{
    echo "=========================================="
    echo "Claude Code Hook テスト開始: $(date)"
    echo "テスト対象hook数: ${#HOOK_NAMES[@]}"
    echo "=========================================="
} > "$TEST_LOG"

# 各hook名をテスト
for hook_name in "${HOOK_NAMES[@]}"; do
    echo ""
    echo "🔍 テスト中: $hook_name"
    
    # テスト用設定を作成
    cat > "$SETTINGS_FILE" << EOF
{
  "permissions": {
    "allow": [
      "mcp__serena__check_onboarding_performed",
      "mcp__serena__onboarding", 
      "mcp__serena__list_dir",
      "mcp__serena__get_symbols_overview",
      "mcp__serena__find_symbol",
      "mcp__serena__search_for_pattern",
      "mcp__serena__think_about_collected_information",
      "mcp__serena__write_memory",
      "Bash"
    ],
    "deny": []
  },
  "hooks": {
    "$hook_name": [
      {
        "command": "$NOTIFY_SCRIPT",
        "args": ["$hook_name", "テスト: $hook_name", "🧪 Hook Test"]
      }
    ]
  }
}
EOF

    # ログに記録
    {
        echo ""
        echo "Testing hook: $hook_name"
        echo "Time: $(date)"
        echo "Config updated successfully"
    } >> "$TEST_LOG"
    
    echo "  📝 設定ファイル更新完了"
    echo "  ⏳ 5秒待機（Claude Codeに設定を認識させる）..."
    sleep 5
    
    echo "  ✅ hook '$hook_name' の設定完了"
done

echo ""
echo "🎯 全hook名テスト設定完了!"
echo ""
echo "📋 次の手順:"
echo "1. Claude Codeを再起動してください"
echo "2. 何かコマンドを実行してください"
echo "3. 通知が来るか確認してください"
echo "4. hooks動作を確認するため、以下を実行してください:"
echo "   ./claude-hook-monitor.sh"
echo ""
echo "💾 元の設定に戻すには:"
echo "   cp '$BACKUP_FILE' '$SETTINGS_FILE'"
echo ""

# 最終的には最も包括的な設定を作成
echo "🔧 包括的Hook設定を作成中..."

cat > "$SETTINGS_FILE" << 'EOF'
{
  "permissions": {
    "allow": [
      "mcp__serena__check_onboarding_performed",
      "mcp__serena__onboarding",
      "mcp__serena__list_dir", 
      "mcp__serena__get_symbols_overview",
      "mcp__serena__find_symbol",
      "mcp__serena__search_for_pattern",
      "mcp__serena__think_about_collected_information",
      "mcp__serena__write_memory",
      "Bash"
    ],
    "deny": []
  },
  "hooks": {
    "after_command": [
      {
        "command": "/Users/yoshitaka.yamagishi/Documents/projects/my-board-app/claude-hook-notify.sh",
        "args": ["after_command", "コマンド実行完了", "✅ Claude Code"]
      }
    ],
    "user-prompt-submit-hook": [
      {
        "command": "/Users/yoshitaka.yamagishi/Documents/projects/my-board-app/claude-hook-notify.sh", 
        "args": ["user_prompt", "入力待機中", "⏳ Claude Code"]
      }
    ],
    "response-complete": [
      {
        "command": "/Users/yoshitaka.yamagishi/Documents/projects/my-board-app/claude-hook-notify.sh",
        "args": ["response_complete", "応答完了", "🎯 Claude Code"]
      }
    ],
    "user-input-waiting": [
      {
        "command": "/Users/yoshitaka.yamagishi/Documents/projects/my-board-app/claude-hook-notify.sh",
        "args": ["input_waiting", "入力待機", "⏱️ Claude Code"]
      }
    ],
    "command-complete": [
      {
        "command": "/Users/yoshitaka.yamagishi/Documents/projects/my-board-app/claude-hook-notify.sh",
        "args": ["command_complete", "コマンド完了", "🏁 Claude Code"]
      }
    ]
  }
}
EOF

echo "✅ 包括的Hook設定を作成しました"

{
    echo ""
    echo "=========================================="
    echo "最終設定作成完了: $(date)"  
    echo "包括的Hook設定を適用"
    echo "=========================================="
} >> "$TEST_LOG"

echo ""
echo "🚀 テスト準備完了!"
echo "Claude Codeを再起動して動作確認してください。"