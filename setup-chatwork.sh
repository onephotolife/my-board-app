#!/bin/bash

# Chatwork通知設定スクリプト
echo "=========================================="
echo "📬 Chatwork通知設定ツール"
echo "=========================================="
echo ""

CONFIG_FILE="$HOME/.chatwork_config"

# 既存の設定を読み込む
if [ -f "$CONFIG_FILE" ]; then
    echo "既存の設定ファイルが見つかりました: $CONFIG_FILE"
    source "$CONFIG_FILE"
    echo ""
fi

# APIトークンの入力
echo "1. ChatworkのAPIトークンを入力してください"
echo "   （取得方法: https://www.chatwork.com/service/packages/chatwork/subpackages/api/token.php）"
echo ""
read -p "APIトークン [現在: ${CHATWORK_API_TOKEN:0:10}...]: " NEW_TOKEN
if [ ! -z "$NEW_TOKEN" ]; then
    CHATWORK_API_TOKEN="$NEW_TOKEN"
fi

# ルームIDの入力
echo ""
echo "2. 通知を送信するルームIDを入力してください"
echo "   （ChatworkのURLから確認: https://www.chatwork.com/#!rid123456789）"
echo ""
read -p "ルームID [現在: $CHATWORK_ROOM_ID]: " NEW_ROOM_ID
if [ ! -z "$NEW_ROOM_ID" ]; then
    CHATWORK_ROOM_ID="$NEW_ROOM_ID"
fi

# 通知の有効/無効
echo ""
echo "3. Chatwork通知を有効にしますか？"
read -p "有効にする (y/n) [現在: ${CHATWORK_ENABLED:-true}]: " ENABLE_CHOICE
if [ "$ENABLE_CHOICE" = "n" ] || [ "$ENABLE_CHOICE" = "N" ]; then
    CHATWORK_ENABLED="false"
else
    CHATWORK_ENABLED="true"
fi

# 設定ファイルを作成
cat > "$CONFIG_FILE" << EOF
# Chatwork Configuration
# Generated: $(date)

# ChatworkのAPIトークン
CHATWORK_API_TOKEN="$CHATWORK_API_TOKEN"

# 通知を送信するルームID
CHATWORK_ROOM_ID="$CHATWORK_ROOM_ID"

# 通知設定
CHATWORK_ENABLED=$CHATWORK_ENABLED
CHATWORK_MENTION_ALL=false  # [toall]を使用するかどうか
EOF

echo ""
echo "✅ 設定を保存しました: $CONFIG_FILE"
echo ""

# テスト送信
if [ "$CHATWORK_ENABLED" = "true" ]; then
    echo "4. テスト通知を送信しますか？"
    read -p "テスト送信する (y/n): " TEST_CHOICE
    
    if [ "$TEST_CHOICE" = "y" ] || [ "$TEST_CHOICE" = "Y" ]; then
        echo "テスト通知を送信中..."
        
        # Pythonスクリプトでテスト
        python3 << EOF
import urllib.request
import urllib.parse
import json

api_token = "$CHATWORK_API_TOKEN"
room_id = "$CHATWORK_ROOM_ID"

if api_token and room_id and api_token != "YOUR_CHATWORK_API_TOKEN_HERE":
    url = f"https://api.chatwork.com/v2/rooms/{room_id}/messages"
    message = "[info][title]🎉 テスト通知[/title]Claude Code Hook からのテスト通知です。\\n設定が正常に完了しました！[/info]"
    
    data = urllib.parse.urlencode({'body': message}).encode('utf-8')
    req = urllib.request.Request(url, data=data, method='POST')
    req.add_header('X-ChatWorkToken', api_token)
    req.add_header('Content-Type', 'application/x-www-form-urlencoded')
    
    try:
        with urllib.request.urlopen(req, timeout=5) as response:
            if response.status == 200:
                print("✅ テスト通知を送信しました！Chatworkを確認してください。")
            else:
                print(f"❌ 送信失敗: HTTPステータス {response.status}")
    except Exception as e:
        print(f"❌ エラー: {e}")
else:
    print("❌ APIトークンまたはルームIDが設定されていません")
EOF
    fi
fi

echo ""
echo "=========================================="
echo "設定完了！"
echo ""
echo "Claude Codeを再起動すると、以下のタイミングでChatwork通知が送信されます："
echo "  • プロンプト送信時"
echo "  • 応答完了時"
echo ""
echo "設定を変更する場合は、このスクリプトを再実行するか"
echo "直接 $CONFIG_FILE を編集してください。"
echo "=========================================="