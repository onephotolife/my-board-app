#!/bin/bash

# 会員制掲示板 包括的テスト実行スクリプト
# 深い思考に基づく多角的なテスト実行

# カラー定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 設定
BASE_URL="https://board.blankbrainai.com"
REPORT_DIR="./test-reports"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# レポートディレクトリ作成
mkdir -p $REPORT_DIR

echo -e "${BLUE}=====================================================${NC}"
echo -e "${BLUE}   会員制掲示板 包括的テスト実行${NC}"
echo -e "${BLUE}   実施日時: $(date '+%Y-%m-%d %H:%M:%S')${NC}"
echo -e "${BLUE}   対象環境: $BASE_URL${NC}"
echo -e "${BLUE}=====================================================${NC}"
echo ""

# テスト結果記録
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# 関数定義
run_test_suite() {
    local suite_name=$1
    local command=$2
    
    echo -e "${YELLOW}▶ $suite_name を実行中...${NC}"
    ((TOTAL_TESTS++))
    
    if eval $command > "$REPORT_DIR/${suite_name}_${TIMESTAMP}.log" 2>&1; then
        echo -e "${GREEN}✅ $suite_name: 成功${NC}"
        ((PASSED_TESTS++))
    else
        echo -e "${RED}❌ $suite_name: 失敗${NC}"
        ((FAILED_TESTS++))
    fi
    echo ""
}

# Phase 1: 基本動作確認
echo -e "${BLUE}=== Phase 1: 基本動作確認 ===${NC}"
echo ""

# ヘルスチェック
run_test_suite "ヘルスチェック" "curl -s -o /dev/null -w '%{http_code}' $BASE_URL/api/health | grep -q 200"

# SSL証明書確認
run_test_suite "SSL証明書確認" "curl -s -I $BASE_URL | grep -q 'HTTP/2 200'"

# レスポンス時間測定
run_test_suite "レスポンス時間" "curl -o /dev/null -s -w '%{time_total}' $BASE_URL | awk '{if(\$1<1.0) exit 0; else exit 1}'"

# Phase 2: APIテスト
echo -e "${BLUE}=== Phase 2: APIテスト ===${NC}"
echo ""

# APIテストスクリプト実行
if [ -f "./api-test-script.sh" ]; then
    run_test_suite "APIテスト" "bash ./api-test-script.sh"
else
    echo -e "${YELLOW}⚠️  APIテストスクリプトが見つかりません${NC}"
fi

# Phase 3: セキュリティテスト
echo -e "${BLUE}=== Phase 3: セキュリティテスト ===${NC}"
echo ""

# セキュリティヘッダー確認
run_test_suite "セキュリティヘッダー" "curl -s -I $BASE_URL | grep -E '(strict-transport|x-frame-options|x-content-type|content-security-policy)' | wc -l | awk '{if(\$1>=4) exit 0; else exit 1}'"

# XSS攻撃テスト（簡易）
run_test_suite "XSS防御確認" "curl -s '$BASE_URL/api/posts?q=<script>alert(1)</script>' | grep -v '<script>' > /dev/null"

# SQLインジェクションテスト（簡易）
run_test_suite "SQLi防御確認" "curl -s \"$BASE_URL/api/posts?id=1' OR '1'='1\" -o /dev/null -w '%{http_code}' | grep -E '(400|404)' > /dev/null"

# Phase 4: パフォーマンステスト
echo -e "${BLUE}=== Phase 4: パフォーマンステスト ===${NC}"
echo ""

# 並列アクセステスト
echo "10並列リクエストを実行中..."
success_count=0
for i in {1..10}; do
    (curl -s -o /dev/null -w "%{http_code}\n" $BASE_URL/api/health &) 
done | while read code; do
    if [ "$code" = "200" ]; then
        ((success_count++))
    fi
done
wait
run_test_suite "並列アクセステスト" "[ $success_count -eq 10 ]"

# 負荷テスト（k6が利用可能な場合）
if command -v k6 &> /dev/null; then
    echo -e "${YELLOW}k6負荷テストを実行中（1分間）...${NC}"
    run_test_suite "k6負荷テスト" "k6 run --vus 10 --duration 1m ./load-test-scenarios.js"
else
    echo -e "${YELLOW}⚠️  k6がインストールされていません。負荷テストをスキップします${NC}"
fi

# Phase 5: レスポンシブデザインテスト
echo -e "${BLUE}=== Phase 5: レスポンシブデザインテスト ===${NC}"
echo ""

# モバイルユーザーエージェントでアクセス
run_test_suite "モバイル表示" "curl -s -H 'User-Agent: Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)' $BASE_URL -o /dev/null -w '%{http_code}' | grep -q 200"

# Phase 6: E2Eテスト（Playwrightが利用可能な場合）
echo -e "${BLUE}=== Phase 6: E2Eテスト ===${NC}"
echo ""

if command -v npx &> /dev/null && [ -f "./e2e-test-script.js" ]; then
    echo -e "${YELLOW}Playwright E2Eテストを実行中...${NC}"
    run_test_suite "E2Eテスト" "npx playwright test ./e2e-test-script.js --reporter=json"
else
    echo -e "${YELLOW}⚠️  PlaywrightまたはE2Eスクリプトが見つかりません${NC}"
fi

# テスト結果サマリー
echo ""
echo -e "${BLUE}=====================================================${NC}"
echo -e "${BLUE}              テスト結果サマリー${NC}"
echo -e "${BLUE}=====================================================${NC}"
echo ""

echo "実行テスト数: $TOTAL_TESTS"
echo -e "${GREEN}成功: $PASSED_TESTS${NC}"
echo -e "${RED}失敗: $FAILED_TESTS${NC}"
echo ""

# 成功率計算
if [ $TOTAL_TESTS -gt 0 ]; then
    SUCCESS_RATE=$((PASSED_TESTS * 100 / TOTAL_TESTS))
    echo "成功率: ${SUCCESS_RATE}%"
    
    if [ $SUCCESS_RATE -ge 90 ]; then
        echo -e "${GREEN}🎉 優秀！テストは高い成功率で完了しました${NC}"
    elif [ $SUCCESS_RATE -ge 70 ]; then
        echo -e "${YELLOW}⚠️  良好。一部改善が必要な項目があります${NC}"
    else
        echo -e "${RED}❌ 要改善。多くのテストが失敗しています${NC}"
    fi
fi

# レポート生成
echo ""
echo "詳細レポートの生成中..."

cat > "$REPORT_DIR/summary_${TIMESTAMP}.json" <<EOF
{
  "timestamp": "$(date -Iseconds)",
  "environment": "$BASE_URL",
  "total_tests": $TOTAL_TESTS,
  "passed": $PASSED_TESTS,
  "failed": $FAILED_TESTS,
  "success_rate": ${SUCCESS_RATE:-0}
}
EOF

echo -e "${GREEN}✅ レポートが生成されました: $REPORT_DIR/summary_${TIMESTAMP}.json${NC}"

# 終了
echo ""
echo -e "${BLUE}=====================================================${NC}"
echo -e "${BLUE}         包括的テスト完了${NC}"
echo -e "${BLUE}=====================================================${NC}"

exit $([ $FAILED_TESTS -eq 0 ] && echo 0 || echo 1)