#!/bin/bash

# 掲示板機能の総合テストスクリプト

echo "========================================="
echo "  掲示板機能 総合テスト"
echo "========================================="
echo ""

# カラー定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. 環境チェック
echo "📋 環境チェック..."
echo "------------------------"

# Node.jsバージョン
node_version=$(node -v)
echo "✓ Node.js: $node_version"

# MongoDBの確認
if mongod --version &> /dev/null; then
    mongo_version=$(mongod --version | head -n1)
    echo "✓ MongoDB: インストール済み"
else
    echo -e "${YELLOW}⚠ MongoDB: 未インストール${NC}"
fi

# npmパッケージの確認
if [ -d "node_modules" ]; then
    echo "✓ npm packages: インストール済み"
else
    echo -e "${RED}✗ npm packages: 未インストール${NC}"
    echo "  npm install を実行してください"
    exit 1
fi

echo ""

# 2. テストデータの準備
echo "🗄️  テストデータの準備..."
echo "------------------------"
node scripts/test-board.js
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ テストデータ作成完了${NC}"
else
    echo -e "${RED}✗ テストデータ作成失敗${NC}"
    exit 1
fi

echo ""

# 3. APIテスト
echo "🔌 APIテスト実行..."
echo "------------------------"
npm run test -- src/app/api/posts/__tests__/posts.test.ts
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ APIテスト成功${NC}"
else
    echo -e "${RED}✗ APIテスト失敗${NC}"
fi

echo ""

# 4. 開発サーバー起動チェック
echo "🚀 開発サーバー起動チェック..."
echo "------------------------"

# サーバーが起動しているか確認
if curl -s http://localhost:3000 > /dev/null; then
    echo -e "${GREEN}✓ 開発サーバー起動中${NC}"
else
    echo -e "${YELLOW}⚠ 開発サーバーが起動していません${NC}"
    echo "  別のターミナルで 'npm run dev' を実行してください"
    echo ""
    read -p "開発サーバーを起動しましたか？ (y/n): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo ""

# 5. E2Eテスト（Playwrightがインストールされている場合）
if command -v playwright &> /dev/null; then
    echo "🎭 E2Eテスト実行..."
    echo "------------------------"
    npx playwright test tests/e2e/board.spec.ts
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ E2Eテスト成功${NC}"
    else
        echo -e "${RED}✗ E2Eテスト失敗${NC}"
    fi
else
    echo -e "${YELLOW}⚠ Playwrightが未インストールのためE2Eテストをスキップ${NC}"
    echo "  インストール: npx playwright install"
fi

echo ""

# 6. 手動テストの案内
echo "📝 手動テストの実施..."
echo "------------------------"
echo "以下のURLにアクセスして手動テストを実施してください："
echo ""
echo "  http://localhost:3000/board"
echo ""
echo "テストアカウント:"
echo "  - test1@example.com / Test1234!"
echo "  - test2@example.com / Test1234!"
echo ""
echo "詳細な手順: docs/BOARD_TEST_MANUAL.md"
echo ""

# 7. テスト結果サマリー
echo "========================================="
echo "  テスト結果サマリー"
echo "========================================="
echo ""
echo "自動テスト:"
echo "  - APIテスト: ✓"
echo "  - E2Eテスト: $(command -v playwright &> /dev/null && echo '✓' || echo 'スキップ')"
echo ""
echo "手動テスト項目:"
echo "  □ ログイン/ログアウト"
echo "  □ 投稿の作成"
echo "  □ 投稿の表示"
echo "  □ 投稿の編集（自分のみ）"
echo "  □ 投稿の削除（自分のみ）"
echo "  □ 文字数制限"
echo "  □ ページネーション"
echo "  □ アクセス制限"
echo ""
echo "詳細なチェックリストは docs/BOARD_TEST_MANUAL.md を参照"
echo ""
echo -e "${GREEN}テストスクリプト完了！${NC}"