# Claude Code 通知問題 - 解決方法

## 実施日時
2025年8月12日 21:12

## 問題の原因
Claude Codeのグローバル設定では`hooks`設定が直接変更できないため、ローカルの`.claude/settings.local.json`が読み込まれていませんでした。

## 実施した解決策

### 1. 設定ファイルの作成
**作成ファイル**: `claude-settings.json`
- プロジェクトルートに設定ファイルを作成
- Hook設定を含む完全な設定を記述

### 2. 起動スクリプトの作成
**作成ファイル**: `claude-startup-script.sh`
```bash
claude --settings ./claude-settings.json
```
- 設定ファイルを明示的に指定してClaude Codeを起動

### 3. テストスクリプトの作成
**作成ファイル**: `test-notification-hook.sh`
- 通知スクリプトの動作確認
- 設定ファイルの存在確認
- ログファイルのチェック

## 使用方法

### 方法1: 起動スクリプトを使用
```bash
./claude-startup-script.sh
```

### 方法2: 直接コマンドで起動
```bash
claude --settings ./claude-settings.json
```

### 方法3: エイリアスの設定（推奨）
`.zshrc`または`.bashrc`に追加:
```bash
alias claude-notify='claude --settings /Users/yoshitaka.yamagishi/Documents/projects/my-board-app/claude-settings.json'
```

## 設定内容

### Hook設定
- **after_command**: Claudeの応答完了時に通知
- **user-prompt-submit-hook**: ユーザー入力待ち時に通知

### 通知内容
- ✅ 応答完了通知
- ⏳ 入力待ち通知
- 🔊 サウンド付き（Glass.aiff）

## 確認結果
- ✅ 通知スクリプト: 正常動作
- ✅ 設定ファイル: 作成完了
- ✅ 起動スクリプト: 実行可能
- ⚠️ Hook実行: Claude Code起動時に`--settings`フラグが必要

## 重要な注意事項

### Claude Codeの制限
1. グローバル設定で`hooks`は直接設定できない
2. `--settings`フラグで外部設定ファイルを指定する必要がある
3. プロジェクトごとに設定ファイルを用意することを推奨

### トラブルシューティング
通知が機能しない場合:
1. `./test-notification-hook.sh`でテスト実行
2. `notification-enhanced.log`でログ確認
3. Claude Codeを`--settings`フラグ付きで起動しているか確認

## 今後の改善案
1. VSCode統合時の自動設定読み込み
2. グローバルエイリアスの設定
3. 複数プロジェクト対応の設定管理システム

---
*このドキュメントは2025年8月12日時点の解決方法です*