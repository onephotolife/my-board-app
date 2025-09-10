# STEP 99 — Rescue & Guard（Codex 停止時の復旧と再実行ガード）

**目的:** codex がタイムアウト/停止・不適切な変更（tsconfig変更・型宣言削除等）を行った状態から**安全に復旧**し、
**Serena 起動→Codex 実行**の順序を強制するためのガードを導入する。

> この手順は **リポジトリのルート**で実行してください。  
> 以降は **Node 20** を標準（CI も）として固定します。

---

## A. 事前アクティベート（Serena → Codex）

### 推奨: ラッパースクリプトで常に Serena を先に

**ファイル:** `scripts/codex-with-serena.sh`

```bash
#!/usr/bin/env bash
set -Eeuo pipefail
ACTIVATE_CMD="${SERENA_ACTIVATE_CMD:-/serena-activate}"

if ! command -v codex >/dev/null 2>&1; then
  echo "[codex-with-serena] ERROR: 'codex' CLI not found" >&2
  exit 127
fi

echo "[codex-with-serena] Activating Serena: ${ACTIVATE_CMD}"
if ! eval "${ACTIVATE_CMD}"; then
  echo "[codex-with-serena] ERROR: Serena activation failed" >&2
  exit 1
fi

readiness_wait() {
  local max_wait="${SERENA_MAX_WAIT_SECONDS:-120}"
  echo "[codex-with-serena] Waiting for Serena readiness ..."
  if [[ -n "${SERENA_HEALTH_URL:-}" ]]; then
    local deadline=$(( $(date +%s) + max_wait ))
    while true; do
      if curl -fsS "${SERENA_HEALTH_URL}" >/dev/null 2>&1; then
        echo "[codex-with-serena] Serena health OK: ${SERENA_HEALTH_URL}"; break
      fi
      if (( $(date +%s) >= deadline )); then
        echo "[codex-with-serena] WARNING: health URL not ready within ${max_wait}s" >&2; break
      fi
      sleep 2
    done
    return 0
  fi
  if command -v serena >/dev/null 2>&1; then
    local deadline=$(( $(date +%s) + max_wait ))
    while true; do
      if serena status >/dev/null 2>&1; then
        echo "[codex-with-serena] Serena status OK"; break
      fi
      if (( $(date +%s) >= deadline )); then
        echo "[codex-with-serena] WARNING: 'serena status' not ready within ${max_wait}s" >&2; break
      fi
      sleep 2
    done
    return 0
  fi
  sleep 5
  echo "[codex-with-serena] Proceeding after fallback wait"
}

readiness_wait
echo "[codex-with-serena] Delegating to: codex $*"
exec codex "$@"
```

**作成/権限付与**

```bash
mkdir -p scripts
cat > scripts/codex-with-serena.sh <<'SH'
#!/usr/bin/env bash
set -Eeuo pipefail
ACTIVATE_CMD="${SERENA_ACTIVATE_CMD:-/serena-activate}"
if ! command -v codex >/dev/null 2>&1; then echo "[codex-with-serena] ERROR: 'codex' CLI not found" >&2; exit 127; fi
echo "[codex-with-serena] Activating Serena: ${ACTIVATE_CMD}"
if ! eval "${ACTIVATE_CMD}"; then echo "[codex-with-serena] ERROR: Serena activation failed" >&2; exit 1; fi
readiness_wait() {
  local max_wait="${SERENA_MAX_WAIT_SECONDS:-120}"
  echo "[codex-with-serena] Waiting for Serena readiness ..."
  if [[ -n "${SERENA_HEALTH_URL:-}" ]]; then
    local deadline=$(( $(date +%s) + max_wait ))
    while true; do
      if curl -fsS "${SERENA_HEALTH_URL}" >/dev/null 2>&1; then echo "[codex-with-serena] Serena health OK: ${SERENA_HEALTH_URL}"; break; fi
      if (( $(date +%s) >= deadline )); then echo "[codex-with-serena] WARNING: health URL not ready within ${max_wait}s" >&2; break; fi
      sleep 2
    done; return 0
  fi
  if command -v serena >/dev/null 2>&1; then
    local deadline=$(( $(date +%s) + max_wait ))
    while true; do
      if serena status >/dev/null 2>&1; then echo "[codex-with-serena] Serena status OK"; break; fi
      if (( $(date +%s) >= deadline )); then echo "[codex-with-serena] WARNING: 'serena status' not ready within ${max_wait}s" >&2; break; fi
      sleep 2
    done; return 0
  fi
  sleep 5; echo "[codex-with-serena] Proceeding after fallback wait"
}
readiness_wait
echo "[codex-with-serena] Delegating to: codex $*"
exec codex "$@"
SH
chmod +x scripts/codex-with-serena.sh
```

**使い方**

```bash
./scripts/codex-with-serena.sh run < prompts/step-00-prep.md
```

---

## B. Git/環境のサニティチェック（停止時のよくある原因）

```bash
# 1) リポジトリ直下か？
pwd && git rev-parse --is-inside-work-tree

# 2) ブランチが壊れていないか？（feat/search-phase2-ui を作成/切替）
test -f .git/refs/heads/feat && mv .git/refs/heads/feat ".git/refs/heads/feat.bak.$(date +%s)" || true
git checkout -B "feat/search-phase2-ui"

# 3) Node を 20 に固定（nvm / volta / engines のいずれか）
echo "20" > .nvmrc
node -v || true  # ローカルで nvm use 20 を推奨
```

> ログの `unable to create directory for .git/refs/heads/feat/ search-phase2-ui` は、**refs にファイルが存在**する/改行混入などが原因です。上記で退避→再作成します。

---

## C. 不適切な差分の巻き戻しと正規化（tsconfig・auth 型）

**目的:** Phase 1/2 の方針に合わせて **型設定を厳格化**し、codex による `skipLibCheck=true` や型削除を**元に戻す**。

### 1) tsconfig を安定構成に復旧

```bash
apply_patch << 'PATCH'
*** Begin Patch
*** Update File: tsconfig.json
@@
-  "compilerOptions": {
-    "target": "ES2021",
-    "lib": ["ES2021", "DOM"],
-    "allowJs": true,
-    "skipLibCheck": true,
-    "strict": true,
-    "noEmit": true,
-    "esModuleInterop": true,
-    "module": "ESNext",
-    "moduleResolution": "Bundler",
-    "resolveJsonModule": true,
-    "isolatedModules": true,
-    "jsx": "preserve",
-    "incremental": true,
-    "plugins": [{ "name": "next" }],
-    "paths": { "@/*": ["./src/*"] }
-  },
-  "include": ["next-env.d.ts", "src/**/*.ts", "src/**/*.tsx", ".next/types/**/*.ts"],
-  "exclude": [
+  "compilerOptions": {
+    "strict": true,
+    "skipLibCheck": false,
+    "target": "ES2021",
+    "module": "ESNext",
+    "moduleResolution": "Bundler",
+    "jsx": "preserve",
+    "lib": ["ES2021", "DOM"],
+    "noUncheckedIndexedAccess": true,
+    "noImplicitOverride": true,
+    "exactOptionalPropertyTypes": true,
+    "resolveJsonModule": true,
+    "esModuleInterop": true,
+    "forceConsistentCasingInFileNames": true,
+    "incremental": true,
+    "plugins": [{ "name": "next" }],
+    "paths": { "@/*": ["./src/*"] }
+  },
+  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
+  "exclude": [
     "node_modules",
-    "__tests__/**",
-    "tests/**",
-    "e2e/**",
-    "scripts/**",
-    "coverage/**",
     "**/node_modules_old/**",
     "**/node_modules_backup_*/**",
     "archive/**",
     "docs/**",
     "**/*.bak.ts",
     "**/*.bak.tsx"
   ]
 }
*** End Patch
PATCH
```

### 2) next-auth 型宣言を復旧（Module Augmentation）

```bash
apply_patch << 'PATCH'
*** Begin Patch
*** Add File: types/next-auth.d.ts
+import NextAuth from "next-auth";
+declare module "next-auth" {
+  interface Session {
+    user?: {
+      id?: string;
+      email?: string;
+      name?: string;
+      emailVerified?: boolean;
+    };
+  }
+}
*** End Patch
PATCH
```

### 3) 認証ヘルパの型破れ修正（NextRequest を再インポート）

```bash
apply_patch << 'PATCH'
*** Begin Patch
*** Update File: src/lib/auth/getUserFromRequest.ts
@@
-import { getToken } from "next-auth/jwt";
+import { NextRequest } from "next/server";
+import { getToken } from "next-auth/jwt";

 export async function getUserFromRequest(req: NextRequest) {
   const token = await getToken({ req });
   if (!token) return null;
   return {
     id: (token as any).id ?? (token as any).sub ?? undefined,
   };
 }
*** End Patch
PATCH
```

### 4) Node バージョンのピン留め（任意・推奨）

```bash
apply_patch << 'PATCH'
*** Begin Patch
*** Update File: package.json
@@
   "engines": {
-    "node": ">=18"
+    "node": ">=20 <21"
   },
*** End Patch
PATCH
```

> `package.json` に `engines` がない場合は、上記パッチが失敗することがあります。その場合はスキップし、 `.nvmrc` で固定してください。

### 5) コミット

```bash
git add -A
git commit -m "fix(rescue): restore strict tsconfig & next-auth types; reimport NextRequest; pin Node 20; add serena wrapper"
```

---

## D. 検証と再開

```bash
# 型検査（赤なら、その場で修正してから先へ）
npm run typecheck || true

# 開発サーバ健全性
npm run dev &
sleep 5
curl -fsS http://localhost:3000/api/health || true
pkill -f "next" || true
```

---

## E. 以降の実行は「Serena → Codex」の順序を**ラッパー**で固定

```bash
./scripts/codex-with-serena.sh run < prompts/step-01-tsconfig-and-auth.md   # 既に復旧済みなら step-02 へ
./scripts/codex-with-serena.sh run < prompts/step-02-logging-and-runtime.md
./scripts/codex-with-serena.sh run < prompts/step-03-validation-and-rate-limit.md
./scripts/codex-with-serena.sh run < prompts/step-04-search-ui-implementation.md
# ...（以降同様）
```

---

## F. よくある停止原因と対処

- **タイムアウト/サンドボックス制限** → 小さめの md を順番に実行（STEP をさらに分割）、`tee` でログ保存。
- **コンテキスト超過** → 直前の出力をクリアし、**短い md** を投下。`apply_patch` の差分だけに絞る。
- **Node 22 × Artillery/oclif の ESM 不整合** → CI/ローカルともに Node 20 固定。
- **Git ブランチ作成失敗** → `.git/refs/heads/feat` が**ファイル**の場合に発生。退避して `git checkout -B`。
