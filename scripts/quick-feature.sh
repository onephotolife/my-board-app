#!/bin/bash

# クイック機能ブランチ作成スクリプト（簡易版）
# 使用方法: ./scripts/quick-feature.sh [ticket-number] [feature-name]
# 例: ./scripts/quick-feature.sh 123 user-auth

set -e

# 色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

# 引数チェック
if [ $# -lt 2 ]; then
    echo -e "${RED}使用方法: $0 [ticket-number] [feature-name]${NC}"
    echo "例: $0 123 user-auth"
    exit 1
fi

TICKET_NUMBER=$1
FEATURE_NAME=$2
BRANCH_NAME="feature/MB-${TICKET_NUMBER}-${FEATURE_NAME}"

echo -e "${BLUE}🚀 クイック機能ブランチ作成${NC}"
echo "================================"

# 現在の状態確認
if ! git diff-index --quiet HEAD -- 2>/dev/null; then
    echo -e "${RED}❌ 未コミットの変更があります${NC}"
    echo "先にコミットまたはstashしてください"
    exit 1
fi

# developブランチを最新に
echo -e "${BLUE}📥 developブランチを更新中...${NC}"
git checkout develop
git pull origin develop

# ブランチ作成
echo -e "${BLUE}🌿 ブランチ作成: ${GREEN}$BRANCH_NAME${NC}"
git checkout -b "$BRANCH_NAME"

# 簡易ドキュメント作成
DOC_DIR="docs/features"
DOC_FILE="${DOC_DIR}/MB-${TICKET_NUMBER}-${FEATURE_NAME}.md"
mkdir -p "$DOC_DIR"

cat > "$DOC_FILE" << EOF
# MB-${TICKET_NUMBER}: ${FEATURE_NAME}

## 概要
- **チケット**: MB-${TICKET_NUMBER}
- **作成日**: $(date +%Y-%m-%d)

## 実装内容
[ここに実装内容を記載]

## タスク
- [ ] 実装
- [ ] テスト
- [ ] レビュー
EOF

# 初期コミット
git add "$DOC_FILE"
git commit -m "feat: MB-${TICKET_NUMBER} - ${FEATURE_NAME}の開発開始

Issue: #${TICKET_NUMBER}"

echo -e "${GREEN}✅ 完了！${NC}"
echo ""
echo "次のステップ:"
echo "  1. 実装を開始"
echo "  2. プッシュ: git push -u origin $BRANCH_NAME"
echo "  3. PR作成: gh pr create --draft"