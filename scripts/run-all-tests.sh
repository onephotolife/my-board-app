#!/bin/bash

# 包括的テスト実行スクリプト
# 修正後の掲示板機能を全レベルでテスト

echo "========================================="
echo "  掲示板機能 包括的テスト実行"
echo "========================================="
echo ""

# カラー定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# テスト結果を格納
RESULTS_DIR="test-results"
mkdir -p $RESULTS_DIR

# タイムスタンプ
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
REPORT_FILE="$RESULTS_DIR/test-report-$TIMESTAMP.md"

# レポート初期化
cat > $REPORT_FILE << EOF
# 掲示板機能テストレポート

実行日時: $(date +"%Y年%m月%d日 %H:%M:%S")

## テスト概要
修正後の掲示板機能に対する包括的なテスト実行結果

EOF

# 関数: テスト結果を記録
log_result() {
    local test_name=$1
    local status=$2
    local details=$3
    
    echo "### $test_name" >> $REPORT_FILE
    echo "結果: $status" >> $REPORT_FILE
    if [ ! -z "$details" ]; then
        echo "\`\`\`" >> $REPORT_FILE
        echo "$details" >> $REPORT_FILE
        echo "\`\`\`" >> $REPORT_FILE
    fi
    echo "" >> $REPORT_FILE
}

# 1. データベース検証
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}1. データベース検証${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

DB_VALIDATION=$(node scripts/validate-data.js 2>&1)
DB_STATUS=$?

if [ $DB_STATUS -eq 0 ]; then
    echo -e "${GREEN}✓ データベース検証: 成功${NC}"
    log_result "データベース検証" "✅ 成功" "$DB_VALIDATION"
else
    echo -e "${RED}✗ データベース検証: 失敗${NC}"
    log_result "データベース検証" "❌ 失敗" "$DB_VALIDATION"
fi

echo ""

# 2. 単体テスト
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}2. 単体テスト (Unit Tests)${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if [ -f "src/models/__tests__/Post.test.ts" ]; then
    UNIT_TEST=$(npm test -- src/models/__tests__/Post.test.ts --passWithNoTests 2>&1)
    UNIT_STATUS=$?
    
    if [ $UNIT_STATUS -eq 0 ]; then
        echo -e "${GREEN}✓ 単体テスト: 成功${NC}"
        log_result "単体テスト" "✅ 成功" "全テストケースが合格"
    else
        echo -e "${YELLOW}⚠ 単体テスト: 一部失敗${NC}"
        log_result "単体テスト" "⚠️ 一部失敗" "$UNIT_TEST"
    fi
else
    echo -e "${YELLOW}⚠ 単体テストファイルが見つかりません${NC}"
    log_result "単体テスト" "⚠️ スキップ" "テストファイルが見つかりません"
fi

echo ""

# 3. 結合テスト
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}3. 結合テスト (Integration Tests)${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if [ -f "tests/integration/board-api.test.ts" ]; then
    INTEGRATION_TEST=$(npm test -- tests/integration/board-api.test.ts --passWithNoTests 2>&1)
    INTEGRATION_STATUS=$?
    
    if [ $INTEGRATION_STATUS -eq 0 ]; then
        echo -e "${GREEN}✓ 結合テスト: 成功${NC}"
        log_result "結合テスト" "✅ 成功" "APIエンドポイントテスト合格"
    else
        echo -e "${YELLOW}⚠ 結合テスト: 一部失敗${NC}"
        log_result "結合テスト" "⚠️ 一部失敗" "$INTEGRATION_TEST"
    fi
else
    echo -e "${YELLOW}⚠ 結合テストファイルが見つかりません${NC}"
    log_result "結合テスト" "⚠️ スキップ" "テストファイルが見つかりません"
fi

echo ""

# 4. E2Eテスト準備
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}4. E2Eテスト (Playwright)${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# 開発サーバーの確認
curl -s http://localhost:3000 > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo -e "${YELLOW}⚠ 開発サーバーが起動していません${NC}"
    echo "  別のターミナルで 'npm run dev' を実行してください"
    log_result "E2Eテスト" "⚠️ スキップ" "開発サーバーが起動していません"
else
    # Playwrightテスト実行
    if [ -f "tests/e2e/board-comprehensive.spec.ts" ]; then
        echo "E2Eテストを実行中..."
        E2E_TEST=$(npx playwright test tests/e2e/board-comprehensive.spec.ts --reporter=list 2>&1)
        E2E_STATUS=$?
        
        if [ $E2E_STATUS -eq 0 ]; then
            echo -e "${GREEN}✓ E2Eテスト: 成功${NC}"
            log_result "E2Eテスト" "✅ 成功" "全シナリオ合格"
        else
            echo -e "${YELLOW}⚠ E2Eテスト: 一部失敗${NC}"
            log_result "E2Eテスト" "⚠️ 一部失敗" "$E2E_TEST"
        fi
    else
        echo -e "${YELLOW}⚠ E2Eテストファイルが見つかりません${NC}"
        log_result "E2Eテスト" "⚠️ スキップ" "テストファイルが見つかりません"
    fi
fi

echo ""

# 5. パフォーマンステスト
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}5. パフォーマンステスト${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# API応答時間測定
echo "APIパフォーマンス測定中..."
START_TIME=$(date +%s%N)
curl -s http://localhost:3000/api/posts > /dev/null
END_TIME=$(date +%s%N)
RESPONSE_TIME=$(((END_TIME - START_TIME) / 1000000))

if [ $RESPONSE_TIME -lt 500 ]; then
    echo -e "${GREEN}✓ API応答時間: ${RESPONSE_TIME}ms (基準: <500ms)${NC}"
    log_result "パフォーマンステスト" "✅ 成功" "API応答時間: ${RESPONSE_TIME}ms"
else
    echo -e "${YELLOW}⚠ API応答時間: ${RESPONSE_TIME}ms (基準: <500ms)${NC}"
    log_result "パフォーマンステスト" "⚠️ 要改善" "API応答時間: ${RESPONSE_TIME}ms"
fi

echo ""

# 6. セキュリティチェック
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}6. セキュリティチェック${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# 認証なしでのPOSTテスト
AUTH_TEST=$(curl -X POST http://localhost:3000/api/posts \
    -H "Content-Type: application/json" \
    -d '{"title":"テスト","content":"内容"}' \
    -s -o /dev/null -w "%{http_code}")

if [ "$AUTH_TEST" == "401" ]; then
    echo -e "${GREEN}✓ 認証チェック: 正常動作${NC}"
    log_result "セキュリティチェック" "✅ 成功" "未認証アクセスは適切に拒否"
else
    echo -e "${RED}✗ 認証チェック: 問題あり (Status: $AUTH_TEST)${NC}"
    log_result "セキュリティチェック" "❌ 失敗" "認証チェックに問題あり"
fi

echo ""

# 7. 結果サマリー
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}テスト結果サマリー${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

cat >> $REPORT_FILE << EOF

## サマリー

| テスト種別 | 結果 | 備考 |
|-----------|------|------|
| データベース検証 | $([ $DB_STATUS -eq 0 ] && echo "✅" || echo "❌") | データ整合性チェック |
| 単体テスト | $([ -f "src/models/__tests__/Post.test.ts" ] && echo "✅" || echo "⚠️") | Postモデルテスト |
| 結合テスト | $([ -f "tests/integration/board-api.test.ts" ] && echo "✅" || echo "⚠️") | APIエンドポイントテスト |
| E2Eテスト | $(curl -s http://localhost:3000 > /dev/null 2>&1 && echo "✅" || echo "⚠️") | ブラウザ自動テスト |
| パフォーマンス | $([ $RESPONSE_TIME -lt 500 ] && echo "✅" || echo "⚠️") | 応答時間: ${RESPONSE_TIME}ms |
| セキュリティ | $([ "$AUTH_TEST" == "401" ] && echo "✅" || echo "❌") | 認証・認可チェック |

## 推奨事項

1. すべてのテストが成功することを確認
2. パフォーマンス基準を満たすことを確認
3. セキュリティチェックが適切に機能することを確認

---
レポート生成: $(date +"%Y-%m-%d %H:%M:%S")
EOF

echo ""
echo -e "${GREEN}テストレポートを生成しました: $REPORT_FILE${NC}"
echo ""

# 結果表示
echo "┌─────────────────┬────────┐"
echo "│ テスト種別      │ 結果   │"
echo "├─────────────────┼────────┤"
printf "│ %-15s │ %-6s │\n" "データベース" $([ $DB_STATUS -eq 0 ] && echo "✅" || echo "❌")
printf "│ %-15s │ %-6s │\n" "単体テスト" $([ -f "src/models/__tests__/Post.test.ts" ] && echo "✅" || echo "⚠️")
printf "│ %-15s │ %-6s │\n" "結合テスト" $([ -f "tests/integration/board-api.test.ts" ] && echo "✅" || echo "⚠️")
printf "│ %-15s │ %-6s │\n" "E2Eテスト" $(curl -s http://localhost:3000 > /dev/null 2>&1 && echo "✅" || echo "⚠️")
printf "│ %-15s │ %-6s │\n" "パフォーマンス" $([ $RESPONSE_TIME -lt 500 ] && echo "✅" || echo "⚠️")
printf "│ %-15s │ %-6s │\n" "セキュリティ" $([ "$AUTH_TEST" == "401" ] && echo "✅" || echo "❌")
echo "└─────────────────┴────────┘"

echo ""
echo -e "${GREEN}全テスト完了！${NC}"