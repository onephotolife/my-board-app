# Secrets 設定ガイド（初心者向け 3分）

1. GitHubで対象リポジトリを開き、**Settings** をクリック
2. 左メニューの **Secrets and variables → Actions** をクリック
3. **New repository secret** をクリックして、以下を追加（Atlasで計測する場合）

- `MONGODB_URI` 例: `mongodb+srv://<user>:<pass>@<cluster>/boardDB?retryWrites=true&w=majority`
- `MONGODB_DB` 例: `boardDB`
- `SEARCH_USE_ATLAS` 値: `true`
- （必要があれば）`NEXTAUTH_SECRET` など既存アプリのSecretも同様に追加

> Atlas 側で **Network Access** に `0.0.0.0/0` を一時的に追加（開発用途）して、
> GitHub Actions Runner からの接続を許可してください。
> 本番運用ではSelf-hosted Runnerや特定CIDRの許可へ切替を推奨します。

4. 以上で準備完了。以降は **Actions** からワークフローを実行するか、
   PRやIssueのコメントに `@codex run all` と書くだけでCodexが自走します。