#!/bin/bash

echo "🧪 権限管理APIテスト開始"
echo "================================"

# テスト用の投稿IDを設定（実際のIDに置き換える必要があります）
POST_ID="689d231c71658c3212b2f6c2"

echo ""
echo "1️⃣ 未認証アクセステスト (401エラーが期待される)"
echo "----------------------------------------"
curl -X PUT http://localhost:3000/api/posts/${POST_ID} \
  -H "Content-Type: application/json" \
  -d '{"content": "Unauthorized update"}' \
  -w "\nHTTPステータス: %{http_code}\n" \
  -s

echo ""
echo "2️⃣ 権限情報取得テスト（未認証）"
echo "----------------------------------------"
curl -X GET http://localhost:3000/api/user/permissions \
  -w "\nHTTPステータス: %{http_code}\n" \
  -s

echo ""
echo "3️⃣ 投稿一覧取得テスト（公開API）"
echo "----------------------------------------"
curl -X GET "http://localhost:3000/api/posts?limit=2" \
  -w "\nHTTPステータス: %{http_code}\n" \
  -s | head -100

echo ""
echo "✅ APIテスト完了"
echo "================================"