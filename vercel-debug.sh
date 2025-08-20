#!/bin/bash

echo "🔍 Vercelデバッグ情報を収集"
echo "============================"

echo ""
echo "📁 プロジェクト構造:"
echo "-------------------"
find src/app -name "page.tsx" -o -name "page.jsx" -o -name "page.js" | head -10

echo ""
echo "📄 メインページの最初の行:"
echo "-------------------------"
head -5 src/app/page.tsx

echo ""
echo "🔄 最新のコミット:"
echo "-----------------"
git log --oneline -1

echo ""
echo "🌿 現在のブランチ:"
echo "-----------------"
git branch --show-current

echo ""
echo "📦 package.jsonのビルドコマンド:"
echo "-------------------------------"
grep -A2 '"build"' package.json

echo ""
echo "⚙️ vercel.jsonの設定:"
echo "--------------------"
grep -A2 '"buildCommand"' vercel.json || echo "buildCommandの設定なし"

echo ""
echo "🚀 Deploy Hook実行:"
echo "------------------"
curl -X POST "https://api.vercel.com/v1/integrations/deploy/prj_0jSG4q8kLrX1RO20S0CChr9mGrTR/Fdy6jgFgQv"

echo ""
echo ""
echo "✅ デプロイを開始しました！"
echo "2-3分後に https://board.blankbrainai.com を確認してください"