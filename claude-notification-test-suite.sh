#!/bin/bash

# Claude Code 通知システム完全テストスイート
# 全ての通知機能を包括的にテストし、成功/失敗を自動判定

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEST_LOG="$SCRIPT_DIR/notification-test-results.log"
NOTIFY_SCRIPT="$SCRIPT_DIR/claude-hook-notify.sh"
MONITOR_SCRIPT="$SCRIPT_DIR/claude-hook-monitor.sh"
FALLBACK_SCRIPT="$SCRIPT_DIR/claude-fallback-notifier.sh"

# テスト設定
NOTIFICATION_WAIT_TIME=3
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

echo "🧪 Claude Code 通知システム完全テストスイート"
echo "================================================="

# テストログ初期化
{
    echo "=========================================="
    echo "Claude Code 通知システムテスト開始"
    echo "開始時刻: $(date)"
    echo "テストスクリプト: $0"
    echo "=========================================="
} > "$TEST_LOG"

# テスト結果表示関数
show_test_result() {
    local test_name="$1"
    local result="$2"
    local details="$3"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    if [ "$result" = "PASS" ]; then
        echo "✅ $test_name - PASS"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo "❌ $test_name - FAIL: $details"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    
    {
        echo "Test: $test_name"
        echo "Result: $result"
        echo "Details: $details"
        echo "Time: $(date)"
        echo "---"
    } >> "$TEST_LOG"
}

# 通知検出関数（osascriptの実行を監視）
detect_notification() {
    local timeout="$1"
    local start_time=$(date +%s)
    
    # 一時的にosascriptプロセスを監視
    while [ $(($(date +%s) - start_time)) -lt "$timeout" ]; do
        if pgrep -f "osascript.*notification" > /dev/null; then
            return 0  # 通知検出
        fi
        sleep 0.5
    done
    
    return 1  # 通知未検出
}

# 音声検出関数（afplayプロセスを監視）
detect_sound() {
    local timeout="$1"
    local start_time=$(date +%s)
    
    while [ $(($(date +%s) - start_time)) -lt "$timeout" ]; do
        if pgrep -f "afplay" > /dev/null; then
            return 0  # 音声再生検出
        fi
        sleep 0.5
    done
    
    return 1  # 音声未検出
}

echo ""
echo "🔧 テスト1: 基本通知スクリプト動作確認"
echo "----------------------------------------"

# テスト1-1: 直接実行テスト
echo "テスト1-1: 直接実行..."
"$NOTIFY_SCRIPT" "test_direct" "直接実行テスト" "🧪 Test" &
SCRIPT_PID=$!

if detect_notification 5 && detect_sound 5; then
    show_test_result "直接実行テスト" "PASS" "通知と音声の両方を検出"
else
    show_test_result "直接実行テスト" "FAIL" "通知または音声が検出されない"
fi

wait $SCRIPT_PID 2>/dev/null

# テスト1-2: 複数通知方式テスト
echo ""
echo "テスト1-2: 複数通知方式..."
"$NOTIFY_SCRIPT" "test_multi" "複数方式テスト" "🔄 Multi Test" &

sleep $NOTIFICATION_WAIT_TIME

# ログファイルから実行結果を確認
HOOK_LOG="$SCRIPT_DIR/claude-hook.log"
if [ -f "$HOOK_LOG" ]; then
    RECENT_ENTRIES=$(tail -20 "$HOOK_LOG" | grep -c "test_multi")
    if [ "$RECENT_ENTRIES" -gt 0 ]; then
        show_test_result "複数方式テスト" "PASS" "ログに実行記録が確認された (${RECENT_ENTRIES}件)"
    else
        show_test_result "複数方式テスト" "FAIL" "ログに実行記録が見つからない"
    fi
else
    show_test_result "複数方式テスト" "FAIL" "ログファイルが存在しない"
fi

echo ""
echo "🎯 テスト2: Hook設定テスト"  
echo "----------------------------------------"

# テスト2-1: 設定ファイル存在確認
SETTINGS_FILE="$SCRIPT_DIR/.claude/settings.local.json"
if [ -f "$SETTINGS_FILE" ]; then
    show_test_result "設定ファイル存在" "PASS" "$SETTINGS_FILE が存在"
else
    show_test_result "設定ファイル存在" "FAIL" "$SETTINGS_FILE が見つからない"
fi

# テスト2-2: 設定ファイル構文確認
if [ -f "$SETTINGS_FILE" ]; then
    if jq empty "$SETTINGS_FILE" 2>/dev/null; then
        show_test_result "設定ファイル構文" "PASS" "JSON構文が正しい"
    else
        show_test_result "設定ファイル構文" "FAIL" "JSON構文エラー"
    fi
fi

# テスト2-3: Hook設定内容確認
if [ -f "$SETTINGS_FILE" ]; then
    HOOK_COUNT=$(jq '.hooks | length' "$SETTINGS_FILE" 2>/dev/null || echo "0")
    if [ "$HOOK_COUNT" -gt 0 ]; then
        show_test_result "Hook設定内容" "PASS" "${HOOK_COUNT}個のHookが設定済み"
    else
        show_test_result "Hook設定内容" "FAIL" "Hook設定が見つからない"
    fi
fi

echo ""
echo "🔍 テスト3: 監視システムテスト"
echo "----------------------------------------"

# テスト3-1: 監視スクリプト実行可能性
if [ -x "$MONITOR_SCRIPT" ]; then
    show_test_result "監視スクリプト実行権限" "PASS" "実行権限が設定されている"
else
    show_test_result "監視スクリプト実行権限" "FAIL" "実行権限がない"
fi

# テスト3-2: フォールバックスクリプト確認
if [ -x "$FALLBACK_SCRIPT" ]; then
    show_test_result "フォールバックスクリプト実行権限" "PASS" "実行権限が設定されている"
else
    show_test_result "フォールバックスクリプト実行権限" "FAIL" "実行権限がない"
fi

echo ""
echo "🚀 テスト4: システム統合テスト"
echo "----------------------------------------"

# テスト4-1: 必要コマンドの存在確認
REQUIRED_COMMANDS=("osascript" "afplay" "jq" "pgrep" "tail")
for cmd in "${REQUIRED_COMMANDS[@]}"; do
    if command -v "$cmd" &> /dev/null; then
        show_test_result "コマンド存在: $cmd" "PASS" "コマンドが利用可能"
    else
        show_test_result "コマンド存在: $cmd" "FAIL" "コマンドが見つからない"
    fi
done

# テスト4-2: システム権限確認
if osascript -e 'display notification "権限テスト" with title "🔒 Permission Test"' 2>/dev/null; then
    show_test_result "システム通知権限" "PASS" "通知権限が有効"
else
    show_test_result "システム通知権限" "FAIL" "通知権限がない可能性"
fi

# テスト4-3: 音声システム確認
TEST_SOUND="/System/Library/Sounds/Ping.aiff"
if [ -f "$TEST_SOUND" ]; then
    afplay "$TEST_SOUND" 2>/dev/null &
    AFPLAY_PID=$!
    if [ $? -eq 0 ]; then
        show_test_result "システム音声" "PASS" "音声再生が可能"
    else
        show_test_result "システム音声" "FAIL" "音声再生に問題がある"
    fi
    # 音声プロセスをクリーンアップ
    sleep 1
    kill $AFPLAY_PID 2>/dev/null || pkill afplay 2>/dev/null
else
    show_test_result "システム音声" "FAIL" "音声ファイルが見つからない"
fi

echo ""
echo "📊 テスト結果サマリー"
echo "================================================="
echo "総テスト数: $TOTAL_TESTS"
echo "成功: $PASSED_TESTS"
echo "失敗: $FAILED_TESTS"
echo "成功率: $(( PASSED_TESTS * 100 / TOTAL_TESTS ))%"

# 総合判定
if [ "$FAILED_TESTS" -eq 0 ]; then
    echo ""
    echo "🎉 全テスト PASSED!"
    echo "通知システムは正常に動作する可能性が高いです。"
    OVERALL_RESULT="ALL_PASS"
elif [ "$FAILED_TESTS" -le 2 ]; then
    echo ""
    echo "⚠️ 軽微な問題があります"
    echo "通知システムは部分的に動作する可能性があります。"
    OVERALL_RESULT="MINOR_ISSUES"
else
    echo ""
    echo "❌ 重大な問題があります"
    echo "通知システムの修正が必要です。"
    OVERALL_RESULT="MAJOR_ISSUES"
fi

# 最終ログ記録
{
    echo "=========================================="
    echo "テスト完了時刻: $(date)"
    echo "総合結果: $OVERALL_RESULT"
    echo "総テスト数: $TOTAL_TESTS"
    echo "成功: $PASSED_TESTS"
    echo "失敗: $FAILED_TESTS"
    echo "=========================================="
} >> "$TEST_LOG"

echo ""
echo "📝 詳細なテスト結果は以下に保存されました:"
echo "$TEST_LOG"

echo ""
echo "🔧 推奨される次のアクション:"
case "$OVERALL_RESULT" in
    "ALL_PASS")
        echo "1. Claude Codeを再起動してください"
        echo "2. 実際のコマンド実行で通知を確認してください"
        echo "3. 監視システムを開始してください: ./claude-hook-monitor.sh"
        ;;
    "MINOR_ISSUES")
        echo "1. 失敗したテスト項目を確認してください"
        echo "2. システム権限の設定を確認してください"
        echo "3. Claude Codeを再起動して再テストしてください"
        ;;
    "MAJOR_ISSUES")
        echo "1. 失敗したテスト項目を修正してください"
        echo "2. 必要なコマンドをインストールしてください"
        echo "3. システム設定を見直してください"
        ;;
esac