#!/bin/bash

echo "🔍 Bio更新の直接テスト"
echo "================================"

# 1. まずブラウザでログインしてCookieを取得してください
echo "⚠️ 事前準備:"
echo "1. ブラウザで http://localhost:3000 にログイン"
echo "2. DevTools > Application > Cookies"
echo "3. next-auth.session-tokenの値をコピー"
echo ""
echo "準備ができたらEnterキーを押してください..."
read

echo "Cookieを入力してください (next-auth.session-token):"
read COOKIE

if [ -z "$COOKIE" ]; then
  echo "❌ Cookieが入力されていません"
  exit 1
fi

# テストデータ
BIO_TEXT="テスト自己紹介 $(date +%Y%m%d_%H%M%S)"

echo ""
echo "📤 送信データ:"
echo "  bio: $BIO_TEXT"
echo ""

# APIを直接呼び出し
echo "🚀 /api/profile/simple にPUTリクエスト..."
curl -X PUT http://localhost:3000/api/profile/simple \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=$COOKIE" \
  -d "{\"bio\":\"$BIO_TEXT\"}" \
  -w "\nStatus: %{http_code}\n"

echo ""
echo "================================"
echo "MongoDBで確認:"
echo "mongosh boardDB --quiet --eval 'db.users.findOne({email:\"one.photolife+1@gmail.com\"},{bio:1})'"