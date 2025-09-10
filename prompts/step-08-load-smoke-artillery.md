# STEP 08 — 負荷スモーク（Artillery）と p95 判定（Codex 実行用）

**目的:** サジェスト/検索の基本レイテンシを継続監視  
**完了条件:** `artillery/search.yml` が実行でき、p95 をログ出力

---

## 実行指示

### 1) Artillery シナリオ

**ファイル:** `artillery/search.yml`

```yaml
config:
  target: 'http://localhost:3000'
  phases:
    - duration: 60
      arrivalRate: 20
scenarios:
  - name: suggest
    flow:
      - get:
          url: '/api/suggest?q=た&limit=5'
  - name: search
    flow:
      - get:
          url: '/api/search?q=ﾀﾅｶ&type=users'
```

### 2) 実行（ローカル）

```bash
npm run start -- -p 3000 &
npx wait-on http://localhost:3000/api/health
npx artillery run -o reports/artillery.json artillery/search.yml || true
node -e "const r=require('./reports/artillery.json'); if(r.aggregate){console.log('p95', r.aggregate.latency);}"
```

### 3) コミット

```bash
git add -A
git commit -m "perf(smoke): add artillery scenario and p95 reporting"
```

---

## 注意

- Node 22 では oclif/ESM 問題が出る場合あり。CI は **Node 20** で実行。
