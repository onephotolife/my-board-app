#!/bin/bash

# Next.js開発サーバー管理スクリプト
# 14人天才会議承認済み

# 色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# デフォルトポート
DEFAULT_PORT=3000
PORT=${1:-$DEFAULT_PORT}

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Next.js 開発サーバー管理スクリプト v1.0  ${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# ポート使用状況確認
check_port() {
    local port=$1
    if lsof -i :$port > /dev/null 2>&1; then
        echo -e "${YELLOW}⚠️  ポート $port は使用中です${NC}"
        
        # 使用中のプロセス情報を取得
        local pid=$(lsof -t -i :$port | head -1)
        if [ ! -z "$pid" ]; then
            local process_info=$(ps -p $pid -o comm= 2>/dev/null)
            echo -e "${YELLOW}   プロセス: $process_info (PID: $pid)${NC}"
            
            # Next.jsプロセスかどうか確認
            if [[ "$process_info" == *"node"* ]] || [[ "$process_info" == *"next"* ]]; then
                echo -e "${YELLOW}   既存のNext.jsサーバーを停止しますか？ (y/n)${NC}"
                read -n 1 -r
                echo
                if [[ $REPLY =~ ^[Yy]$ ]]; then
                    echo -e "${BLUE}→ 既存サーバーを停止中...${NC}"
                    kill -TERM $pid 2>/dev/null
                    sleep 2
                    
                    # 強制終了が必要な場合
                    if kill -0 $pid 2>/dev/null; then
                        echo -e "${YELLOW}→ 強制終了中...${NC}"
                        kill -9 $pid 2>/dev/null
                    fi
                    
                    echo -e "${GREEN}✅ 既存サーバーを停止しました${NC}"
                    return 0
                else
                    echo -e "${RED}❌ 操作をキャンセルしました${NC}"
                    return 1
                fi
            else
                echo -e "${RED}❌ ポート $port は他のアプリケーションが使用中です${NC}"
                return 1
            fi
        fi
    else
        echo -e "${GREEN}✅ ポート $port は使用可能です${NC}"
        return 0
    fi
}

# 空きポートを探す
find_available_port() {
    local start_port=$1
    local port=$start_port
    
    while [ $port -lt 65535 ]; do
        if ! lsof -i :$port > /dev/null 2>&1; then
            echo $port
            return 0
        fi
        port=$((port + 1))
    done
    
    echo -1
    return 1
}

# メイン処理
main() {
    # ポートチェック
    if ! check_port $PORT; then
        echo ""
        echo -e "${YELLOW}代替ポートを探しています...${NC}"
        
        ALTERNATIVE_PORT=$(find_available_port $((PORT + 1)))
        
        if [ $ALTERNATIVE_PORT -gt 0 ]; then
            echo -e "${GREEN}✅ 代替ポート $ALTERNATIVE_PORT が利用可能です${NC}"
            echo -e "${YELLOW}ポート $ALTERNATIVE_PORT を使用しますか？ (y/n)${NC}"
            read -n 1 -r
            echo
            
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                PORT=$ALTERNATIVE_PORT
            else
                echo -e "${RED}❌ 開発サーバーの起動をキャンセルしました${NC}"
                exit 1
            fi
        else
            echo -e "${RED}❌ 利用可能なポートが見つかりません${NC}"
            exit 1
        fi
    fi
    
    # 開発サーバー起動
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}🚀 Next.js開発サーバーを起動します${NC}"
    echo -e "${GREEN}   URL: http://localhost:$PORT${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    
    # npm run devを実行（ポート指定）
    if [ $PORT -eq 3000 ]; then
        npm run dev
    else
        npx next dev --turbopack --port $PORT
    fi
}

# トラップ設定（Ctrl+Cで適切に終了）
trap 'echo -e "\n${YELLOW}⚠️  開発サーバーを停止しています...${NC}"; exit 0' INT TERM

# メイン処理実行
main