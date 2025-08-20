#!/bin/bash

echo "==================================="
echo "音声通知デバッグツール"
echo "==================================="
echo ""

echo "1. 単純なビープ音テスト..."
osascript -e "beep"
sleep 1

echo "2. システムサウンド直接再生テスト (Glass)..."
afplay /System/Library/Sounds/Glass.aiff
sleep 1

echo "3. システムサウンド直接再生テスト (Ping)..."
afplay /System/Library/Sounds/Ping.aiff
sleep 1

echo "4. osascript通知（音なし）..."
osascript -e 'display notification "音なしテスト" with title "テスト1"'
sleep 2

echo "5. osascript通知（Glass音指定）..."
osascript -e 'display notification "Glass音テスト" with title "テスト2" sound name "Glass"'
sleep 2

echo "6. osascript通知（Ping音指定）..."
osascript -e 'display notification "Ping音テスト" with title "テスト3" sound name "Ping"'
sleep 2

echo "7. 複合テスト（通知＋別途音再生）..."
osascript -e 'display notification "複合テスト" with title "テスト4"' &
afplay /System/Library/Sounds/Pop.aiff &
wait

echo ""
echo "==================================="
echo "テスト完了！"
echo "どのテストで音が鳴りましたか？"
echo "==================================="
echo ""
echo "トラブルシューティング："
echo "1. システム環境設定 → 通知とフォーカス"
echo "   - ターミナルの通知が有効か確認"
echo "   - 通知音が有効か確認"
echo ""
echo "2. システム環境設定 → サウンド"
echo "   - 音量が適切か確認"
echo "   - 通知音の設定を確認"
echo ""