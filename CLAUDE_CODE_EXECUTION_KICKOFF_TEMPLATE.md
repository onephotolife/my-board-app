## Claude Code 実行キックオフ テンプレート（コピー&ペースト用）

目的: Claude Codeが「前回アクセス不可」「タスク未定義」を理由に停止しないよう、必要情報を一括提供して即実行させるための指示テンプレート。下記を丸ごと貼り付けて実行してください。

---

### 0) ACK（最初に返答で宣言させる）
以下の宣言を先頭に返してから実行に入ってください:
- ACK: STRICT120 / SPEC-LOCK / AUTH_ENFORCED_TESTING_GUARD / LOG-FIRST を遵守します
- Plan→Actions→Evidence→Result→Validation→Compliance→Next の順で進行します
- 1変更=1コミット。各ステップでlog+diff+テスト結果（line/junit/json/trace）を提示します

---

### 1) SPEC-MAP（参照ドキュメントを“内容ごと”提供）
これが実行仕様です（全文貼付。ローカルパス参照は不要です）:

```md
[SPEC CONTENT START]
（ここに /CLAUDE_CODE_NEXT_STEPS_HASHTAG_EXECUTION.md の全文をそのまま貼り付け）
[SPEC CONTENT END]
```

重要: 上のSPEC本文を内部メモリに保持し、以降の判断・実装・テストはこのSPECに準拠して下さい。外部リンク参照は不要・禁止です。

---

### 2) 実行前コンテキスト（環境/制約/権限）
- OS: macOS（zsh）
- Node: 20.18.1 以上（未満なら nvm で切替）
- Repo Root: /Users/yoshitaka.yamagishi/Documents/projects/my-board-app
- Branch: feature/sns-functions（変更はこのブランチで）
- Env: `.env.local` に MONGODB_URI, AUTH_EMAIL, AUTH_PASSWORD を設定済み想定（未設定なら作成）
- 权限: 必要な `npm i`, `npx playwright install`, `npx ts-node` などのコマンド実行・ファイル作成・編集・コミット・プッシュを許可

---

### 3) タスク（AC/NFRつき・順番厳守）
1. 認証E2E安定化（storageState 方式）
   - AC:
     - tests/e2e/storageState.json を生成し、playwright.config.ts の use.storageState に適用
     - tests/e2e/tags.spec.ts がログイン操作なしで動作
   - NFR: 3回連続PASS、junit/json/trace生成

2. バックフィル統一（ts-node 直利用）
   - AC:
     - scripts/backfill-tags.ts を追加（src/app/utils/hashtag.ts の extractHashtags を import）
     - DRY_RUN→本実行の二段階で、/api/tags/trending/search が非空応答になる
   - NFR: 実行ログと処理件数のJSON出力、失敗0

3. UIサジェストの仕上げ（a11y/操作/Portal）
   - AC:
     - #東 入力で候補表示（role=listbox/option, aria属性）
     - 上/下/Enter/Tab/ESC の操作をE2Eで検証
   - NFR: サジェストのz-index/Portal衝突なし、p95<200ms（dev基準）

4. 付随テスト（Unicode/ZWJ/VS/429）
   - AC: 代表ケース（#東京/#ＴＯＫＹＯ/#tokyo/#👨‍👩‍👧‍👦/#🇯🇵）の抽出→正規化→検索一致→リンク化をE2Eもしくは結合で確認
   - AC: 検索APIへの連打で429とRetry-Afterを確認

---

### 4) 実行手順（そのまま実行可能なコマンドと編集指示）
実行規則:
- 各ステップの前に目的/期待値を要約し、完了後に証拠（ログ末尾10行・junit/json・trace保存）を提示
- 途中失敗時は「原因→対策→再実行」まで自律対応（Action Request禁止）

手順:
1) 前提チェック
```bash
cd /Users/yoshitaka.yamagishi/Documents/projects/my-board-app
node -v && npm -v
nvm install 20.18.1 >/dev/null 2>&1 || true
nvm use 20.18.1 || true
npm ci
npx playwright install --with-deps | cat
```

2) storageState 生成（API-loginが無ければUI-loginで生成し保存）
```bash
PLAYWRIGHT_BASE_URL=http://localhost:3000 AUTH_EMAIL="$AUTH_EMAIL" AUTH_PASSWORD="$AUTH_PASSWORD" \
npx ts-node tests/e2e/utils/create-storage-state.ts | cat
```

3) バックフィル（DRY_RUN→本実行）
```bash
DRY_RUN=true  npx ts-node -r tsconfig-paths/register scripts/backfill-tags.ts | cat
DRY_RUN=false npx ts-node -r tsconfig-paths/register scripts/backfill-tags.ts | cat
```

4) サジェストUI 組込み/調整（必要な場合のみ編集）
- `src/components/PostForm.tsx` に `data-testid="post-content-input"` を付与
- Hook/Component を接続（a11y/キー操作/Portalを確認）

5) 検証（API/SSR/E2E）
```bash
npm run build | tail -n 20
curl -sS 'http://localhost:3000/api/tags/trending?days=7&limit=5' | jq .
curl -sS 'http://localhost:3000/api/tags/search?q=t&limit=5' | jq .
curl -sSI 'http://localhost:3000/tags/東京' | head -n 20
npx playwright test tests/e2e/tags.spec.ts --project=chromium \
  --reporter=line,html,junit,json --trace=on --output=./playwright-report | tail -n 50
```

6) 失敗時の代替経路（例）
- 認証で止まる → storageState を再生成（UI-login）、baseURL/Cookie属性確認
- データ不足 → バックフィル or テスト用投稿を複数投入
- 429多発 → /api/tags/search の windowMs/max をテスト時だけ緩和
- 絵文字不一致 → normalizeTag を唯一の依存点に統一、代表ケースをE2E追加

7) コミット/プッシュ（1変更=1コミット）
```bash
git add -A && git commit -m "chore(e2e): storageState auth; feat(scripts): backfill-tags ts-node; feat(ui): hashtag suggestions a11y" | cat
git push origin feature/sns-functions | cat
```

---

### 5) 出力（必須）
- 各ステップのログ要約（最後の10行）
- 変更差分（抜粋）
- テストアーティファクト（行レポート末尾/JUnit totals/JSON totals/traceパス）
- 合否（合格基準に照らして）

---

### 6) 合格基準（最終判定）
- `/api/tags/trending` と `/api/tags/search` が非空
- `tests/e2e/tags.spec.ts` が3連続 PASS（storageState使用）
- 入力サジェスト: `#東` → 候補表示→Enter確定→投稿→リンク遷移 までPASS
- Log Health: ERROR=0 / 未処理例外=0（テスト期間±2分）

---

### 7) 注意（Claude Codeが誤停止しないために）
- 「ファイルにアクセスできない」→ 上のSPEC本文を既に貼付しているため参照可。ローカルパスは不要。
- 「具体タスク未定義」→ 本テンプレートのタスク/ACを使用。自己分解・逐次実行し、各ステップで証拠提示。
- 「権限不足」→ コマンド実行・編集・コミット・プッシュの許可を前提。不可ならAction Requestを返さず、代替案を提示して続行。

---

このテンプレートを使えば、Claude Codeは追加の質問なく、即時に安全な手順で作業を開始できます。

