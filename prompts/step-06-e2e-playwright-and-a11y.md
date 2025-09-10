# STEP 06 — Playwright E2E + a11y（axe）+ テスト専用認証（Codex 実行用）

**目的:** 実UIで IME 抑制 / Abort / 履歴 / a11y を検証し、回帰を防止  
**完了条件:** `npx playwright test` が緑（必要なら E2E_TEST_MODE=1 で擬似認証）

---

## 実行指示

### 1) 依存追加（必要に応じて）

```bash
npm i -D @playwright/test @axe-core/playwright
```

### 2) Playwright 設定

**ファイル:** `playwright.config.ts`

```ts
import { defineConfig } from '@playwright/test';
export default defineConfig({
  use: {
    headless: true,
    locale: 'ja-JP',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  reporter: [['list'], ['junit', { outputFile: 'reports/e2e-junit.xml' }]],
});
```

### 3) テスト専用認証（オプション: E2E_TEST_MODE=1）

**ファイル（新規）:** `src/lib/auth/testMode.ts`

```ts
import { NextRequest } from 'next/server';
import { getUserFromRequest } from './getUserFromRequest';

export async function getUserOrTest(req: NextRequest) {
  if (process.env.E2E_TEST_MODE === '1') {
    return { id: 'e2e-user', email: 'e2e@example.com', name: 'E2E', emailVerified: true };
  }
  return getUserFromRequest(req);
}
```

> API 側で `getUserFromRequest` の代わりに **`getUserOrTest`** を使用すると、CI で Secrets が無くても擬似認証で通せます。

### 4) E2E: IME/サジェスト/a11y

**ファイル:** `tests/e2e/search/ime-and-a11y.spec.ts`

```ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('IME中はサジェスト非表示→確定後に表示', async ({ page }) => {
  await page.goto('/search');
  const input = page.getByTestId('search-input');
  await input.focus();
  await input.dispatchEvent('compositionstart');
  await input.type('たな');
  await expect(page.getByTestId('suggest-list')).toBeHidden();
  await input.dispatchEvent('compositionend');
  await expect(page.getByTestId('suggest-list')).toBeVisible();
});

test('検索ページはaxe重大違反0', async ({ page }) => {
  await page.goto('/search');
  const res = await new AxeBuilder({ page }).analyze();
  expect(res.violations).toEqual([]);
});
```

### 5) 実行

```bash
# 開発サーバ起動
npm run start -- -p 3000 &
npx wait-on http://localhost:3000/api/health

# E2E_TEST_MODE=1 で擬似認証（必要に応じて）
E2E_TEST_MODE=1 npx playwright test
```

### 6) コミット

```bash
git add -A
git commit -m "test(e2e): add IME/axe specs and test-mode auth bypass"
```

---

## 注意

- 本番環境では `E2E_TEST_MODE` を **使用しない** こと（CI 専用の安全なフラグ）。
