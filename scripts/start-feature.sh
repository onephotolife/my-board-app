#!/bin/bash

# 新機能開発開始スクリプト
# 使用方法: ./scripts/start-feature.sh

set -e

# 色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
PURPLE='\033[0;35m'
NC='\033[0m'

# 設定
DEFAULT_TICKET_PREFIX="MB"
TEMPLATE_DIR=".github/feature-templates"

# バナー表示
show_banner() {
    echo -e "${CYAN}"
    echo "╔══════════════════════════════════════════╗"
    echo "║       🚀 新機能開発スタートツール 🚀      ║"
    echo "╚══════════════════════════════════════════╝"
    echo -e "${NC}"
}

# 現在の状態確認
check_current_state() {
    echo -e "${BLUE}📍 現在の状態を確認中...${NC}"
    
    # 現在のブランチ
    CURRENT_BRANCH=$(git branch --show-current)
    echo -e "現在のブランチ: ${GREEN}$CURRENT_BRANCH${NC}"
    
    # 未コミットの変更チェック
    if ! git diff-index --quiet HEAD -- 2>/dev/null; then
        echo -e "${YELLOW}⚠️  未コミットの変更があります${NC}"
        echo -n "stashしますか？ (y/n): "
        read -r STASH_CHOICE
        if [[ $STASH_CHOICE == "y" ]]; then
            git stash push -m "start-feature: $(date +%Y%m%d-%H%M%S)"
            echo -e "${GREEN}✓ 変更をstashしました${NC}"
        else
            echo -e "${RED}❌ 未コミットの変更がある状態では続行できません${NC}"
            exit 1
        fi
    fi
    
    # リモートの最新を取得
    echo -e "${BLUE}🔄 リモートの最新情報を取得中...${NC}"
    git fetch --all --prune
}

# チケット情報入力
get_ticket_info() {
    echo ""
    echo -e "${PURPLE}📋 チケット情報${NC}"
    echo "================================"
    
    # チケット番号
    echo -n "チケット番号を入力 (例: 123): "
    read -r TICKET_NUMBER
    
    if [[ -z "$TICKET_NUMBER" ]]; then
        echo -e "${RED}❌ チケット番号は必須です${NC}"
        exit 1
    fi
    
    # チケットプレフィックス
    echo -n "チケットプレフィックス (デフォルト: $DEFAULT_TICKET_PREFIX): "
    read -r TICKET_PREFIX
    TICKET_PREFIX=${TICKET_PREFIX:-$DEFAULT_TICKET_PREFIX}
    
    FULL_TICKET="${TICKET_PREFIX}-${TICKET_NUMBER}"
}

# 機能情報入力
get_feature_info() {
    echo ""
    echo -e "${PURPLE}✨ 機能情報${NC}"
    echo "================================"
    
    # 機能カテゴリ選択
    echo "機能カテゴリを選択してください:"
    echo "  1) auth       - 認証関連"
    echo "  2) user       - ユーザー機能"
    echo "  3) board      - 掲示板機能"
    echo "  4) api        - API関連"
    echo "  5) ui         - UI/UX改善"
    echo "  6) db         - データベース"
    echo "  7) infra      - インフラ/設定"
    echo "  8) other      - その他"
    
    echo -n "選択 (1-8): "
    read -r CATEGORY_CHOICE
    
    case $CATEGORY_CHOICE in
        1) CATEGORY="auth" ;;
        2) CATEGORY="user" ;;
        3) CATEGORY="board" ;;
        4) CATEGORY="api" ;;
        5) CATEGORY="ui" ;;
        6) CATEGORY="db" ;;
        7) CATEGORY="infra" ;;
        8) CATEGORY="other" ;;
        *) 
            echo -e "${RED}❌ 無効な選択です${NC}"
            exit 1
            ;;
    esac
    
    # 機能名
    echo -n "機能の短い説明 (英語、kebab-case): "
    read -r FEATURE_NAME
    
    if [[ -z "$FEATURE_NAME" ]]; then
        echo -e "${RED}❌ 機能名は必須です${NC}"
        exit 1
    fi
    
    # 詳細説明
    echo -n "機能の詳細説明 (日本語可): "
    read -r FEATURE_DESCRIPTION
}

# 開発情報入力
get_development_info() {
    echo ""
    echo -e "${PURPLE}👥 開発情報${NC}"
    echo "================================"
    
    # 担当者
    echo -n "担当者名 (GitHubユーザー名): "
    read -r ASSIGNEE
    
    # 予定工数
    echo -n "予定工数 (時間): "
    read -r ESTIMATED_HOURS
    
    # 優先度
    echo "優先度を選択:"
    echo "  1) 🔴 High   - 緊急"
    echo "  2) 🟡 Medium - 通常"
    echo "  3) 🟢 Low    - 低"
    
    echo -n "選択 (1-3): "
    read -r PRIORITY_CHOICE
    
    case $PRIORITY_CHOICE in
        1) PRIORITY="high" ;;
        2) PRIORITY="medium" ;;
        3) PRIORITY="low" ;;
        *) PRIORITY="medium" ;;
    esac
}

# ブランチ作成
create_branch() {
    # ブランチ名生成
    BRANCH_NAME="feature/${FULL_TICKET}-${CATEGORY}-${FEATURE_NAME}"
    
    echo ""
    echo -e "${BLUE}🌿 ブランチ作成${NC}"
    echo "================================"
    echo -e "ブランチ名: ${GREEN}$BRANCH_NAME${NC}"
    
    # 確認
    echo -n "このブランチ名でよろしいですか？ (y/n): "
    read -r CONFIRM
    
    if [[ $CONFIRM != "y" ]]; then
        echo -n "ブランチ名を入力してください: feature/"
        read -r CUSTOM_BRANCH
        BRANCH_NAME="feature/$CUSTOM_BRANCH"
    fi
    
    # developから作成
    echo -e "${BLUE}📥 developブランチを最新に更新中...${NC}"
    git checkout develop
    git pull origin develop
    
    # ブランチ作成
    echo -e "${BLUE}🔨 ブランチを作成中...${NC}"
    git checkout -b "$BRANCH_NAME"
    
    echo -e "${GREEN}✅ ブランチ '$BRANCH_NAME' を作成しました${NC}"
}

# 初期ファイル作成
create_initial_files() {
    echo ""
    echo -e "${BLUE}📄 初期ファイル作成${NC}"
    echo "================================"
    
    # 機能ドキュメント作成
    DOC_FILE="docs/features/${FULL_TICKET}-${FEATURE_NAME}.md"
    mkdir -p "$(dirname "$DOC_FILE")"
    
    cat > "$DOC_FILE" << EOF
# ${FULL_TICKET}: ${FEATURE_DESCRIPTION:-$FEATURE_NAME}

## 概要
- **チケット**: ${FULL_TICKET}
- **カテゴリ**: ${CATEGORY}
- **担当者**: @${ASSIGNEE:-未定}
- **予定工数**: ${ESTIMATED_HOURS:-未定}時間
- **優先度**: ${PRIORITY}
- **作成日**: $(date +%Y-%m-%d)

## 機能説明
${FEATURE_DESCRIPTION:-[機能の詳細説明をここに記載]}

## 技術仕様
### 実装方針
- [ ] 実装方針を記載

### API設計
- [ ] エンドポイント設計

### データベース設計
- [ ] スキーマ設計

## タスクリスト
- [ ] 設計レビュー
- [ ] 実装
- [ ] ユニットテスト作成
- [ ] 統合テスト作成
- [ ] ドキュメント更新
- [ ] コードレビュー

## テスト計画
- [ ] テストケース作成
- [ ] テスト実施

## 関連情報
- 関連Issue: #
- 参考資料: 
EOF
    
    echo -e "${GREEN}✓ ドキュメント作成: $DOC_FILE${NC}"
    
    # TODOファイル作成
    TODO_FILE=".todo/${FULL_TICKET}.md"
    mkdir -p "$(dirname "$TODO_FILE")"
    
    cat > "$TODO_FILE" << EOF
# TODO: ${FULL_TICKET}

## 今日のタスク
- [ ] 機能仕様の確認
- [ ] 実装計画の作成

## 明日のタスク
- [ ] 

## 課題・懸念事項
- 

## メモ
- 
EOF
    
    echo -e "${GREEN}✓ TODOリスト作成: $TODO_FILE${NC}"
    
    # .gitignoreに.todoを追加（まだない場合）
    if ! grep -q "^\.todo" .gitignore 2>/dev/null; then
        echo -e "\n# Personal TODO files\n.todo/" >> .gitignore
        echo -e "${GREEN}✓ .gitignoreに.todoを追加${NC}"
    fi
}

# 初期コミット
create_initial_commit() {
    echo ""
    echo -e "${BLUE}💾 初期コミット${NC}"
    echo "================================"
    
    git add "docs/features/${FULL_TICKET}-${FEATURE_NAME}.md"
    
    git commit -m "feat(${CATEGORY}): ${FULL_TICKET} - ${FEATURE_NAME}の開発開始

- 機能ドキュメント作成
- 開発ブランチ設定
- 担当者: @${ASSIGNEE:-TBD}
- 予定工数: ${ESTIMATED_HOURS:-TBD}h

Issue: #${TICKET_NUMBER}"
    
    echo -e "${GREEN}✅ 初期コミットを作成しました${NC}"
}

# GitHub連携
setup_github() {
    echo ""
    echo -e "${BLUE}🐙 GitHub連携${NC}"
    echo "================================"
    
    echo -n "GitHubにプッシュしますか？ (y/n): "
    read -r PUSH_CHOICE
    
    if [[ $PUSH_CHOICE == "y" ]]; then
        git push -u origin "$BRANCH_NAME"
        echo -e "${GREEN}✅ GitHubにプッシュしました${NC}"
        
        echo -n "Draft PRを作成しますか？ (y/n): "
        read -r PR_CHOICE
        
        if [[ $PR_CHOICE == "y" ]]; then
            # PR本文作成
            PR_BODY="## 🎯 概要
**チケット**: ${FULL_TICKET}
**機能**: ${FEATURE_DESCRIPTION:-$FEATURE_NAME}

## 📋 タスクリスト
- [ ] 実装
- [ ] テスト作成
- [ ] ドキュメント更新
- [ ] レビュー対応

## 🔗 関連
- Issue: #${TICKET_NUMBER}
- ドキュメント: docs/features/${FULL_TICKET}-${FEATURE_NAME}.md

## 📸 スクリーンショット
<!-- 必要に応じて追加 -->

---
👷 **担当者**: @${ASSIGNEE:-TBD}
⏱️ **予定工数**: ${ESTIMATED_HOURS:-TBD}時間
🚦 **優先度**: ${PRIORITY}"
            
            # PRを作成
            gh pr create \
                --draft \
                --title "feat(${CATEGORY}): ${FULL_TICKET} - ${FEATURE_NAME}" \
                --body "$PR_BODY" \
                --assignee "${ASSIGNEE:-@me}" \
                --base develop
            
            echo -e "${GREEN}✅ Draft PRを作成しました${NC}"
        fi
    fi
}

# 完了メッセージ
show_completion() {
    echo ""
    echo -e "${GREEN}╔══════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║         ✨ セットアップ完了! ✨          ║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${CYAN}📍 現在のブランチ:${NC} ${GREEN}$BRANCH_NAME${NC}"
    echo ""
    echo -e "${YELLOW}📝 次のステップ:${NC}"
    echo "  1. 機能仕様を確認: docs/features/${FULL_TICKET}-${FEATURE_NAME}.md"
    echo "  2. 実装を開始"
    echo "  3. 定期的にコミット"
    echo "  4. テストを作成"
    echo "  5. PRをReady for Reviewに変更"
    echo ""
    echo -e "${BLUE}💡 便利なコマンド:${NC}"
    echo "  - ブランチ同期: ./scripts/sync-branch.sh"
    echo "  - 状態確認: ./scripts/git-flow-commands.sh status"
    echo "  - TODO確認: cat .todo/${FULL_TICKET}.md"
    echo ""
}

# メイン処理
main() {
    show_banner
    check_current_state
    get_ticket_info
    get_feature_info
    get_development_info
    create_branch
    create_initial_files
    create_initial_commit
    setup_github
    show_completion
}

# 実行
main