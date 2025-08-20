# Claude Code 通知システム 完全運用マニュアル

## 🎯 概要
このシステムはClaude Codeの様々なイベント（コマンド実行完了、入力待機など）を検出し、Macのデスクトップ通知と音声で確実にユーザーに通知するシステムです。

## 📋 システム構成

### 1. メイン通知スクリプト
- **ファイル**: `claude-hook-notify.sh`
- **機能**: 複数の方法で通知を送信（osascript、terminal-notifier、音声再生、音声読み上げ）
- **ログ**: `claude-hook.log`

### 2. Hook設定
- **ファイル**: `.claude/settings.local.json`
- **対応イベント**:
  - `after_command` - コマンド実行完了
  - `user-prompt-submit-hook` - ユーザー入力待機
  - `response-complete` - レスポンス完了
  - `user-input-waiting` - 入力待機
  - `command-complete` - コマンド完了
  - `before_command` - コマンド開始
  - `session_ready` - セッション準備完了

### 3. 監視システム
- **ファイル**: `claude-hook-monitor.sh`
- **機能**: Hook動作のリアルタイム監視
- **ログ**: `hook-monitor.log`

### 4. フォールバックシステム
- **ファイル**: `claude-fallback-notifier.sh`
- **機能**: Hookが動作しない場合の代替通知
- **方式**: プロセス監視、CPU監視、ファイル変更監視

### 5. テストスイート
- **ファイル**: `claude-notification-test-suite.sh`
- **機能**: システム全体の動作確認
- **レポート**: `notification-test-results.log`

## 🚀 セットアップ手順

### 1. 権限設定
```bash
# 全スクリプトに実行権限を付与
chmod +x claude-hook-notify.sh
chmod +x claude-hook-monitor.sh
chmod +x claude-fallback-notifier.sh
chmod +x claude-notification-test-suite.sh
chmod +x claude-hook-test-all.sh
```

### 2. システムテスト実行
```bash
# 包括的テストを実行
./claude-notification-test-suite.sh
```

### 3. Hook設定テスト（オプション）
```bash
# 全種類のHook名をテスト
./claude-hook-test-all.sh
```

## 🔧 運用方法

### 基本運用
1. **Claude Code再起動**
   ```bash
   # Claude Codeを完全に終了してから再起動
   pkill claude
   claude
   ```

2. **動作確認**
   - Claude Codeでコマンドを実行
   - 通知と音が鳴ることを確認

### 詳細監視モード
```bash
# リアルタイム監視開始
./claude-hook-monitor.sh
```

### フォールバック運用
```bash
# バックグラウンドでフォールバック通知を開始
./claude-fallback-notifier.sh --daemon

# 停止
kill $(cat fallback-notifier.pid)
```

## 🔍 トラブルシューティング

### 通知が来ない場合

1. **テストスイート実行**
   ```bash
   ./claude-notification-test-suite.sh
   ```

2. **直接テスト**
   ```bash
   ./claude-hook-notify.sh test "テスト通知" "🧪 Test"
   ```

3. **ログ確認**
   ```bash
   tail -f claude-hook.log
   ```

4. **設定確認**
   ```bash
   cat .claude/settings.local.json
   jq . .claude/settings.local.json  # JSON構文チェック
   ```

### よくある問題と解決策

#### 1. Hook設定が反映されない
```bash
# Claude Codeプロセス確認
ps aux | grep claude

# 設定ファイル構文チェック
jq . .claude/settings.local.json

# Claude Code完全再起動
pkill claude && sleep 2 && claude
```

#### 2. 通知権限がない
```bash
# システム環境設定 > セキュリティとプライバシー > 通知
# Terminalアプリの通知を許可
```

#### 3. 音が鳴らない
```bash
# 音量確認
osascript -e 'set volume output volume 50'

# 音声ファイル確認
ls -la /System/Library/Sounds/

# 直接テスト
afplay /System/Library/Sounds/Glass.aiff
```

## 📊 ログとモニタリング

### ログファイル一覧
- `claude-hook.log` - Hook実行ログ
- `hook-monitor.log` - 監視システムログ
- `fallback-notification.log` - フォールバックシステムログ
- `notification-test-results.log` - テスト結果
- `hook-test-all.log` - Hook名テスト結果

### ログ監視
```bash
# 全ログを監視
tail -f *.log

# Hook実行のみ監視
tail -f claude-hook.log | grep "HOOK NOTIFICATION"
```

## ⚙️ 設定カスタマイズ

### 音声変更
`claude-hook-notify.sh`内の`SOUND_NAME`を変更:
```bash
SOUND_NAME="Ping"     # デフォルト: Glass
SOUND_NAME="Basso"    # 低い音
SOUND_NAME="Sosumi"   # 高い音
```

### 通知メッセージ変更
`.claude/settings.local.json`のargs配列を編集:
```json
"args": ["hook_name", "カスタムメッセージ", "🎯 カスタムタイトル"]
```

### フォールバック感度調整
`claude-fallback-notifier.sh`内の設定:
```bash
CHECK_INTERVAL=2              # 監視間隔（秒）
CLAUDE_IDLE_THRESHOLD=5       # アイドル検出閾値（秒）
```

## 🔄 メンテナンス

### 定期メンテナンス
```bash
# ログローテーション（1週間ごと推奨）
mv claude-hook.log claude-hook.log.$(date +%Y%m%d)
touch claude-hook.log

# 古いログ削除（1ヶ月以上前）
find . -name "*.log.*" -mtime +30 -delete
```

### システム更新時
```bash
# 全システムテスト
./claude-notification-test-suite.sh

# 必要に応じてHook名を再テスト
./claude-hook-test-all.sh
```

## 📞 サポート情報

### 成功時の挙動
- ✅ デスクトップ通知が表示される
- 🔊 システム音（Glass）が再生される
- 📝 ログにイベントが記録される
- 🎯 フォールバック通知も併用される

### 期待される通知タイミング
1. **コマンド実行後** - "コマンド実行完了"
2. **入力待機時** - "入力待機中"
3. **セッション開始時** - "セッション準備完了"

### システム要件
- macOS 10.14以降
- 通知権限が有効
- 音量設定が有効
- Claude Code最新版

---

## 🎉 運用開始

全ての設定が完了したら：

1. Claude Codeを再起動
2. テストスイートを実行
3. 実際のコマンドで動作確認
4. 必要に応じて監視システムを開始

この通知システムにより、Claude Codeでの作業効率が大幅に向上します！