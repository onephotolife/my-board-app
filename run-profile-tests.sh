#!/bin/bash

# プロフィール機能テスト実行スクリプト

echo "========================================="
echo "🧪 プロフィール機能テストスイート"
echo "========================================="
echo ""

# 色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ステップ1: 環境確認
echo -e "${BLUE}📋 Step 1: 環境確認${NC}"
echo "------------------------"

# Node.jsバージョン確認
echo -n "Node.js: "
node --version

# npm確認
echo -n "npm: "
npm --version

# MongoDB確認
echo -n "MongoDB: "
if pgrep -x "mongod" > /dev/null; then
    echo -e "${GREEN}✅ 起動中${NC}"
else
    echo -e "${RED}❌ 停止中${NC}"
    echo -e "${YELLOW}MongoDBを起動してください: mongod${NC}"
    exit 1
fi

echo ""

# ステップ2: 依存関係確認
echo -e "${BLUE}📋 Step 2: 依存関係確認${NC}"
echo "------------------------"

# Puppeteerのインストール確認
if [ ! -d "node_modules/puppeteer" ]; then
    echo -e "${YELLOW}Puppeteerがインストールされていません${NC}"
    echo "インストール中..."
    npm install puppeteer
fi

# node-fetchのインストール確認
if [ ! -d "node_modules/node-fetch" ]; then
    echo -e "${YELLOW}node-fetchがインストールされていません${NC}"
    echo "インストール中..."
    npm install node-fetch@2
fi

echo -e "${GREEN}✅ 依存関係OK${NC}"
echo ""

# ステップ3: テストユーザー作成
echo -e "${BLUE}📋 Step 3: テストユーザー作成${NC}"
echo "------------------------"
node test-profile-setup.js
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ テストユーザー作成失敗${NC}"
    exit 1
fi
echo ""

# ステップ4: 開発サーバー起動確認
echo -e "${BLUE}📋 Step 4: 開発サーバー確認${NC}"
echo "------------------------"

# サーバーが起動しているか確認
if curl -s http://localhost:3000 > /dev/null; then
    echo -e "${GREEN}✅ 開発サーバー起動中${NC}"
else
    echo -e "${YELLOW}⚠️  開発サーバーが起動していません${NC}"
    echo "別のターミナルで以下を実行してください:"
    echo "npm run dev"
    echo ""
    echo "サーバーを起動してから再度このスクリプトを実行してください"
    exit 1
fi
echo ""

# ステップ5: デバッグ実行
echo -e "${BLUE}📋 Step 5: デバッグチェック${NC}"
echo "------------------------"
node debug-profile.js
echo ""

# ステップ6: テスト実行選択
echo -e "${BLUE}📋 Step 6: テスト実行${NC}"
echo "------------------------"
echo "実行するテストを選択してください:"
echo "1) 手動テスト手順書を開く"
echo "2) 自動テストを実行"
echo "3) 両方実行"
echo "4) 終了"
echo ""
read -p "選択 (1-4): " choice

case $choice in
    1)
        echo -e "${GREEN}手動テスト手順書を開いています...${NC}"
        if command -v code &> /dev/null; then
            code PROFILE_TEST_MANUAL.md
        else
            echo "PROFILE_TEST_MANUAL.md を手動で開いてください"
        fi
        echo "ブラウザで http://localhost:3000 を開いてテストを実行してください"
        ;;
    2)
        echo -e "${GREEN}自動テストを実行中...${NC}"
        node test-profile-automated.js
        ;;
    3)
        echo -e "${GREEN}手動テスト手順書を開いています...${NC}"
        if command -v code &> /dev/null; then
            code PROFILE_TEST_MANUAL.md
        fi
        echo ""
        echo -e "${GREEN}自動テストを実行中...${NC}"
        node test-profile-automated.js
        ;;
    4)
        echo "テストを終了します"
        exit 0
        ;;
    *)
        echo -e "${RED}無効な選択です${NC}"
        exit 1
        ;;
esac

echo ""
echo "========================================="
echo -e "${GREEN}✨ テスト完了${NC}"
echo "========================================="