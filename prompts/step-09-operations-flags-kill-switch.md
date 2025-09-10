# STEP 09 — 運用（Feature Flag / Kill Switch / Index 同期）（Codex 実行用）

**目的:** 本番での安全運用（段階的有効化・緊急停止・インデックス健全化）  
**完了条件:** フラグで ON/OFF 可能、Kill Switch で 503 を返せる、Index 同期手順が整備

---

## 実行指示

### 1) Feature Flag 定義

**ファイル:** `src/lib/featureFlags.ts`

```ts
export function isSearchJaEnabled() {
  return process.env.SEARCH_JA_ENABLE === '1';
}
export function isSearchKillSwitchOn() {
  return process.env.SEARCH_KILL_SWITCH === '1';
}
```

### 2) API での適用（例：/api/search）

```ts
import { isSearchJaEnabled, isSearchKillSwitchOn } from '@/lib/featureFlags';
if (isSearchKillSwitchOn()) {
  return NextResponse.json({ error: 'Service Unavailable' }, { status: 503 });
}
// 検索機能自体の無効化（必要なら）
if (!isSearchJaEnabled()) {
  return NextResponse.json({ results: [] }, { status: 200 });
}
```

### 3) Index 同期（本番）

- 運用は `autoIndex=false`。デプロイ後にアプリケーションから `UserModel.syncIndexes()` を **一度だけ** 実行するジョブを用意（重複実行抑制）。

### 4) コミット

```bash
git add -A
git commit -m "ops(flags): add feature flags and kill switch for search"
```

---

## 注意

- フラグは **環境変数**で制御し、Config-as-Code（.env / CI）で管理。
