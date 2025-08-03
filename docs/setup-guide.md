# 開発環境構築手順

## 1. 前提条件

### 1.1 必要なツール

| ツール | 最小バージョン | 推奨バージョン | 確認コマンド |
|--------|--------------|--------------|------------|
| Node.js | 18.18.0 | 20.x以上 | `node -v` |
| npm | 9.0.0 | 10.x以上 | `npm -v` |
| Git | 2.0.0 | 最新版 | `git --version` |
| MongoDB | 4.4 | 7.0以上 | `mongod --version` |

### 1.2 推奨開発ツール

- **エディタ**: Visual Studio Code
- **ブラウザ**: Google Chrome (DevTools)
- **DB管理**: MongoDB Compass
- **API テスト**: Postman / curl

## 2. 環境構築手順

### 2.1 リポジトリのクローン

```bash
# リポジトリをクローン
git clone [リポジトリURL]
cd my-board-app
```

### 2.2 依存パッケージのインストール

```bash
# npm を使用する場合
npm install

# yarn を使用する場合（オプション）
yarn install

# pnpm を使用する場合（オプション）
pnpm install
```

### 2.3 環境変数の設定

#### 2.3.1 .env.local ファイルの作成

```bash
# .env.local ファイルを作成
touch .env.local
```

#### 2.3.2 環境変数の設定

`.env.local` ファイルに以下を記述：

```env
# MongoDB Atlas を使用する場合（推奨）
MONGODB_URI=mongodb+srv://[username]:[password]@[cluster].mongodb.net/board-app?retryWrites=true&w=majority

# ローカル MongoDB を使用する場合
# MONGODB_URI=mongodb://localhost:27017/board-app
```

### 2.4 MongoDB の準備

#### オプション A: MongoDB Atlas（クラウド版）推奨

1. [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) にアクセス
2. 無料アカウントを作成
3. クラスターを作成（M0 Free Tier）
4. データベースユーザーを作成
5. IP ホワイトリストに自分の IP を追加（または 0.0.0.0/0 で全許可）
6. 接続文字列を取得して `.env.local` に設定

#### オプション B: ローカル MongoDB

##### macOS の場合：
```bash
# Homebrew でインストール
brew tap mongodb/brew
brew install mongodb-community

# MongoDB を起動
brew services start mongodb-community

# または手動起動
mongod --dbpath /usr/local/var/mongodb
```

##### Windows の場合：
1. [MongoDB Community Server](https://www.mongodb.com/try/download/community) をダウンロード
2. インストーラーを実行
3. MongoDB Compass も同時にインストール（推奨）
4. Windows サービスとして自動起動設定

##### Linux (Ubuntu/Debian) の場合：
```bash
# リポジトリキーを追加
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -

# リポジトリを追加
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# パッケージリストを更新
sudo apt-get update

# MongoDB をインストール
sudo apt-get install -y mongodb-org

# MongoDB を起動
sudo systemctl start mongod
sudo systemctl enable mongod
```

## 3. アプリケーションの起動

### 3.1 開発サーバーの起動

```bash
# 開発サーバーを起動（Turbopack 使用）
npm run dev

# 従来の webpack を使用する場合
npm run dev:webpack
```

### 3.2 アクセス確認

ブラウザで以下の URL にアクセス：
- アプリケーション: http://localhost:3000
- API エンドポイント: http://localhost:3000/api/posts

### 3.3 正常動作の確認

以下を確認してください：
1. ✅ ページが正常に表示される
2. ✅ 投稿フォームが表示される
3. ✅ 投稿の作成ができる
4. ✅ 投稿の編集・削除ができる
5. ✅ コンソールにエラーが出ていない

## 4. ビルドとプロダクション実行

### 4.1 プロダクションビルド

```bash
# ビルドを実行
npm run build

# ビルド成功の確認
✓ Compiled successfully
✓ Linting and checking validity of types
✓ Collecting page data
✓ Generating static pages
✓ Collecting build traces
✓ Finalizing page optimization
```

### 4.2 プロダクションモードで起動

```bash
# プロダクションサーバーを起動
npm run start

# http://localhost:3000 でアクセス可能
```

## 5. 開発用コマンド一覧

| コマンド | 説明 |
|---------|-----|
| `npm run dev` | 開発サーバー起動（Turbopack） |
| `npm run build` | プロダクションビルド |
| `npm run start` | プロダクションサーバー起動 |
| `npm run lint` | ESLint 実行 |
| `npm run lint:fix` | ESLint 自動修正 |

## 6. VS Code 推奨設定

### 6.1 推奨拡張機能

`.vscode/extensions.json` を作成：

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "mongodb.mongodb-vscode",
    "rangav.vscode-thunder-client",
    "ms-vscode.vscode-typescript-next"
  ]
}
```

### 6.2 ワークスペース設定

`.vscode/settings.json` を作成：

```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true,
  "tailwindCSS.experimental.classRegex": [
    ["cn\\(([^)]*)\\)", "(?:'|\"|`)([^']*)(?:'|\"|`)"]
  ]
}
```

## 7. MongoDB Compass 設定

### 7.1 接続設定

1. MongoDB Compass を起動
2. 新規接続を作成
3. 接続文字列を入力：
   - Atlas: `mongodb+srv://[username]:[password]@[cluster].mongodb.net/`
   - ローカル: `mongodb://localhost:27017/`
4. 「Connect」をクリック

### 7.2 データベース確認

1. `board-app` データベースを選択
2. `posts` コレクションを確認
3. ドキュメントの表示・編集が可能

## 8. トラブルシューティング（初期設定）

### 8.1 npm install でエラーが出る場合

```bash
# キャッシュをクリア
npm cache clean --force

# node_modules を削除して再インストール
rm -rf node_modules package-lock.json
npm install
```

### 8.2 MongoDB に接続できない場合

```bash
# MongoDB が起動しているか確認
ps aux | grep mongod

# ローカル MongoDB を再起動
# macOS
brew services restart mongodb-community

# Linux
sudo systemctl restart mongod

# Windows
net stop MongoDB
net start MongoDB
```

### 8.3 ポート 3000 が使用中の場合

```bash
# 使用中のプロセスを確認
lsof -i :3000

# プロセスを停止
kill -9 [PID]

# または別のポートで起動
PORT=3001 npm run dev
```

## 9. 環境変数テンプレート

`.env.example` ファイルを作成して共有：

```env
# MongoDB 接続文字列
# Atlas の場合
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/board-app?retryWrites=true&w=majority

# ローカルの場合
# MONGODB_URI=mongodb://localhost:27017/board-app

# その他の環境変数（将来の拡張用）
# NODE_ENV=development
# API_KEY=your_api_key_here
# JWT_SECRET=your_jwt_secret_here
```

## 10. Docker を使った環境構築（オプション）

### 10.1 Docker Compose ファイル

`docker-compose.yml` を作成：

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - MONGODB_URI=mongodb://mongo:27017/board-app
    depends_on:
      - mongo
    volumes:
      - .:/app
      - /app/node_modules

  mongo:
    image: mongo:7.0
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db

volumes:
  mongo_data:
```

### 10.2 Dockerfile

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

### 10.3 Docker での起動

```bash
# ビルドと起動
docker-compose up --build

# バックグラウンドで起動
docker-compose up -d

# 停止
docker-compose down
```

## 11. 初回セットアップチェックリスト

- [ ] Node.js インストール確認
- [ ] Git インストール確認
- [ ] リポジトリクローン完了
- [ ] npm install 完了
- [ ] .env.local 作成・設定完了
- [ ] MongoDB 接続確認
- [ ] 開発サーバー起動確認
- [ ] ブラウザでアクセス確認
- [ ] 投稿の CRUD 操作確認
- [ ] MongoDB Compass 接続確認