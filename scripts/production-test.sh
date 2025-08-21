#!/bin/bash

# 本番環境テスト自動化スクリプト
# Usage: ./scripts/production-test.sh your-domain.com

DOMAIN=${1:-"your-domain.com"}
# localhost の場合は HTTP を使用
if [[ "$DOMAIN" == *"localhost"* ]] || [[ "$DOMAIN" == *"127.0.0.1"* ]]; then
    PROTOCOL="http"
else
    PROTOCOL="https"
fi
API_BASE="${PROTOCOL}://${DOMAIN}/api"
REPORT_DIR="./test-reports/$(date +%Y%m%d_%H%M%S)"

# カラー出力の設定
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# レポートディレクトリ作成
mkdir -p "$REPORT_DIR"

echo "================================================"
echo "本番環境テスト開始: ${DOMAIN}"
echo "レポート出力先: ${REPORT_DIR}"
echo "================================================"

# 1. APIヘルスチェック
echo -e "\n${YELLOW}[1/8] APIヘルスチェック${NC}"
health_check() {
    response=$(curl -s -o /dev/null -w "%{http_code}" "${API_BASE}/posts")
    if [ "$response" = "200" ]; then
        echo -e "${GREEN}✓ API接続: 正常 (HTTP ${response})${NC}"
        return 0
    else
        echo -e "${RED}✗ API接続: エラー (HTTP ${response})${NC}"
        return 1
    fi
}
health_check

# 2. SSL証明書チェック
echo -e "\n${YELLOW}[2/8] SSL証明書チェック${NC}"
ssl_check() {
    if [[ "$PROTOCOL" == "http" ]]; then
        echo -e "${YELLOW}△ SSL証明書: HTTPのためスキップ${NC}"
        return 0
    fi
    echo | openssl s_client -connect "${DOMAIN}:443" -servername "${DOMAIN}" 2>/dev/null | \
    openssl x509 -noout -dates > "${REPORT_DIR}/ssl_certificate.txt" 2>&1
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ SSL証明書: 有効${NC}"
        cat "${REPORT_DIR}/ssl_certificate.txt"
        return 0
    else
        echo -e "${RED}✗ SSL証明書: エラー${NC}"
        return 1
    fi
}
ssl_check

# 3. セキュリティヘッダーチェック
echo -e "\n${YELLOW}[3/8] セキュリティヘッダーチェック${NC}"
security_headers_check() {
    headers=$(curl -s -I "${PROTOCOL}://${DOMAIN}")
    echo "$headers" > "${REPORT_DIR}/security_headers.txt"
    
    required_headers=(
        "X-Content-Type-Options"
        "X-Frame-Options"
        "X-XSS-Protection"
        "Strict-Transport-Security"
    )
    
    missing_headers=()
    for header in "${required_headers[@]}"; do
        if echo "$headers" | grep -qi "$header"; then
            echo -e "${GREEN}✓ ${header}: 設定済み${NC}"
        else
            echo -e "${RED}✗ ${header}: 未設定${NC}"
            missing_headers+=("$header")
        fi
    done
    
    if [ ${#missing_headers[@]} -eq 0 ]; then
        return 0
    else
        return 1
    fi
}
security_headers_check

# 4. CRUD操作テスト
echo -e "\n${YELLOW}[4/8] CRUD操作テスト${NC}"
crud_test() {
    # CREATE
    echo -n "CREATE: "
    create_response=$(curl -s -X POST "${API_BASE}/posts" \
        -H "Content-Type: application/json" \
        -d '{"content":"自動テスト投稿 '"$(date +%s)"'"}')
    
    if echo "$create_response" | grep -q "_id"; then
        echo -e "${GREEN}✓${NC}"
        post_id=$(echo "$create_response" | grep -o '"_id":"[^"]*"' | cut -d'"' -f4)
    else
        echo -e "${RED}✗${NC}"
        return 1
    fi
    
    # READ
    echo -n "READ: "
    read_response=$(curl -s "${API_BASE}/posts")
    if echo "$read_response" | grep -q "$post_id"; then
        echo -e "${GREEN}✓${NC}"
    else
        echo -e "${RED}✗${NC}"
        return 1
    fi
    
    # UPDATE
    echo -n "UPDATE: "
    update_response=$(curl -s -X PUT "${API_BASE}/posts/${post_id}" \
        -H "Content-Type: application/json" \
        -d '{"content":"更新されたテスト投稿"}')
    
    if echo "$update_response" | grep -q "更新されたテスト投稿"; then
        echo -e "${GREEN}✓${NC}"
    else
        echo -e "${RED}✗${NC}"
        return 1
    fi
    
    # DELETE
    echo -n "DELETE: "
    delete_response=$(curl -s -X DELETE "${API_BASE}/posts/${post_id}")
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓${NC}"
    else
        echo -e "${RED}✗${NC}"
        return 1
    fi
    
    return 0
}
crud_test

# 5. レスポンスタイム測定
echo -e "\n${YELLOW}[5/8] レスポンスタイム測定${NC}"
response_time_test() {
    total_time=0
    count=10
    
    for i in $(seq 1 $count); do
        time=$(curl -s -o /dev/null -w "%{time_total}" "${API_BASE}/posts")
        total_time=$(echo "$total_time + $time" | bc)
        echo -n "."
    done
    echo
    
    avg_time=$(echo "scale=3; $total_time / $count" | bc)
    echo "平均レスポンスタイム: ${avg_time}秒"
    
    if (( $(echo "$avg_time < 0.5" | bc -l) )); then
        echo -e "${GREEN}✓ パフォーマンス: 良好 (<500ms)${NC}"
        return 0
    elif (( $(echo "$avg_time < 1.0" | bc -l) )); then
        echo -e "${YELLOW}△ パフォーマンス: 許容範囲 (<1s)${NC}"
        return 0
    else
        echo -e "${RED}✗ パフォーマンス: 要改善 (>1s)${NC}"
        return 1
    fi
}
response_time_test

# 6. 同時接続テスト
echo -e "\n${YELLOW}[6/8] 同時接続テスト (簡易版)${NC}"
concurrent_test() {
    echo "10個の同時リクエストを送信中..."
    
    success_count=0
    for i in $(seq 1 10); do
        curl -s -o /dev/null "${API_BASE}/posts" &
    done
    wait
    
    echo -e "${GREEN}✓ 同時接続テスト完了${NC}"
    return 0
}
concurrent_test

# 7. エラーハンドリングテスト
echo -e "\n${YELLOW}[7/8] エラーハンドリングテスト${NC}"
error_handling_test() {
    # 存在しないIDでのアクセス
    echo -n "404エラー処理: "
    response=$(curl -s -o /dev/null -w "%{http_code}" "${API_BASE}/posts/000000000000000000000000")
    if [ "$response" = "404" ]; then
        echo -e "${GREEN}✓ 正常 (HTTP 404)${NC}"
    else
        echo -e "${RED}✗ 異常 (HTTP ${response})${NC}"
        return 1
    fi
    
    # 不正なデータでのPOST
    echo -n "バリデーションエラー: "
    response=$(curl -s -X POST "${API_BASE}/posts" \
        -H "Content-Type: application/json" \
        -d '{"invalid":"data"}')
    
    if echo "$response" | grep -q "error"; then
        echo -e "${GREEN}✓ 正常${NC}"
    else
        echo -e "${YELLOW}△ エラーメッセージなし${NC}"
    fi
    
    return 0
}
error_handling_test

# 8. DNS解決テスト
echo -e "\n${YELLOW}[8/8] DNS解決テスト${NC}"
dns_test() {
    dns_result=$(nslookup "${DOMAIN}" 2>&1)
    echo "$dns_result" > "${REPORT_DIR}/dns_resolution.txt"
    
    if echo "$dns_result" | grep -q "Address"; then
        echo -e "${GREEN}✓ DNS解決: 正常${NC}"
        echo "$dns_result" | grep "Address" | tail -n1
        return 0
    else
        echo -e "${RED}✗ DNS解決: エラー${NC}"
        return 1
    fi
}
dns_test

# レポート生成
echo -e "\n${YELLOW}テストレポート生成中...${NC}"
cat > "${REPORT_DIR}/summary.txt" << EOF
================================================
本番環境テストレポート
================================================
ドメイン: ${DOMAIN}
実行日時: $(date)
================================================

テスト結果サマリー:
- APIヘルスチェック: $(health_check > /dev/null 2>&1 && echo "✓ PASS" || echo "✗ FAIL")
- SSL証明書: $(ssl_check > /dev/null 2>&1 && echo "✓ PASS" || echo "✗ FAIL")
- セキュリティヘッダー: $(security_headers_check > /dev/null 2>&1 && echo "✓ PASS" || echo "✗ FAIL")
- CRUD操作: $(crud_test > /dev/null 2>&1 && echo "✓ PASS" || echo "✗ FAIL")
- レスポンスタイム: $(response_time_test > /dev/null 2>&1 && echo "✓ PASS" || echo "✗ FAIL")
- 同時接続: $(concurrent_test > /dev/null 2>&1 && echo "✓ PASS" || echo "✗ FAIL")
- エラーハンドリング: $(error_handling_test > /dev/null 2>&1 && echo "✓ PASS" || echo "✗ FAIL")
- DNS解決: $(dns_test > /dev/null 2>&1 && echo "✓ PASS" || echo "✗ FAIL")

詳細レポート:
- ${REPORT_DIR}/ssl_certificate.txt
- ${REPORT_DIR}/security_headers.txt
- ${REPORT_DIR}/dns_resolution.txt
EOF

echo -e "\n${GREEN}================================================${NC}"
echo -e "${GREEN}テスト完了！${NC}"
echo -e "${GREEN}レポート: ${REPORT_DIR}/summary.txt${NC}"
echo -e "${GREEN}================================================${NC}"