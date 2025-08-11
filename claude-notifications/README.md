# Claude Code 通知システム

## 🎯 概要
Claude Codeの入力待ちと応答完了時に、Mac音声・デスクトップ通知を表示し、さらにiPhone、Slack、Discord、Chatworkへの通知も可能なシステムです。

## ✅ セットアップ完了状況

### 基本機能（実装済み）
- ✅ **Macデスクトップ通知** - 自動で動作
- ✅ **Mac通知音** - カスタマイズ可能
- ✅ **通知メッセージのカスタマイズ**

### 外部サービス連携（設定次第で利用可能）
- 📱 **iPhone通知** (Pushover経由)
- 💬 **Slack通知**
- 🎮 **Discord通知**
- 💼 **Chatwork通知**

## 🚀 クイックスタート

### 1. Claude Codeへの設定追加

Claude Codeの設定ファイル（通常は `~/.config/claude-code/settings.json`）に以下を追加：

```json
{
  "hooks": {
    "user-prompt-submit-hook": "/Users/yoshitaka.yamagishi/Documents/projects/my-board-app/claude-notifications/notify.sh response_complete",
    "response-received-hook": "/Users/yoshitaka.yamagishi/Documents/projects/my-board-app/claude-notifications/notify.sh input_waiting"
  }
}
```

### 2. 通知音のカスタマイズ（オプション）

`~/.claude-notifications-config` を編集：

```bash
# 入力待ち時の音
INPUT_SOUND="Ping"

# 応答完了時の音  
COMPLETE_SOUND="Glass"
```

利用可能な音：
- Basso, Blow, Bottle, Frog, Funk, Glass, Hero
- Morse, Ping, Pop, Purr, Sosumi, Submarine, Tink

### 3. 通知のテスト

```bash
./test-notification.sh
```

## 📱 iPhone通知の設定

### Pushoverを使用

1. [Pushover](https://pushover.net/)でアカウント作成
2. アプリをiPhoneにインストール
3. User KeyとApp Tokenを取得
4. `~/.claude-notifications-config` に設定：

```bash
ENABLE_IPHONE=true
PUSHOVER_USER_KEY="あなたのユーザーキー"
PUSHOVER_APP_TOKEN="アプリトークン"
```

## 💬 Slack通知の設定

1. Slack Appで「Incoming Webhooks」を設定
2. Webhook URLを取得
3. `~/.claude-notifications-config` に設定：

```bash
ENABLE_SLACK=true
SLACK_WEBHOOK_URL="https://hooks.slack.com/services/..."
```

## 🎮 Discord通知の設定

1. Discordサーバーの設定 → 連携サービス → Webhooks
2. 新しいWebhookを作成
3. `~/.claude-notifications-config` に設定：

```bash
ENABLE_DISCORD=true
DISCORD_WEBHOOK_URL="https://discord.com/api/webhooks/..."
```

## 💼 Chatwork通知の設定

1. ChatworkでAPIトークンを取得
2. 通知したいルームIDを確認
3. `~/.claude-notifications-config` に設定：

```bash
ENABLE_CHATWORK=true
CHATWORK_API_TOKEN="あなたのAPIトークン"
CHATWORK_ROOM_ID="ルームID"
```

## 🛠 トラブルシューティング

### 通知が表示されない場合

1. **権限の確認**
   ```bash
   # スクリプトの実行権限確認
   ls -la notify.sh
   # 必要に応じて権限付与
   chmod +x notify.sh
   ```

2. **Macの通知設定確認**
   - システム環境設定 → 通知とフォーカス
   - ターミナルの通知を許可

3. **デバッグモード**
   ```bash
   # 直接実行してエラーを確認
   ./notify.sh input_waiting "テストメッセージ"
   ```

### 外部サービスに通知が届かない場合

1. **設定ファイルの確認**
   ```bash
   cat ~/.claude-notifications-config
   ```

2. **接続テスト**
   ```bash
   # 各サービスを個別にテスト
   ENABLE_SLACK=true ./notify.sh test "テスト"
   ```

## 📝 カスタマイズ例

### 特定のプロジェクトだけ通知

```bash
# プロジェクト固有の設定を作成
cp config-template.sh ~/my-project-notifications-config

# notify.sh内で設定ファイルを切り替え
CONFIG_FILE="$HOME/my-project-notifications-config"
```

### 時間帯による通知制御

`notify.sh` に以下を追加：

```bash
HOUR=$(date +%H)
if [ $HOUR -ge 22 ] || [ $HOUR -lt 8 ]; then
    # 夜間は音を小さく
    SOUND="Tink"
fi
```

## 📄 ファイル構成

```
claude-notifications/
├── notify.sh               # メイン通知スクリプト
├── config-template.sh      # 設定ファイルのテンプレート
├── setup.sh               # セットアップスクリプト
├── test-notification.sh   # テストスクリプト
└── README.md              # このファイル
```

## 🔧 高度な設定

### カスタムフック

独自の処理を追加したい場合：

```bash
# notify.sh の最後に追加
if [ -f "$HOME/.claude-custom-hook.sh" ]; then
    source "$HOME/.claude-custom-hook.sh"
fi
```

### ログ記録

```bash
# ~/.claude-notifications-config に追加
LOG_FILE="$HOME/.claude-notifications.log"
echo "$(date): $NOTIFICATION_TYPE - $MESSAGE" >> "$LOG_FILE"
```

## 📮 サポート

問題が解決しない場合は、以下の情報を含めてお問い合わせください：

1. `echo $SHELL` の出力
2. `sw_vers` の出力（macOSバージョン）
3. エラーメッセージの全文
4. 設定ファイルの内容（秘密情報は除く）