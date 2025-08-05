#!/bin/bash

# Git Flow コマンドヘルパー
# 使用方法: ./scripts/git-flow-commands.sh [command] [options]

set -e

# 色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# ヘルプ表示
show_help() {
    echo "Git Flow Command Helper"
    echo ""
    echo "Usage: $0 [command] [options]"
    echo ""
    echo "Commands:"
    echo "  feature start <name>    新しい機能ブランチを開始"
    echo "  feature finish <name>   機能ブランチを完了してdevelopにマージ"
    echo "  release start <version> リリースブランチを開始"
    echo "  release finish <version> リリースを完了してmainとdevelopにマージ"
    echo "  hotfix start <name>     ホットフィックスを開始"
    echo "  hotfix finish <name>    ホットフィックスを完了"
    echo "  sync                    現在のブランチをベースブランチと同期"
    echo "  status                  Git Flowの状態を表示"
    echo ""
    echo "Examples:"
    echo "  $0 feature start user-auth"
    echo "  $0 release start 1.0.0"
    echo "  $0 hotfix start urgent-fix"
}

# 現在のブランチを取得
get_current_branch() {
    git branch --show-current
}

# リモートの最新を取得
fetch_all() {
    echo -e "${BLUE}🔄 リモートの最新情報を取得中...${NC}"
    git fetch --all --prune
}

# 機能ブランチ開始
feature_start() {
    local name=$1
    if [[ -z "$name" ]]; then
        echo -e "${RED}エラー: 機能名を指定してください${NC}"
        exit 1
    fi
    
    fetch_all
    
    echo -e "${GREEN}✨ 新しい機能ブランチ 'feature/$name' を作成します${NC}"
    git checkout develop
    git pull origin develop
    git checkout -b "feature/$name"
    
    echo -e "${GREEN}✅ 機能ブランチ 'feature/$name' を作成しました${NC}"
    echo "次のステップ:"
    echo "  1. 機能を実装"
    echo "  2. git add & commit"
    echo "  3. git push origin feature/$name"
    echo "  4. PRを作成: feature/$name → develop"
}

# 機能ブランチ完了
feature_finish() {
    local name=$1
    if [[ -z "$name" ]]; then
        echo -e "${RED}エラー: 機能名を指定してください${NC}"
        exit 1
    fi
    
    local branch="feature/$name"
    
    # ブランチの存在確認
    if ! git show-ref --verify --quiet "refs/heads/$branch"; then
        echo -e "${RED}エラー: ブランチ '$branch' が存在しません${NC}"
        exit 1
    fi
    
    fetch_all
    
    echo -e "${YELLOW}⚡ 機能ブランチ '$branch' をdevelopにマージします${NC}"
    
    # developを最新に
    git checkout develop
    git pull origin develop
    
    # マージ
    git merge --no-ff "$branch" -m "Merge $branch into develop"
    
    # プッシュ
    git push origin develop
    
    # ブランチ削除
    git branch -d "$branch"
    git push origin --delete "$branch" 2>/dev/null || true
    
    echo -e "${GREEN}✅ 機能ブランチ '$branch' の完了処理が完了しました${NC}"
}

# リリース開始
release_start() {
    local version=$1
    if [[ -z "$version" ]]; then
        echo -e "${RED}エラー: バージョンを指定してください${NC}"
        exit 1
    fi
    
    fetch_all
    
    echo -e "${BLUE}📦 リリースブランチ 'release/v$version' を作成します${NC}"
    git checkout develop
    git pull origin develop
    git checkout -b "release/v$version"
    
    echo -e "${GREEN}✅ リリースブランチ 'release/v$version' を作成しました${NC}"
    echo "次のステップ:"
    echo "  1. バージョン番号を更新 (package.json等)"
    echo "  2. CHANGELOG.mdを更新"
    echo "  3. ステージング環境でテスト"
    echo "  4. 必要に応じてバグ修正"
    echo "  5. $0 release finish $version"
}

# リリース完了
release_finish() {
    local version=$1
    if [[ -z "$version" ]]; then
        echo -e "${RED}エラー: バージョンを指定してください${NC}"
        exit 1
    fi
    
    local branch="release/v$version"
    
    # ブランチの存在確認
    if ! git show-ref --verify --quiet "refs/heads/$branch"; then
        echo -e "${RED}エラー: ブランチ '$branch' が存在しません${NC}"
        exit 1
    fi
    
    fetch_all
    
    echo -e "${YELLOW}🚀 リリース 'v$version' を完了します${NC}"
    
    # mainにマージ
    echo -e "${BLUE}mainブランチにマージ中...${NC}"
    git checkout main
    git pull origin main
    git merge --no-ff "$branch" -m "Release v$version"
    git tag -a "v$version" -m "Release version $version"
    git push origin main --tags
    
    # developにバックマージ
    echo -e "${BLUE}developブランチにバックマージ中...${NC}"
    git checkout develop
    git pull origin develop
    git merge --no-ff "$branch" -m "Merge release v$version back into develop"
    git push origin develop
    
    # ブランチ削除
    git branch -d "$branch"
    git push origin --delete "$branch" 2>/dev/null || true
    
    echo -e "${GREEN}✅ リリース v$version が完了しました！${NC}"
    echo "デプロイ状況:"
    echo "  - 本番環境: 自動デプロイ中..."
    echo "  - タグ: v$version"
}

# ホットフィックス開始
hotfix_start() {
    local name=$1
    if [[ -z "$name" ]]; then
        echo -e "${RED}エラー: ホットフィックス名を指定してください${NC}"
        exit 1
    fi
    
    fetch_all
    
    echo -e "${RED}🚨 ホットフィックスブランチ 'hotfix/$name' を作成します${NC}"
    git checkout main
    git pull origin main
    git checkout -b "hotfix/$name"
    
    echo -e "${GREEN}✅ ホットフィックスブランチ 'hotfix/$name' を作成しました${NC}"
    echo "次のステップ:"
    echo "  1. 緊急修正を実装"
    echo "  2. テスト実施"
    echo "  3. $0 hotfix finish $name"
}

# ホットフィックス完了
hotfix_finish() {
    local name=$1
    if [[ -z "$name" ]]; then
        echo -e "${RED}エラー: ホットフィックス名を指定してください${NC}"
        exit 1
    fi
    
    local branch="hotfix/$name"
    
    # ブランチの存在確認
    if ! git show-ref --verify --quiet "refs/heads/$branch"; then
        echo -e "${RED}エラー: ブランチ '$branch' が存在しません${NC}"
        exit 1
    fi
    
    # 現在のバージョンを取得してパッチバージョンをインクリメント
    local current_version=$(git describe --tags --abbrev=0 2>/dev/null || echo "v0.0.0")
    local version=$(echo $current_version | sed 's/v//' | awk -F. '{print $1"."$2"."$3+1}')
    
    fetch_all
    
    echo -e "${YELLOW}🔥 ホットフィックス '$name' を完了します (v$version)${NC}"
    
    # mainにマージ
    echo -e "${BLUE}mainブランチにマージ中...${NC}"
    git checkout main
    git pull origin main
    git merge --no-ff "$branch" -m "Hotfix: $name"
    git tag -a "v$version" -m "Hotfix version $version: $name"
    git push origin main --tags
    
    # developにマージ
    echo -e "${BLUE}developブランチにマージ中...${NC}"
    git checkout develop
    git pull origin develop
    git merge --no-ff "$branch" -m "Merge hotfix/$name into develop"
    git push origin develop
    
    # ブランチ削除
    git branch -d "$branch"
    git push origin --delete "$branch" 2>/dev/null || true
    
    echo -e "${GREEN}✅ ホットフィックス v$version が完了しました！${NC}"
}

# ブランチ同期
sync_branch() {
    local current=$(get_current_branch)
    local base_branch=""
    
    # ベースブランチを判定
    if [[ $current == feature/* ]]; then
        base_branch="develop"
    elif [[ $current == release/* ]]; then
        base_branch="develop"
    elif [[ $current == hotfix/* ]]; then
        base_branch="main"
    else
        echo -e "${RED}エラー: 同期できるブランチタイプではありません${NC}"
        exit 1
    fi
    
    fetch_all
    
    echo -e "${BLUE}🔄 '$current' を '$base_branch' と同期します${NC}"
    
    # ベースブランチの最新を取得
    git checkout $base_branch
    git pull origin $base_branch
    
    # 元のブランチに戻ってマージ
    git checkout $current
    git merge $base_branch
    
    echo -e "${GREEN}✅ 同期が完了しました${NC}"
}

# Git Flow状態表示
show_status() {
    echo -e "${BLUE}=== Git Flow Status ===${NC}"
    echo ""
    
    # 現在のブランチ
    local current=$(get_current_branch)
    echo -e "現在のブランチ: ${GREEN}$current${NC}"
    echo ""
    
    # 各種ブランチの表示
    echo "📌 永続ブランチ:"
    git branch -r | grep -E "origin/(main|develop)$" | sed 's/origin\//  - /'
    
    echo ""
    echo "✨ 機能ブランチ:"
    git branch -a | grep -E "feature/" | sed 's/remotes\/origin\//  - /' | sort -u
    
    echo ""
    echo "📦 リリースブランチ:"
    git branch -a | grep -E "release/" | sed 's/remotes\/origin\//  - /' | sort -u
    
    echo ""
    echo "🚨 ホットフィックスブランチ:"
    git branch -a | grep -E "hotfix/" | sed 's/remotes\/origin\//  - /' | sort -u
    
    echo ""
    echo "🏷️  最新のタグ:"
    git tag --sort=-version:refname | head -5 | sed 's/^/  - /'
}

# メインコマンド処理
case "$1" in
    feature)
        case "$2" in
            start)
                feature_start "$3"
                ;;
            finish)
                feature_finish "$3"
                ;;
            *)
                show_help
                exit 1
                ;;
        esac
        ;;
    release)
        case "$2" in
            start)
                release_start "$3"
                ;;
            finish)
                release_finish "$3"
                ;;
            *)
                show_help
                exit 1
                ;;
        esac
        ;;
    hotfix)
        case "$2" in
            start)
                hotfix_start "$3"
                ;;
            finish)
                hotfix_finish "$3"
                ;;
            *)
                show_help
                exit 1
                ;;
        esac
        ;;
    sync)
        sync_branch
        ;;
    status)
        show_status
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        show_help
        exit 1
        ;;
esac