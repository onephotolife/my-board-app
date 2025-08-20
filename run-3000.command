#!/bin/bash
# ポート3000のプロセスを停止
lsof -ti:3000 | xargs kill -9 2>/dev/null

# プロジェクトディレクトリに移動
cd /Users/yoshitaka.yamagishi/Documents/projects/my-board-app

# サーバーを起動
echo "Starting server on port 3000..."
/Users/yoshitaka.yamagishi/.nvm/versions/node/v22.18.0/bin/npm run dev