# STEP 01 — tsconfig 是正 & next-auth v4 統一（Codex 実行用）

**目的:** 型門番の復活（strict / skipLibCheck=false / ES2021+）と認証の一本化  
**完了条件:** `npm run typecheck` が通るか、**残るエラーが本ステップの範囲外に限定**されている

---

## 実行指示

### 1) `tsconfig.json` を更新

**ファイル:** `tsconfig.json`（既存に追記/修正）

```jsonc
{
  "compilerOptions": {
    "strict": true,
    "skipLibCheck": false,
    "target": "ES2021",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "jsx": "preserve",
    "lib": ["ES2021", "DOM"],
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "exactOptionalPropertyTypes": true,
  },
  "exclude": [
    "node_modules",
    "**/node_modules_old/**",
    "**/node_modules_backup_*/**",
    "archive/**",
    "docs/**",
    "**/*.bak.ts",
    "**/*.bak.tsx",
  ],
}
```

### 2) next-auth v4 に統一（@auth/\* 参照を排除）

**ファイル（新規）:** `types/next-auth.d.ts`

```ts
import NextAuth from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user?: {
      id?: string;
      email?: string;
      name?: string;
      emailVerified?: boolean;
    };
  }
}
```

**ファイル（新規/上書き）:** `src/lib/auth/getUserFromRequest.ts`

```ts
import { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function getUserFromRequest(req: NextRequest) {
  const token = await getToken({ req });
  if (!token) return null;
  return {
    id: (token as any).id ?? (token as any).sub ?? undefined,
    email: (token as any).email as string | undefined,
    name: (token as any).name as string | undefined,
    emailVerified: Boolean((token as any).emailVerified ?? true),
  };
}
```

> ルール: 以後、API ルートから直接 `getToken` を呼ばず、**このヘルパのみ**経由。

### 3) 型チェック

```bash
npm run typecheck || true
```

### 4) コミット

```bash
git add -A
git commit -m "chore(ts): strict/skipLibCheck=false; feat(auth): unify next-auth usage with helper"
```

---

## 注意点

- ここで `tsc` が赤のままでも、**本ステップの変更が原因でないエラー**は次ステップで潰します。
