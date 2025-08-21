# ===================================
# マルチステージビルド - 本番用Dockerfile
# ===================================

# ステージ1: 依存関係のインストール
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# package.jsonとpackage-lock.jsonをコピー
COPY package.json package-lock.json* ./
RUN npm ci --only=production

# ステージ2: ビルド
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .

# 環境変数を設定（ビルド時）
ENV NEXT_TELEMETRY_DISABLED 1

# Next.jsアプリケーションをビルド
RUN npm run build

# ステージ3: 実行環境
FROM node:20-alpine AS runner
WORKDIR /app

# セキュリティのため非rootユーザーを作成
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 環境変数を設定
ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# 必要なファイルのみコピー
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# 権限を設定
RUN chown -R nextjs:nodejs /app

# ユーザーを切り替え
USER nextjs

# ポート公開
EXPOSE 3000

# 環境変数でポートを設定可能に
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

# ヘルスチェック
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {r.statusCode === 200 ? process.exit(0) : process.exit(1)})"

# アプリケーション起動
CMD ["node", "server.js"]