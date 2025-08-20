#!/bin/bash

echo "🧪 認証機能テストの実行"
echo "========================"

# カラー定義
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 1. 環境変数の設定
echo "📝 テスト環境の準備..."
export NODE_ENV=test
export MONGODB_URI=mongodb://localhost:27017/member-board-test

# 2. MongoDBが起動しているか確認
if ! pgrep -x "mongod" > /dev/null
then
    echo -e "${RED}❌ MongoDBが起動していません。${NC}"
    echo "以下のコマンドでMongoDBを起動してください:"
    echo "  brew services start mongodb-community (macOS)"
    echo "  sudo systemctl start mongod (Linux)"
    exit 1
fi

echo -e "${GREEN}✅ MongoDBが起動しています${NC}"

# 3. ユニットテストの実行
echo ""
echo "🔬 ユニットテストの実行..."
echo "------------------------"

# 個別のテストファイルを実行
echo "📌 ユーザー登録テスト:"
npm test -- src/__tests__/unit/auth/register.test.ts --verbose

echo ""
echo "📌 ログイン機能テスト:"
npm test -- src/__tests__/unit/auth/login.test.ts --verbose

# 4. カバレッジレポート
echo ""
echo "📊 カバレッジレポートの生成..."
npm run test:coverage -- --testPathPattern="auth" --silent

# 5. E2Eテストの準備
echo ""
echo "🌐 E2Eテストの実行..."
echo "-------------------"

# 開発サーバーが起動しているか確認
if ! curl -s http://localhost:3000 > /dev/null
then
    echo -e "${RED}❌ 開発サーバーが起動していません。${NC}"
    echo "別のターミナルで以下のコマンドを実行してください:"
    echo "  npm run dev"
    echo ""
    echo "E2Eテストをスキップします。"
else
    echo -e "${GREEN}✅ 開発サーバーが起動しています${NC}"
    
    # Playwrightのインストール確認
    if ! npx playwright --version > /dev/null 2>&1
    then
        echo "📦 Playwrightブラウザのインストール..."
        npx playwright install
    fi
    
    # E2Eテストの実行
    npm run test:e2e -- e2e/auth.spec.ts
fi

# 6. 結果のまとめ
echo ""
echo "📈 テスト結果サマリー"
echo "=================="

# テスト結果の簡単な統計を表示
if [ -f coverage/coverage-summary.json ]; then
    echo "カバレッジ:"
    node -e "
    const coverage = require('./coverage/coverage-summary.json');
    const total = coverage.total;
    console.log('  Lines: ' + total.lines.pct + '%');
    console.log('  Statements: ' + total.statements.pct + '%');
    console.log('  Functions: ' + total.functions.pct + '%');
    console.log('  Branches: ' + total.branches.pct + '%');
    "
fi

echo ""
echo -e "${GREEN}✨ テスト実行完了！${NC}"
echo ""
echo "詳細なレポート:"
echo "  - カバレッジ: coverage/lcov-report/index.html"
echo "  - E2Eレポート: playwright-report/index.html"