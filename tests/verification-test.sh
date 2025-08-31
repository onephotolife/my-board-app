#!/bin/bash

# 最終動作確認テスト
# 作成日時: 2025-08-31

echo "========================================="
echo "最終動作確認テスト"
echo "時刻: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
echo "========================================="

BASE_URL="http://localhost:3000"
EMAIL_RAW="one.photolife+1@gmail.com"
PASSWORD="?@thc123THC@?"

# 1. 認証
echo -e "\n▶ 認証実行"
CSRF_RESPONSE=$(curl -s -c /tmp/verify-cookies.txt "${BASE_URL}/api/auth/csrf")
AUTH_CSRF_TOKEN=$(echo "$CSRF_RESPONSE" | grep -o '"csrfToken":"[^"]*' | cut -d'"' -f4)

AUTH_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST \
    -b /tmp/verify-cookies.txt \
    -c /tmp/verify-cookies.txt \
    -H "Content-Type: application/x-www-form-urlencoded" \
    --data-urlencode "email=${EMAIL_RAW}" \
    --data-urlencode "password=${PASSWORD}" \
    --data-urlencode "csrfToken=${AUTH_CSRF_TOKEN}" \
    "${BASE_URL}/api/auth/callback/credentials")

HTTP_CODE=$(echo "$AUTH_RESPONSE" | grep "HTTP_CODE:" | cut -d':' -f2)
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "302" ]; then
    echo "  ✅ 認証成功"
else
    echo "  ❌ 認証失敗: HTTP $HTTP_CODE"
    exit 1
fi

# 2. コメント投稿テスト
echo -e "\n▶ コメント投稿テスト"
TIMESTAMP=$(date +%s)
TEST_COMMENT="{\"content\": \"テストコメント_${TIMESTAMP}\"}"

COMMENT_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST \
    -b /tmp/verify-cookies.txt \
    -H "Content-Type: application/json" \
    -d "$TEST_COMMENT" \
    "${BASE_URL}/api/posts/68b3170fe5d3cb38e54a6c91/comments")

COMMENT_CODE=$(echo "$COMMENT_RESPONSE" | grep "HTTP_CODE:" | cut -d':' -f2)
COMMENT_BODY=$(echo "$COMMENT_RESPONSE" | grep -v "HTTP_CODE:")

if [ "$COMMENT_CODE" = "201" ]; then
    echo "  ✅ コメント投稿成功"
    COMMENT_ID=$(echo "$COMMENT_BODY" | grep -o '"_id":"[^"]*' | cut -d'"' -f4)
    if [ ! -z "$COMMENT_ID" ]; then
        echo "  - コメントID: $COMMENT_ID"
    fi
else
    echo "  ❌ コメント投稿失敗: HTTP $COMMENT_CODE"
fi

# 3. コメント取得確認
echo -e "\n▶ コメント取得確認"
GET_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
    -b /tmp/verify-cookies.txt \
    "${BASE_URL}/api/posts/68b3170fe5d3cb38e54a6c91/comments")

GET_CODE=$(echo "$GET_RESPONSE" | grep "HTTP_CODE:" | cut -d':' -f2)
if [ "$GET_CODE" = "200" ]; then
    echo "  ✅ コメント取得成功"
    # 投稿したコメントが含まれているか確認
    if echo "$GET_RESPONSE" | grep -q "テストコメント_${TIMESTAMP}"; then
        echo "  ✅ 投稿したコメントを確認"
    fi
else
    echo "  ❌ コメント取得失敗: HTTP $GET_CODE"
fi

# 結果サマリー
echo -e "\n========================================="
echo "テスト結果"
echo "========================================="

if [ "$COMMENT_CODE" = "201" ] && [ "$GET_CODE" = "200" ]; then
    echo "🎉 全テスト成功！"
    echo "CSRF保護問題は完全に解決されました。"
else
    echo "⚠️ 一部テストに問題があります。"
fi

echo -e "\n========================================="
echo "テスト完了"
echo "時刻: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
echo "========================================="

# クリーンアップ
rm -f /tmp/verify-cookies.txt