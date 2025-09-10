# Codex 自走用 CI ワークフローパック（GitHub Actions）

このパックをリポジトリに追加すると、**ローカルHTTPの制約（EPERM）を回避**して、
**GitHub Actions ランナー上で**「サジェストP95計測（Atlas時）」と「基本E2E（Playwright）」を
**Codexが自走**で実行できるようになります。

## できること
- `workflow_dispatch`（ボタン実行）と **スラッシュコマンド**（Issue/PRに `@codex run bench|e2e|all`）で実行
- Atlas/フォールバックを `.env` の `SEARCH_USE_ATLAS` で切替（デフォルト `false`）
- 成果物（`suggest.json`, Playwrightレポート）を **Artifacts** として保存
- 合否判定：**P95 < 200ms**、**E2E failed=0** でジョブ成功

## 追加で必要なこと（オーナーが1回だけ）
1. **Secrets 設定**（Settings → Secrets and variables → Actions → New repository secret）
   - `MONGODB_URI`：Atlas の接続文字列（Atlas計測をする場合）
   - `MONGODB_DB`：例 `boardDB`
   - `SEARCH_USE_ATLAS`：`true`（Atlasで測る場合）/ `false`
   - （必要に応じて）`NEXTAUTH_SECRET` などアプリ既存のSecrets

2. **Atlasのネットワークアクセス**  
   開発用途なら一時的に `0.0.0.0/0` を許可するとGitHub Runnerから接続できます。  
   もしくは固定IPのSelf-hosted Runnerを使って、そちらのIPを許可してください。

> 上記のSecrets設定だけは**リポジトリ管理者の権限が必要**です。そこを1度だけクリックで設定すれば、以降はCodexが自走できます。

## 使い方
- **手動実行**: GitHub → Actions → `Codex: Bench & E2E` → **Run workflow** → `mode` を `bench|e2e|all` から選択
- **スラッシュコマンド**（Issue/PRコメント）:  
  `@codex run bench` または `@codex run e2e` または `@codex run all`

## 含まれるファイル
- `.github/workflows/codex-dispatch.yml` … スラッシュコマンドで `workflow_dispatch` を発火
- `.github/workflows/codex-bench-e2e.yml` … 実行本体（bench/e2e/all）
- `docs/SECRETS_SETUP.md` … Secretsの設定手順（画面遷移つきガイド）