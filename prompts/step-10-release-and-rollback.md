# STEP 10 — リリース & ロールバック（Codex 実行用）

**目的:** 安全な出荷と即時復旧の手順化  
**完了条件:** チェックリストの整備と周知、リリース/ロールバックが手順化

---

## リリース手順（チェックリスト）

1. **PR が緑**（型→lint→UT/IT→build→E2E→負荷）
2. **Feature Flag OFF** のままデプロイ
3. `/api/health` が 200、ログにエラーが無いこと
4. **同期ジョブ**で `syncIndexes()` を実行（初回のみ）
5. Feature Flag **ON (SEARCH_JA_ENABLE=1)** にして 10% → 50% → 100% 段階切替
6. 監視：500, 429, p95 が SLA 内

## ロールバック手順

1. **Flag OFF**（即時緊急停止は **Kill Switch=1**）
2. 直近 PR を `git revert` or デプロイシステムで `rollback`
3. 監視でエラー/レイテンシの回復を確認
4. 事後分析（原因・再発防止策・テスト追加）

---

## コミット（文書）

```bash
git add -A
git commit -m "docs(ops): add release and rollback checklist for search feature"
```
