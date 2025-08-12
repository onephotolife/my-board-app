#!/bin/bash

# Claude Code Notification 設定ファイルテンプレート
# このファイルを ~/.claude-notifications-config にコピーして使用してください
# cp config-template.sh ~/.claude-notifications-config
# その後、必要な設定を有効化してください

# ============================================
# Mac通知設定
# ============================================
# 入力待ち時の音
INPUT_SOUND="Ping"          # 選択肢: Basso, Blow, Bottle, Frog, Funk, Glass, Hero, Morse, Ping, Pop, Purr, Sosumi, Submarine, Tink

# 応答完了時の音
COMPLETE_SOUND="Glass"       # 上記と同じ選択肢

# 音を強制的に再生（通知センターが音を鳴らさない場合のフォールバック）
FORCE_SOUND=true

# 右上通知センターに表示（terminal-notifier + macOS標準通知）
FRONTEND_ALERT=true

# ============================================
# iPhone通知設定（Pushover）
# ============================================
# Pushoverを使用する場合は true に設定
ENABLE_IPHONE=false

# Pushoverの設定（https://pushover.net/ でアカウント作成後に取得）
PUSHOVER_USER_KEY=""        # あなたのUser Key
PUSHOVER_APP_TOKEN=""       # Application Token
PUSHOVER_SOUND="pushover"   # 通知音
PUSHOVER_PRIORITY=0         # 優先度 (-2 to 2)

# ============================================
# Slack通知設定
# ============================================
# Slackを使用する場合は true に設定
ENABLE_SLACK=false

# Slack Webhook URL（Slackアプリの設定から取得）
SLACK_WEBHOOK_URL=""
SLACK_COLOR="#0084FF"       # 通知の色

# ============================================
# Discord通知設定
# ============================================
# Discordを使用する場合は true に設定
ENABLE_DISCORD=false

# Discord Webhook URL（サーバー設定 > 連携サービス > Webhooksから作成）
DISCORD_WEBHOOK_URL=""

# ============================================
# Chatwork通知設定
# ============================================
# Chatworkを使用する場合は true に設定
ENABLE_CHATWORK=false

# Chatwork API設定
CHATWORK_API_TOKEN=""       # APIトークン
CHATWORK_ROOM_ID=""         # ルームID

# ============================================
# その他の設定
# ============================================
# デバッグモード（詳細なログ出力）
DEBUG_MODE=false