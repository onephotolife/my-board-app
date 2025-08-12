# Claude Code 通知問題調査レポート

## 調査日時
2025年8月12日 21:07

## 問題の概要
Claude Codeからの通知（`after_command`および`user-prompt-submit-hook`）が動作していない。

## 調査結果

### 1. 設定ファイルの状態
**ファイル**: `.claude/settings.local.json`
- ✅ 正しく設定されている
- Hook設定:
  - `after_command`: `/Users/yoshitaka.yamagishi/Documents/projects/my-board-app/claude-notifications/notify-enhanced.sh`
  - `user-prompt-submit-hook`: 同上

### 2. 通知スクリプトの状態
**スクリプト**: `claude-notifications/notify-enhanced.sh`
- ✅ ファイルが存在
- ✅ 実行権限あり (`-rwxr-xr-x`)
- ✅ 直接実行時は正常動作

### 3. テスト結果
- **直接実行**: ✅ 成功（4つの方法で通知送信）
  - terminal-notifier (standard)
  - terminal-notifier (system sender)
  - AppleScript (basic)
  - AppleScript (with options)
- **Claude Code Hook経由**: ❌ 動作していない

### 4. ログ分析
**notification-enhanced.log**より:
- 最後の実行: 2025-08-12 21:01:04（手動テスト）
- Claude Codeからの自動実行記録なし

## 問題の原因

### 主要な問題
**Claude Codeのローカル設定ファイル（`.claude/settings.local.json`）が正しく読み込まれていない可能性が高い**

### 考えられる原因
1. **設定ファイルの場所の問題**
   - 現在の設定: プロジェクトディレクトリ内の`.claude/settings.local.json`
   - Claude Codeが期待する場所: おそらく`~/.config/claude/`または別の場所

2. **Hook機能の有効化**
   - Claude Code自体でHook機能が無効化されている可能性
   - グローバル設定とローカル設定の競合

3. **権限の問題**
   - Claude Codeプロセスからスクリプトへのアクセス権限

## 推奨される解決策

### 即座に試すべき対応

1. **グローバル設定の確認**
   ```bash
   # Claude Codeのグローバル設定を確認
   claude code settings --show
   ```

2. **設定ファイルの移動**
   ```bash
   # グローバル設定ディレクトリに設定をコピー
   mkdir -p ~/.config/claude
   cp .claude/settings.local.json ~/.config/claude/settings.json
   ```

3. **Hook機能の有効化確認**
   ```bash
   # Claude CodeでHooksが有効か確認
   claude code --version
   claude code settings hooks --enable
   ```

4. **デバッグモードでの実行**
   ```bash
   # デバッグモードでClaude Codeを起動
   CLAUDE_DEBUG=1 claude code
   ```

### 追加の確認事項

1. **プロセス監視**
   - Activity Monitorでスクリプトが実行されているか確認
   - `ps aux | grep notify-enhanced`でプロセスを監視

2. **システムログの確認**
   ```bash
   # システムログで通知関連のエラーを確認
   log show --predicate 'process == "Claude Code"' --last 1h
   ```

3. **別の通知方法の検討**
   - Claude Code の Extension や Plugin の利用
   - 外部ツール（BTT、Hammerspoon等）との連携

## 結論

通知スクリプト自体は正常に動作しているが、Claude Codeがローカルの設定ファイルを読み込んでいない、またはHook機能が有効化されていないことが原因と考えられる。グローバル設定の確認と、正しい設定ファイルの配置が必要。

## 次のステップ

1. Claude Codeのドキュメントで正しい設定ファイルの場所を確認
2. グローバル設定でHooksを有効化
3. 設定ファイルを正しい場所に配置
4. Claude Codeを再起動して動作確認

---
*このレポートは2025年8月12日時点の調査結果です*