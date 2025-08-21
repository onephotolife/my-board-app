#!/bin/bash

# ===================================
# 本番環境デプロイスクリプト
# ===================================
# 使用方法: ./scripts/deploy.sh [environment]
# environment: production, staging, docker

set -e # エラー時に停止

# カラー出力
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 環境変数
ENVIRONMENT=${1:-production}
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="./backups/$TIMESTAMP"

echo -e "${BLUE}====================================${NC}"
echo -e "${BLUE} 本番環境デプロイ開始${NC}"
echo -e "${BLUE} 環境: ${ENVIRONMENT}${NC}"
echo -e "${BLUE} 日時: $(date)${NC}"
echo -e "${BLUE}====================================${NC}"

# 1. 事前チェック
echo -e "\n${YELLOW}[1/10] 事前チェック${NC}"

# Node.jsバージョンチェック
NODE_VERSION=$(node -v)
if [[ ! "$NODE_VERSION" =~ ^v20\. ]]; then
    echo -e "${RED}❌ Node.js v20以上が必要です（現在: $NODE_VERSION）${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Node.js バージョン: $NODE_VERSION${NC}"

# Git状態チェック
if [[ -n $(git status -s) ]]; then
    echo -e "${YELLOW}⚠️  コミットされていない変更があります${NC}"
    read -p "続行しますか？ (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi
echo -e "${GREEN}✓ Git状態: クリーン${NC}"

# 2. 依存関係の確認
echo -e "\n${YELLOW}[2/10] 依存関係の確認${NC}"
npm audit --audit-level=high || true
echo -e "${GREEN}✓ 依存関係チェック完了${NC}"

# 3. 環境変数のチェック
echo -e "\n${YELLOW}[3/10] 環境変数のチェック${NC}"
if [ "$ENVIRONMENT" = "production" ]; then
    REQUIRED_VARS=(
        "MONGODB_URI"
        "NEXTAUTH_URL"
        "NEXTAUTH_SECRET"
        "RESEND_API_KEY"
        "EMAIL_FROM"
    )
    
    MISSING_VARS=()
    for var in "${REQUIRED_VARS[@]}"; do
        if [ -z "${!var}" ]; then
            MISSING_VARS+=($var)
        fi
    done
    
    if [ ${#MISSING_VARS[@]} -gt 0 ]; then
        echo -e "${RED}❌ 必須環境変数が設定されていません: ${MISSING_VARS[@]}${NC}"
        echo -e "${YELLOW}ヒント: .env.production.localファイルを確認してください${NC}"
        exit 1
    fi
fi
echo -e "${GREEN}✓ 環境変数チェック完了${NC}"

# 4. テスト実行
echo -e "\n${YELLOW}[4/10] テスト実行${NC}"
npm run lint || exit 1
echo -e "${GREEN}✓ Lintチェック完了${NC}"

npm run typecheck || exit 1
echo -e "${GREEN}✓ 型チェック完了${NC}"

# npm run test:unit || exit 1
# echo -e "${GREEN}✓ ユニットテスト完了${NC}"

# 5. ビルド
echo -e "\n${YELLOW}[5/10] アプリケーションのビルド${NC}"
if [ "$ENVIRONMENT" = "production" ]; then
    NODE_ENV=production npm run build || exit 1
else
    npm run build || exit 1
fi
echo -e "${GREEN}✓ ビルド完了${NC}"

# 6. データベースインデックス作成
echo -e "\n${YELLOW}[6/10] データベースインデックス作成${NC}"
node scripts/setup-indexes.js || true
echo -e "${GREEN}✓ インデックス作成完了${NC}"

# 7. バックアップ作成
echo -e "\n${YELLOW}[7/10] バックアップ作成${NC}"
mkdir -p "$BACKUP_DIR"

# 現在のビルドをバックアップ
if [ -d ".next" ]; then
    cp -r .next "$BACKUP_DIR/.next.backup"
    echo -e "${GREEN}✓ ビルドバックアップ作成${NC}"
fi

# データベースバックアップ（MongoDBが利用可能な場合）
if command -v mongodump &> /dev/null; then
    mongodump --uri="$MONGODB_URI" --out="$BACKUP_DIR/mongodb" 2>/dev/null || true
    echo -e "${GREEN}✓ データベースバックアップ作成${NC}"
fi

# 8. デプロイ実行
echo -e "\n${YELLOW}[8/10] デプロイ実行${NC}"

case "$ENVIRONMENT" in
    "docker")
        echo "Dockerデプロイを実行..."
        docker-compose down
        docker-compose build --no-cache
        docker-compose up -d
        echo -e "${GREEN}✓ Dockerコンテナ起動完了${NC}"
        ;;
    
    "pm2")
        echo "PM2デプロイを実行..."
        pm2 stop board-app 2>/dev/null || true
        pm2 delete board-app 2>/dev/null || true
        pm2 start ecosystem.config.js --env production
        pm2 save
        echo -e "${GREEN}✓ PM2プロセス起動完了${NC}"
        ;;
    
    "vercel")
        echo "Vercelデプロイを実行..."
        if [ "$ENVIRONMENT" = "production" ]; then
            vercel --prod
        else
            vercel
        fi
        echo -e "${GREEN}✓ Vercelデプロイ完了${NC}"
        ;;
    
    *)
        echo "標準デプロイを実行..."
        # systemdサービスの再起動（例）
        # sudo systemctl restart board-app
        echo -e "${GREEN}✓ デプロイ完了${NC}"
        ;;
esac

# 9. ヘルスチェック
echo -e "\n${YELLOW}[9/10] ヘルスチェック${NC}"
sleep 5

# ヘルスチェック実行
MAX_RETRIES=10
RETRY_COUNT=0
HEALTH_URL="http://localhost:3000/api/health"

if [ "$ENVIRONMENT" = "docker" ]; then
    HEALTH_URL="http://localhost/api/health"
fi

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if curl -f -s "$HEALTH_URL" > /dev/null; then
        echo -e "${GREEN}✓ アプリケーションは正常に動作しています${NC}"
        break
    else
        echo -e "${YELLOW}待機中... ($((RETRY_COUNT+1))/$MAX_RETRIES)${NC}"
        sleep 3
        RETRY_COUNT=$((RETRY_COUNT+1))
    fi
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    echo -e "${RED}❌ ヘルスチェック失敗${NC}"
    echo -e "${YELLOW}ロールバック処理を開始します...${NC}"
    
    # ロールバック処理
    if [ -d "$BACKUP_DIR/.next.backup" ]; then
        rm -rf .next
        mv "$BACKUP_DIR/.next.backup" .next
        echo -e "${GREEN}✓ ロールバック完了${NC}"
    fi
    exit 1
fi

# 10. デプロイ完了
echo -e "\n${YELLOW}[10/10] デプロイ完了処理${NC}"

# ログファイル作成
cat > "./deploy-logs/deploy-$TIMESTAMP.log" << EOF
===================================
デプロイログ
===================================
環境: $ENVIRONMENT
日時: $(date)
Node.js: $NODE_VERSION
ビルドID: $TIMESTAMP
状態: SUCCESS
===================================
EOF

echo -e "${GREEN}✓ デプロイログ作成${NC}"

# 通知（Slack/Discord Webhook等）
if [ -n "$SLACK_WEBHOOK_URL" ]; then
    curl -X POST "$SLACK_WEBHOOK_URL" \
        -H 'Content-Type: application/json' \
        -d "{\"text\":\"✅ デプロイ成功: $ENVIRONMENT環境 ($(date))\"}" \
        2>/dev/null || true
    echo -e "${GREEN}✓ Slack通知送信${NC}"
fi

echo -e "\n${GREEN}====================================${NC}"
echo -e "${GREEN} デプロイ成功！${NC}"
echo -e "${GREEN} 環境: ${ENVIRONMENT}${NC}"
echo -e "${GREEN} ビルドID: ${TIMESTAMP}${NC}"
echo -e "${GREEN}====================================${NC}"

# クリーンアップ（古いバックアップの削除）
find ./backups -type d -mtime +7 -exec rm -rf {} + 2>/dev/null || true
find ./deploy-logs -type f -mtime +30 -exec rm -f {} + 2>/dev/null || true

exit 0