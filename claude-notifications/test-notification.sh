#!/bin/bash

# テストスクリプト
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo "通知テストを開始します..."
echo ""

echo "1. 入力待ち通知のテスト"
"$SCRIPT_DIR/notify.sh" "input_waiting"
sleep 2

echo "2. 応答完了通知のテスト"
"$SCRIPT_DIR/notify.sh" "response_complete"
sleep 2

echo "3. カスタムメッセージのテスト"
"$SCRIPT_DIR/notify.sh" "custom" "これはテストメッセージです" "カスタムタイトル"

echo ""
echo "テスト完了！"
echo "通知が表示されましたか？"
