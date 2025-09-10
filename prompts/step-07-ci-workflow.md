# STEP 07 — GitHub Actions CI（型→lint→UT/IT→build→E2E→負荷）（Codex 実行用）

**目的:** 品質ゲートを自動化し、回帰を早期検知  
**完了条件:** `ci-search` ワークフローが緑（Node 20固定）

---

## 実行指示

### 1) CI ワークフロー

**ファイル:** `.github/workflows/ci-search.yml`

```yaml
name: ci-search
on: [push, pull_request]

jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - run: npm ci
      - run: npm run typecheck
      - run: npm run lint
      - run: npm test -- --run
      - run: npm run build

      - name: Start server
        run: |
          nohup npm run start -- -p 3000 > dev.log 2>&1 &
          npx wait-on http://localhost:3000/api/health

      - name: Install Playwright
        run: npx playwright install --with-deps

      - name: E2E (test-mode auth)
        env:
          E2E_TEST_MODE: '1'
        run: npx playwright test

      - name: Artillery smoke
        run: |
          npx artillery run -o reports/artillery.json artillery/search.yml || true
          node -e "const r=require('./reports/artillery.json'); if(r.aggregate){console.log('p95', r.aggregate.latency.p95);}"

      - name: Upload reports
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: reports
          path: reports
```

### 2) コミット

```bash
git add -A
git commit -m "ci: add ci-search workflow (Node20, type->lint->UT/IT->build->E2E->load)"
```

---

## 注意

- 認証が必要な本物 E2E を行う場合は、Secrets を使う構成へ置き換えてください（`E2E_TEST_MODE` 無し）。
