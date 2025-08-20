#!/bin/bash

# 通知システム完全テストスクリプト
echo "================================================"
echo "🔍 Claude Code 通知システム診断テスト"
echo "================================================"
echo ""

# カラー定義
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# テスト結果カウンタ
PASSED=0
FAILED=0

# テスト関数
run_test() {
    local test_name="$1"
    local test_command="$2"
    echo -n "📝 $test_name ... "
    
    if eval "$test_command" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ PASSED${NC}"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}❌ FAILED${NC}"
        ((FAILED++))
        return 1
    fi
}

echo "1️⃣ 基本環境チェック"
echo "-------------------"
run_test "macOSバージョン確認" "sw_vers"
run_test "通知センター稼働確認" "pgrep -x NotificationCenter"
run_test "terminal-notifier確認" "command -v terminal-notifier"
echo ""

echo "2️⃣ 音声システムチェック"
echo "---------------------"
run_test "afplayコマンド確認" "command -v afplay"
run_test "Glassサウンド存在確認" "test -f /System/Library/Sounds/Glass.aiff"
run_test "Pingサウンド存在確認" "test -f /System/Library/Sounds/Ping.aiff"
echo ""

echo "3️⃣ スクリプトファイルチェック"
echo "-------------------------"
run_test "通知スクリプト存在確認" "test -f claude-hook-notify.sh"
run_test "通知スクリプト実行権限" "test -x claude-hook-notify.sh"
run_test "設定ファイル存在確認" "test -f .claude/settings.local.json"
echo ""

echo "4️⃣ 通知権限チェック"
echo "------------------"
echo -n "📝 osascript通知権限 ... "
if osascript -e 'display notification "Test" with title "Test"' 2>/dev/null; then
    echo -e "${GREEN}✅ PASSED${NC}"
    ((PASSED++))
else
    echo -e "${YELLOW}⚠️ 要権限設定${NC}"
    echo "   → システム設定 > プライバシーとセキュリティ > 通知 で設定してください"
fi
echo ""

echo "5️⃣ 実際の通知テスト"
echo "------------------"
echo "🔔 通知を送信します..."
./claude-hook-notify.sh "test" "テスト通知" "📢 システムテスト"
sleep 2

echo -n "📝 ログファイル生成確認 ... "
if [ -f "claude-hook.log" ] && [ -s "claude-hook.log" ]; then
    echo -e "${GREEN}✅ PASSED${NC}"
    ((PASSED++))
    echo "   最新ログ:"
    tail -3 claude-hook.log | sed 's/^/     /'
else
    echo -e "${RED}❌ FAILED${NC}"
    ((FAILED++))
fi
echo ""

echo "6️⃣ Hook設定チェック"
echo "-----------------"
echo -n "📝 after_command設定 ... "
if grep -q "claude-hook-notify.sh" .claude/settings.local.json && grep -q "after_command" .claude/settings.local.json; then
    echo -e "${GREEN}✅ PASSED${NC}"
    ((PASSED++))
else
    echo -e "${RED}❌ FAILED${NC}"
    ((FAILED++))
fi

echo -n "📝 user-prompt設定 ... "
if grep -q "claude-hook-notify.sh" .claude/settings.local.json && grep -q "user_prompt" .claude/settings.local.json; then
    echo -e "${GREEN}✅ PASSED${NC}"
    ((PASSED++))
else
    echo -e "${RED}❌ FAILED${NC}"
    ((FAILED++))
fi
echo ""

echo "================================================"
echo "📊 テスト結果サマリー"
echo "================================================"
echo -e "✅ 成功: ${GREEN}$PASSED${NC} 項目"
echo -e "❌ 失敗: ${RED}$FAILED${NC} 項目"

if [ $FAILED -eq 0 ]; then
    echo ""
    echo -e "${GREEN}🎉 すべてのテストに合格しました！${NC}"
    echo "通知システムは正常に動作する準備ができています。"
else
    echo ""
    echo -e "${YELLOW}⚠️ 一部のテストに失敗しました。${NC}"
    echo "上記の失敗項目を確認して修正してください。"
fi

echo ""
echo "💡 ヒント: Claude Codeを再起動して設定を反映してください"
echo "================================================"