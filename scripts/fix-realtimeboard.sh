#!/bin/bash

# RealtimeBoardコンポーネントの修正
# 1091行目で終了し、それ以降の重複コードを削除

head -n 1091 /Users/yoshitaka.yamagishi/Documents/projects/my-board-app/src/components/RealtimeBoard.tsx > /tmp/RealtimeBoard.tsx
mv /tmp/RealtimeBoard.tsx /Users/yoshitaka.yamagishi/Documents/projects/my-board-app/src/components/RealtimeBoard.tsx

echo "✅ RealtimeBoardコンポーネントの修正完了"
wc -l /Users/yoshitaka.yamagishi/Documents/projects/my-board-app/src/components/RealtimeBoard.tsx