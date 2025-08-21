#!/bin/bash

# 会員制掲示板 APIテストスクリプト
# 深い思考に基づく包括的なAPIテスト

BASE_URL="https://board.blankbrainai.com"
TOKEN=""  # 実際のテストでは有効なトークンを設定

# カラー出力用
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# テスト結果カウンター
PASSED=0
FAILED=0

# テスト関数
run_test() {
    local test_name=$1
    local result=$2
    
    if [ $result -eq 0 ]; then
        echo -e "${GREEN}✅ PASS${NC}: $test_name"
        ((PASSED++))
    else
        echo -e "${RED}❌ FAIL${NC}: $test_name"
        ((FAILED++))
    fi
}

echo "========================================="
echo "   会員制掲示板 API包括的テスト"
echo "========================================="
echo ""

# 1. ヘルスチェック
echo "📋 1. ヘルスチェックテスト"
echo "------------------------"

# 基本的なヘルスチェック
response=$(curl -s -o /dev/null -w "%{http_code}" $BASE_URL/api/health)
[ "$response" = "200" ]
run_test "ヘルスチェック API" $?

# レスポンスタイム測定
response_time=$(curl -s -o /dev/null -w "%{time_total}" $BASE_URL/api/health)
result=$(echo "$response_time < 0.5" | bc)
[ "$result" = "1" ]
run_test "レスポンスタイム < 500ms" $?

echo ""

# 2. 認証テスト
echo "🔐 2. 認証テスト"
echo "------------------------"

# 認証なしでのアクセス拒否
response=$(curl -s -o /dev/null -w "%{http_code}" $BASE_URL/api/posts)
[ "$response" = "401" ]
run_test "認証なしアクセス拒否" $?

# 不正なトークンでのアクセス拒否
response=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "Authorization: Bearer invalid_token" \
    $BASE_URL/api/posts)
[ "$response" = "401" ]
run_test "不正トークン拒否" $?

echo ""

# 3. レート制限テスト
echo "⏱️ 3. レート制限テスト"
echo "------------------------"

# 連続リクエストテスト
success_count=0
for i in {1..10}; do
    response=$(curl -s -o /dev/null -w "%{http_code}" $BASE_URL/api/health)
    if [ "$response" = "200" ]; then
        ((success_count++))
    fi
done
[ "$success_count" -eq 10 ]
run_test "10連続リクエスト成功" $?

echo ""

# 4. セキュリティヘッダーテスト
echo "🛡️ 4. セキュリティヘッダーテスト"
echo "------------------------"

# CSPヘッダー確認
headers=$(curl -s -I $BASE_URL/api/health)
echo "$headers" | grep -q "content-security-policy"
run_test "CSPヘッダー存在" $?

# HSTSヘッダー確認
echo "$headers" | grep -q "strict-transport-security"
run_test "HSTSヘッダー存在" $?

# X-Frame-Options確認
echo "$headers" | grep -q "x-frame-options: DENY"
run_test "X-Frame-Options: DENY" $?

# X-Content-Type-Options確認
echo "$headers" | grep -q "x-content-type-options: nosniff"
run_test "X-Content-Type-Options: nosniff" $?

echo ""

# 5. 入力検証テスト
echo "✏️ 5. 入力検証テスト"
echo "------------------------"

# XSSペイロードテスト（認証が必要な場合はスキップ）
if [ ! -z "$TOKEN" ]; then
    response=$(curl -s -X POST $BASE_URL/api/posts \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d '{"title":"<script>alert(1)</script>","content":"test"}')
    
    echo "$response" | grep -q "<script>" && result=1 || result=0
    [ "$result" -eq 0 ]
    run_test "XSSペイロードサニタイズ" $?
else
    echo -e "${YELLOW}⚠️  SKIP${NC}: 認証が必要なテストはスキップ"
fi

echo ""

# 6. エラーハンドリングテスト
echo "⚠️ 6. エラーハンドリングテスト"
echo "------------------------"

# 存在しないエンドポイント
response=$(curl -s -o /dev/null -w "%{http_code}" $BASE_URL/api/nonexistent)
[ "$response" = "404" ]
run_test "404エラー処理" $?

# 不正なメソッド
response=$(curl -s -X DELETE -o /dev/null -w "%{http_code}" $BASE_URL/api/health)
[ "$response" = "405" ]
run_test "405メソッド不許可" $?

echo ""

# 7. パフォーマンステスト
echo "📈 7. パフォーマンステスト"
echo "------------------------"

# 平均レスポンスタイム計算
total_time=0
for i in {1..10}; do
    time=$(curl -s -o /dev/null -w "%{time_total}" $BASE_URL/api/health)
    total_time=$(echo "$total_time + $time" | bc)
done
avg_time=$(echo "scale=3; $total_time / 10" | bc)
echo "平均レスポンスタイム: ${avg_time}秒"

result=$(echo "$avg_time < 0.3" | bc)
[ "$result" = "1" ]
run_test "平均レスポンス < 300ms" $?

echo ""

# 8. 同時接続テスト
echo "👥 8. 同時接続テスト"
echo "------------------------"

# 10並列リクエスト
for i in {1..10}; do
    curl -s -o /dev/null -w "%{http_code}\n" $BASE_URL/api/health &
done > parallel_results.txt
wait

success_parallel=$(grep -c "200" parallel_results.txt)
[ "$success_parallel" -eq 10 ]
run_test "10並列リクエスト成功" $?
rm -f parallel_results.txt

echo ""

# 9. CORS設定テスト
echo "🌐 9. CORS設定テスト"
echo "------------------------"

# CORSヘッダー確認
response=$(curl -s -I -H "Origin: https://example.com" $BASE_URL/api/health)
echo "$response" | grep -q "access-control-allow-origin"
run_test "CORSヘッダー設定" $?

echo ""

# 10. キャッシュ動作テスト
echo "💾 10. キャッシュテスト"
echo "------------------------"

# 初回リクエスト
time1=$(curl -s -o /dev/null -w "%{time_total}" $BASE_URL/api/health)
sleep 0.5

# 2回目リクエスト（キャッシュヒット期待）
time2=$(curl -s -o /dev/null -w "%{time_total}" $BASE_URL/api/health)

# 2回目の方が速いことを確認
result=$(echo "$time2 < $time1" | bc)
[ "$result" = "1" ]
run_test "キャッシュ効果確認" $?

echo ""
echo "========================================="
echo "         テスト結果サマリー"
echo "========================================="
echo -e "${GREEN}✅ 成功: $PASSED${NC}"
echo -e "${RED}❌ 失敗: $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 すべてのテストが成功しました！${NC}"
    exit 0
else
    echo -e "${RED}⚠️  一部のテストが失敗しました${NC}"
    exit 1
fi