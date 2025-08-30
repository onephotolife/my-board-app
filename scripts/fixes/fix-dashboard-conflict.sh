#!/bin/bash
# Dashboard Route競合自動修復スクリプト
# Generated: 2025-08-30T08:45:00+09:00
# STRICT120準拠 - Solution #1実装

echo "🔧 Dashboard Route競合修復開始..."
echo "  対象: src/app/dashboard/page.tsx"
echo "  解決策: Solution #1（ファイル削除）"
echo ""

# 1. 事前チェック
echo "📋 事前チェック..."
if [ ! -f "src/app/dashboard/page.tsx" ]; then
  echo "✅ 競合ファイルは既に削除されています"
  exit 0
fi

if [ ! -f "src/app/(main)/dashboard/page.tsx" ]; then
  echo "❌ エラー: Route Group内のdashboard/page.tsxが見つかりません"
  echo "  両方のファイルが削除されている可能性があります"
  exit 1
fi

# 2. バックアップ作成
BACKUP_FILE="src/app/dashboard/page.tsx.backup.$(date +%Y%m%d%H%M%S)"
echo "📦 バックアップ作成中..."
cp src/app/dashboard/page.tsx "$BACKUP_FILE"
echo "✅ バックアップ完了: $BACKUP_FILE"

# 3. ファイルサイズ確認（確認用）
FILE_SIZE=$(wc -l src/app/dashboard/page.tsx | awk '{print $1}')
echo "📊 削除対象ファイル: ${FILE_SIZE}行"

# 4. 競合ファイル削除
echo "🗑️ 競合ファイル削除中..."
rm -f src/app/dashboard/page.tsx
if [ $? -eq 0 ]; then
  echo "✅ dashboard/page.tsx 削除完了"
else
  echo "❌ 削除失敗"
  exit 1
fi

# 5. キャッシュクリア
echo "🧹 キャッシュクリア中..."
if [ -d ".next" ]; then
  rm -rf .next
  echo "✅ .nextディレクトリ削除完了"
else
  echo "⚠️ .nextディレクトリが見つかりません（問題なし）"
fi

# 6. 開発サーバー再起動
echo "🔄 開発サーバー再起動中..."
# 既存のNext.jsプロセスを終了
pkill -f "next dev" 2>/dev/null || true
pkill -f "node.*server.js" 2>/dev/null || true

# 新しいサーバーを起動（バックグラウンド）
echo "  サーバー起動コマンド: npm run dev"
nohup npm run dev > dev.log 2>&1 &
SERVER_PID=$!
echo "✅ サーバー起動（PID: $SERVER_PID）"

# 7. サーバー起動待機
echo "⏳ サーバー起動待機中..."
sleep 5

# 8. 検証
echo "🔍 修復結果検証中..."
MAX_ATTEMPTS=3
ATTEMPT=1
SUCCESS=false

while [ $ATTEMPT -le $MAX_ATTEMPTS ]; do
  echo "  検証試行 $ATTEMPT/$MAX_ATTEMPTS..."
  
  # HTTP STATUS確認
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/dashboard 2>/dev/null)
  
  if [ "$STATUS" = "200" ] || [ "$STATUS" = "307" ]; then
    SUCCESS=true
    break
  elif [ "$STATUS" = "500" ]; then
    # エラー内容確認
    ERROR_CONTENT=$(curl -s http://localhost:3000/dashboard 2>/dev/null | head -500)
    if echo "$ERROR_CONTENT" | grep -q "parallel pages"; then
      echo "  ❌ まだRoute競合エラーが発生しています"
    else
      echo "  ⚠️ 500エラー（Route競合以外）"
    fi
  else
    echo "  Status: $STATUS"
  fi
  
  ATTEMPT=$((ATTEMPT + 1))
  if [ $ATTEMPT -le $MAX_ATTEMPTS ]; then
    sleep 3
  fi
done

# 9. 最終結果
echo ""
echo "=" 
echo "📊 修復結果"
echo "="

if [ "$SUCCESS" = true ]; then
  echo "✅ 修復成功！"
  echo "  HTTP Status: $STATUS"
  echo "  Dashboard URL: http://localhost:3000/dashboard"
  echo ""
  echo "📝 次のステップ:"
  echo "  1. ブラウザでhttp://localhost:3000/dashboardにアクセス"
  echo "  2. 正常に表示されることを確認"
  echo "  3. 他の競合も同様に修正（posts/*, profile）"
else
  echo "❌ 修復失敗"
  echo "  最終Status: $STATUS"
  echo ""
  echo "🔧 ロールバック手順:"
  echo "  cp $BACKUP_FILE src/app/dashboard/page.tsx"
  echo "  rm -rf .next"
  echo "  npm run dev"
  exit 1
fi

echo ""
echo "🎉 修復プロセス完了"
echo ""
echo "📌 他の競合修正用コマンド:"
echo "  ./fix-posts-new-conflict.sh"
echo "  ./fix-posts-id-edit-conflict.sh"
echo "  ./fix-posts-id-conflict.sh"
echo "  ./fix-profile-conflict.sh"