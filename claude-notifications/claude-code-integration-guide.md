# Claude Code 通知システム - 統合ガイド

## ✅ セットアップ完了状況

### 1. 基本設定 - 完了
- ✅ 通知スクリプト (`notify.sh`) - 作成済み・実行権限付与済み
- ✅ 設定ファイル (`~/.claude-notifications-config`) - 作成済み
- ✅ テストスクリプト (`test-notification.sh`) - 作成済み・実行権限付与済み
- ✅ セットアップスクリプト (`setup.sh`) - 作成済み・実行権限付与済み

### 2. 通知テスト - 完了
通知テストを実行し、以下の3種類の通知が送信されました：
- 入力待ち通知（Ping音）
- 応答完了通知（Glass音）
- カスタムメッセージ通知

### 3. 現在の設定
**Mac通知設定:**
- 入力待ち時の音: `Ping`
- 応答完了時の音: `Glass`
- 追加音声アラート: 無効

**外部サービス:**
- iPhone通知 (Pushover): 無効
- Slack通知: 無効
- Discord通知: 無効
- Chatwork通知: 無効

## 📋 Claude Codeへの統合手順

### ステップ1: Claude Code設定ファイルの場所を確認

Claude Codeの設定ファイルは通常以下の場所にあります：
- **macOS/Linux**: `~/.config/claude-code/settings.json`
- **Windows**: `%USERPROFILE%\.config\claude-code\settings.json`

### ステップ2: settings.jsonに以下を追加

```json
{
  "hooks": {
    "user-prompt-submit-hook": "/Users/yoshitaka.yamagishi/Documents/projects/my-board-app/claude-notifications/notify.sh response_complete",
    "response-received-hook": "/Users/yoshitaka.yamagishi/Documents/projects/my-board-app/claude-notifications/notify.sh input_waiting"
  }
}
```

**注意:** 既存の設定がある場合は、`hooks`セクションのみを追加してください。

### ステップ3: Claude Codeを再起動

設定を反映させるため、Claude Codeを一度終了して再起動してください。

## 🔧 カスタマイズ

### 通知音の変更

`~/.claude-notifications-config`を編集して、お好みの音に変更できます：

```bash
# 利用可能な音:
# Basso, Blow, Bottle, Frog, Funk, Glass, Hero,
# Morse, Ping, Pop, Purr, Sosumi, Submarine, Tink

INPUT_SOUND="Hero"        # 入力待ち時
COMPLETE_SOUND="Purr"     # 応答完了時
```

### 外部サービスの有効化

必要に応じて、以下のサービスを有効化できます：

#### iPhone通知 (Pushover)
1. [Pushover](https://pushover.net/)でアカウント作成
2. アプリをiPhoneにインストール
3. `~/.claude-notifications-config`で設定：
```bash
ENABLE_IPHONE=true
PUSHOVER_USER_KEY="あなたのユーザーキー"
PUSHOVER_APP_TOKEN="アプリトークン"
```

#### Slack通知
```bash
ENABLE_SLACK=true
SLACK_WEBHOOK_URL="https://hooks.slack.com/services/..."
```

#### Discord通知
```bash
ENABLE_DISCORD=true
DISCORD_WEBHOOK_URL="https://discord.com/api/webhooks/..."
```

#### Chatwork通知
```bash
ENABLE_CHATWORK=true
CHATWORK_API_TOKEN="あなたのAPIトークン"
CHATWORK_ROOM_ID="ルームID"
```

## 📝 動作確認

Claude Codeに統合後、以下の動作を確認してください：

1. **入力待ち通知**: Claudeがあなたの応答を待っているときに通知
2. **応答完了通知**: Claudeが処理を完了したときに通知

## 🛠 トラブルシューティング

### 通知が表示されない場合

1. **Macの通知設定を確認**
   - システム環境設定 → 通知とフォーカス
   - ターミナルの通知を許可

2. **スクリプトの権限を確認**
   ```bash
   ls -la /Users/yoshitaka.yamagishi/Documents/projects/my-board-app/claude-notifications/notify.sh
   ```

3. **手動でテスト**
   ```bash
   /Users/yoshitaka.yamagishi/Documents/projects/my-board-app/claude-notifications/notify.sh input_waiting
   ```

### Claude Codeの設定ファイルが見つからない場合

Claude Codeのインストール方法によって場所が異なる可能性があります。
以下のコマンドで検索してみてください：

```bash
find ~ -name "settings.json" -path "*/claude-code/*" 2>/dev/null
```

## 📞 サポート

問題が解決しない場合は、以下の情報と共にお問い合わせください：
- macOSバージョン: `sw_vers`
- シェル環境: `echo $SHELL`
- エラーメッセージの全文