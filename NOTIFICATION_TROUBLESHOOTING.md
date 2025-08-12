# Claude Code 通知システム トラブルシューティングガイド

## 概要
Claude Codeの通知が届かない場合の診断と修正方法を説明します。

## 一般的な問題と解決方法

### 1. macOS システム設定の確認

#### 通知の許可設定
1. `システム設定` > `通知とフォーカス` > `通知` を開く
2. `Terminal` を検索し、通知を `許可` に設定
3. `terminal-notifier` があれば、同様に `許可` に設定

#### フォーカス（集中モード）の確認
1. `システム設定` > `通知とフォーカス` > `フォーカス` を確認
2. 「サイレント」や「作業用フォーカス」が有効になっていないか確認
3. 無効にするか、Terminalを例外アプリに追加

### 2. terminal-notifier の確認

```bash
# インストール確認
which terminal-notifier

# バージョン確認
terminal-notifier -version

# 手動テスト
terminal-notifier -title "テスト" -message "手動テスト" -sound "Glass"
```

### 3. AppleScript の確認

```bash
# 手動テスト
osascript -e 'display notification "テスト通知" with title "AppleScript テスト" sound name "Glass"'
```

### 4. 音の再生確認

```bash
# 音ファイルの存在確認
ls -la /System/Library/Sounds/Glass.aiff

# 音の再生テスト
afplay /System/Library/Sounds/Glass.aiff
```

## 診断スクリプトの実行

### 総合テスト
```bash
./test-all-notifications.sh
```

### システム診断
```bash
./notification-debug.sh
```

### 設定確認
```bash
./check-notification-settings.sh
```

## 利用可能な通知スクリプト

### 1. notify-enhanced.sh（推奨）
- 複数の通知方法を試行
- 詳細な診断ログ
- 高い成功率

### 2. notify-failsafe.sh（フォールバック）
- 最小限の実装
- 確実な動作
- シンプルなログ

### 3. notify.sh（オリジナル）
- 既存の実装
- Chatwork連携対応

## ログファイルの確認

### システムログ
```bash
# Claude Code通知ログ
tail -f ~/.claude-notifications.log

# 強化版診断ログ
tail -f /Users/yoshitaka.yamagishi/Documents/projects/my-board-app/notification-enhanced.log

# フェイルセーフログ
tail -f /Users/yoshitaka.yamagishi/Documents/projects/my-board-app/notification-failsafe.log
```

### デバッグログ
```bash
tail -f /Users/yoshitaka.yamagishi/Documents/projects/my-board-app/debug-hook.log
```

## 高度なトラブルシューティング

### 1. システム権限の再設定
```bash
# 通知設定のリセット（慎重に実行）
# defaults delete com.apple.ncprefs
```

### 2. NotificationCenter の再起動
```bash
sudo killall NotificationCenter
```

### 3. terminal-notifier の再インストール
```bash
brew uninstall terminal-notifier
brew install terminal-notifier
```

## よくある問題

### 問題1: 通知は表示されるが音が鳴らない
**解決方法:**
- システム設定 > サウンド で通知音量を確認
- 通知設定でアプリの音を有効にする

### 問題2: 一部の通知だけ表示されない
**解決方法:**
- 通知の重複防止機能が働いている可能性
- 異なるメッセージでテスト

### 問題3: terminal-notifier のエラー
**解決方法:**
- macOS のバージョンとの互換性確認
- Homebrew で最新版にアップデート

## 緊急時の設定

もし通知が全く機能しない場合、以下の設定で最小限の動作を確保：

```json
{
  "hooks": {
    "after_command": [
      {
        "command": "/Users/yoshitaka.yamagishi/Documents/projects/my-board-app/claude-notifications/notify-failsafe.sh",
        "args": ["response_complete", "応答完了", "Claude Code"]
      }
    ]
  }
}
```

## 参考情報

### macOS バージョン別の注意点
- **macOS 15.x (Sequoia)**: 新しいプライバシー設定が影響する可能性
- **macOS 14.x (Sonoma)**: フォーカスモードの動作が変更
- **macOS 13.x (Ventura)**: 通知設定のUIが変更

### 権限関連
- Terminal.app の通知権限
- terminal-notifier の通知権限
- システムの集中モード設定