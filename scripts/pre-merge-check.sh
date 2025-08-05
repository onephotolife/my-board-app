#!/bin/bash

# Pre-merge チェックスクリプト
# 使用方法: ./scripts/pre-merge-check.sh

set -e

echo "🔍 feature/member-board → main マージ前チェックを開始します..."
echo ""

# 色の定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# チェック結果を保存
FAILED_CHECKS=0

# チェック関数
check_command() {
    local description=$1
    local command=$2
    
    echo -n "📋 $description... "
    
    if eval $command > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC}"
        return 0
    else
        echo -e "${RED}✗${NC}"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
        return 1
    fi
}

# 詳細チェック関数
check_with_output() {
    local description=$1
    local command=$2
    local expected_output=$3
    
    echo -n "📋 $description... "
    
    output=$(eval $command 2>&1)
    
    if [[ $output == *"$expected_output"* ]] || [[ -z "$expected_output" && $? -eq 0 ]]; then
        echo -e "${GREEN}✓${NC}"
        return 0
    else
        echo -e "${RED}✗${NC}"
        echo "   詳細: $output"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
        return 1
    fi
}

echo "=== 1. コード品質チェック ==="
check_command "TypeScript型チェック" "npx tsc --noEmit"
check_command "ESLintチェック" "npm run lint"
check_command "ビルドテスト" "npm run build"

echo ""
echo "=== 2. テストチェック ==="
if check_command "単体テスト実行" "npm test -- --passWithNoTests"; then
    # テストカバレッジ確認（存在する場合）
    if [ -f "coverage/coverage-summary.json" ]; then
        coverage=$(grep -o '"pct":[0-9.]*' coverage/coverage-summary.json | head -1 | cut -d':' -f2)
        echo "   カバレッジ: ${coverage}%"
    fi
fi

echo ""
echo "=== 3. Git状態チェック ==="
# 未コミットの変更確認
if git diff-index --quiet HEAD --; then
    echo -e "📋 未コミットの変更... ${GREEN}なし✓${NC}"
else
    echo -e "📋 未コミットの変更... ${YELLOW}あり⚠${NC}"
    git status --short
fi

# mainブランチとの差分
echo -n "📋 mainブランチとの差分... "
COMMITS_AHEAD=$(git rev-list --count main..HEAD 2>/dev/null || echo "0")
FILES_CHANGED=$(git diff --name-only main...HEAD 2>/dev/null | wc -l | xargs)
echo "${COMMITS_AHEAD} commits, ${FILES_CHANGED} files"

echo ""
echo "=== 4. セキュリティチェック ==="
# 機密情報のチェック
echo -n "📋 ハードコードされた機密情報... "
if grep -r "password\|secret\|api[_-]key" --include="*.ts" --include="*.tsx" --include="*.js" --exclude-dir=node_modules --exclude-dir=.next . | grep -v "env\|process.env\|interface\|type" > /dev/null 2>&1; then
    echo -e "${RED}✗ 疑わしいコードが見つかりました${NC}"
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
else
    echo -e "${GREEN}✓${NC}"
fi

# npm audit
echo -n "📋 依存関係の脆弱性... "
audit_output=$(npm audit --json 2>/dev/null || echo '{"vulnerabilities":{}}')
vulnerabilities=$(echo $audit_output | grep -o '"total":[0-9]*' | cut -d':' -f2 || echo "0")
if [ "$vulnerabilities" -eq "0" ]; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${YELLOW}${vulnerabilities}件の脆弱性${NC}"
fi

echo ""
echo "=== 5. パフォーマンスチェック ==="
# バンドルサイズ確認
if [ -d ".next" ]; then
    echo -n "📋 ビルドサイズ... "
    BUILD_SIZE=$(du -sh .next 2>/dev/null | cut -f1)
    echo "$BUILD_SIZE"
fi

echo ""
echo "=== 6. ドキュメントチェック ==="
check_command "README.md存在確認" "test -f README.md"
check_command ".env.example存在確認" "test -f .env.example"

# 環境変数の確認
if [ -f ".env.example" ]; then
    echo -n "📋 必要な環境変数... "
    env_vars=$(grep -E "^[A-Z_]+=" .env.example | cut -d'=' -f1)
    env_count=$(echo "$env_vars" | wc -l | xargs)
    echo "${env_count}個"
    
    # .env.localとの比較（存在する場合）
    if [ -f ".env.local" ]; then
        missing_vars=""
        for var in $env_vars; do
            if ! grep -q "^$var=" .env.local; then
                missing_vars="$missing_vars $var"
            fi
        done
        
        if [ -n "$missing_vars" ]; then
            echo -e "   ${YELLOW}⚠ .env.localに未設定:${missing_vars}${NC}"
        fi
    fi
fi

echo ""
echo "=== 7. コード品質メトリクス ==="
# TODO/FIXMEコメント
echo -n "📋 TODO/FIXMEコメント... "
TODO_COUNT=$(grep -r "TODO\|FIXME" --include="*.ts" --include="*.tsx" --include="*.js" --exclude-dir=node_modules --exclude-dir=.next . 2>/dev/null | wc -l | xargs)
if [ "$TODO_COUNT" -eq "0" ]; then
    echo -e "${GREEN}なし✓${NC}"
else
    echo -e "${YELLOW}${TODO_COUNT}個${NC}"
fi

# console.log確認
echo -n "📋 console.log残存... "
CONSOLE_COUNT=$(grep -r "console\.log" --include="*.ts" --include="*.tsx" --include="*.js" --exclude-dir=node_modules --exclude-dir=.next --exclude="*.test.*" . 2>/dev/null | wc -l | xargs)
if [ "$CONSOLE_COUNT" -eq "0" ]; then
    echo -e "${GREEN}なし✓${NC}"
else
    echo -e "${YELLOW}${CONSOLE_COUNT}個${NC}"
fi

echo ""
echo "========================================"
if [ $FAILED_CHECKS -eq 0 ]; then
    echo -e "${GREEN}✅ すべてのチェックをパスしました！${NC}"
    echo ""
    echo "次のステップ:"
    echo "1. git checkout main && git pull origin main"
    echo "2. git checkout feature/member-board"
    echo "3. git merge main  # コンフリクトがある場合は解決"
    echo "4. gh pr create --base main"
    exit 0
else
    echo -e "${RED}❌ ${FAILED_CHECKS}個のチェックが失敗しました${NC}"
    echo ""
    echo "マージ前に上記の問題を解決してください。"
    exit 1
fi