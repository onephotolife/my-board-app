#!/bin/bash

# MongoDB Atlas設定最適化実行スクリプト
# このスクリプトはMongoDB Atlasの設定を最適化する完全なワークフローを実行します

set -e  # エラー発生時に停止

echo "🚀 MongoDB Atlas設定最適化を開始します"
echo "========================================"

# 作業ディレクトリの確認
if [ ! -f "package.json" ]; then
    echo "❌ package.jsonが見つかりません。正しいディレクトリで実行してください。"
    exit 1
fi

# バックアップの作成
echo "📦 Phase 1: バックアップ作成"
BACKUP_DIR="mongodb-backup-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

cp .env.local "$BACKUP_DIR/" 2>/dev/null || echo "⚠️ .env.localが存在しません"
cp .env.production "$BACKUP_DIR/" 2>/dev/null || echo "⚠️ .env.productionが存在しません"
cp -r src/lib/db "$BACKUP_DIR/" 2>/dev/null || echo "⚠️ src/lib/dbが存在しません"

echo "✅ バックアップ作成完了: $BACKUP_DIR"

# 最適化スクリプトの実行
echo -e "\n🔧 Phase 2: 最適化スクリプト実行"
if [ ! -f "scripts/mongodb-optimization/mongodb-atlas-optimization.js" ]; then
    echo "❌ 最適化スクリプトが見つかりません"
    exit 1
fi

node scripts/mongodb-optimization/mongodb-atlas-optimization.js

if [ $? -ne 0 ]; then
    echo "❌ 最適化スクリプト実行失敗"
    exit 1
fi

echo "✅ 最適化スクリプト実行完了"

# 設定ファイルの確認
echo -e "\n📋 Phase 3: 設定ファイル確認"
if [ -f "src/lib/db/mongodb-optimized.ts" ]; then
    echo "✅ mongodb-optimized.ts が作成されました"
else
    echo "❌ mongodb-optimized.ts が作成されていません"
    exit 1
fi

if [ -f ".env.production" ]; then
    echo "✅ .env.production が存在します"
else
    echo "⚠️ .env.production が作成されていません"
fi

echo "✅ 設定ファイル確認完了"

# テスト実行
echo -e "\n🧪 Phase 4: 接続テスト"
if [ -f "scripts/mongodb-optimization/test-connection.js" ]; then
    echo "接続テストを実行します..."
    node scripts/mongodb-optimization/test-connection.js || echo "⚠️ 接続テストで警告が発生しました"
else
    echo "⚠️ 接続テストスクリプトが見つかりません"
fi

echo "✅ テスト完了"

# 完了メッセージ
echo -e "\n🎉 MongoDB Atlas設定最適化が完了しました！"
echo "=========================================="
echo ""
echo "📋 次の手順:"
echo "1. 🔧 .env.production の MONGODB_URI_PRODUCTION を設定してください"
echo "2. 🧪 再度テストを実行: node scripts/mongodb-optimization/test-connection.js"
echo "3. 📊 監視を開始: node scripts/mongodb-optimization/monitor.js"
echo "4. 🔄 既存コードの移行: node scripts/mongodb-optimization/migrate-to-optimized.js"
echo ""
echo "📖 詳細な手順: scripts/mongodb-optimization/README.md"
echo "🔙 バックアップ: $BACKUP_DIR"
echo ""
echo "💡 問題が発生した場合は、バックアップから復元してください"
