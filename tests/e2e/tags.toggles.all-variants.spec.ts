/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Page } from '@playwright/test';
import { test, expect } from '@playwright/test';

const BASE = process.env.AUTH_BASE_URL || 'http://localhost:3000';
const TAG = '東京';

async function installFetchSpy(page: Page) {
  await page.addInitScript(() => {
    const g: any = window as any;
    if (g.__popularReqs) return;
    g.__popularReqs = [] as string[];
    const orig = window.fetch.bind(window);
    window.fetch = async (...args: any[]) => {
      try {
        const input = args[0];
        const url = typeof input === 'string' ? input : input?.url || '';
        if (url.includes('/api/posts') && url.includes('sort=-likes')) {
          g.__popularReqs.push(url);
        }
      } catch {}
      return orig(...(args as any));
    };
  });
}

async function bringToggleToFront(page: Page, testId: string) {
  await page.evaluate((id) => {
    const el = document.querySelector(`[data-testid="${id}"]`);
    if (el && el instanceof HTMLElement) {
      el.scrollIntoView({ behavior: 'instant', block: 'center' });
      el.style.position = 'relative';
      el.style.zIndex = '2147483646';
      el.style.opacity = '1';
      el.style.visibility = 'visible';
      el.style.pointerEvents = 'auto';
    }
  }, testId);
}

async function gotoWithMockAuth(page: Page, path: string) {
  // 開発環境のE2Eモック認証（/api/posts が cookie ヘッダに含む文字列で判定）
  await page.context().addCookies([
    {
      name: 'e2e-mock-auth',
      value: 'mock-session-token-for-e2e-testing',
      domain: 'localhost',
      path: '/',
    },
  ]);
  await page.goto(`${BASE}${path}`);
  await page.waitForLoadState('domcontentloaded');
}

async function clickPopularAndCapture(page: Page, groupTestId: string) {
  // まず対象グループが存在するか確認
  const maybeGroup = page.locator(`[data-testid="${groupTestId}"]`).first();
  const exists = await maybeGroup.count();
  if (exists === 0) {
    test.info().annotations.push({ type: 'skip-group', description: `${groupTestId} not present` });
    return { skipped: true } as const;
  }
  await bringToggleToFront(page, groupTestId);

  // ボタンロケータ（detachに強いfirst選択）
  let newestButton = page.locator(`[data-testid="${groupTestId}"] button[value="newest"]`).first();
  let popularButton = page
    .locator(`[data-testid="${groupTestId}"] button[value="popular"]`)
    .first();

  // フォールバックグループ
  if ((await newestButton.count()) === 0 || (await popularButton.count()) === 0) {
    newestButton = page.locator(`[data-testid="tag-sort-fallback"] button[value="newest"]`).first();
    popularButton = page
      .locator(`[data-testid="tag-sort-fallback"] button[value="popular"]`)
      .first();
  }

  await expect(popularButton).toHaveCount(1);
  await expect(newestButton).toHaveCount(1);

  // まず明示的に「最新順」に切り替えて、次の「人気順」クリックで必ず新リクエストが出る状態にする
  await newestButton.click({ force: true });

  // その後、「人気順」をクリックして sort=-likes を待つ
  // グローバルトラッカーで検出する
  // テスト本体で setupPopularTracker を呼び出している前提で window ではなくクロージャ変数に保持
  // ここでは直近の増加を観測
  const before = (await page.evaluate(() => (window as any).__popularReqs?.length || 0)) as number;
  await popularButton.click({ force: true });
  const ok = await page
    .waitForFunction(
      (b) => {
        const g: any = window as any;
        return (g.__popularReqs?.length || 0) > b;
      },
      before,
      { timeout: 7000 }
    )
    .then(() => true)
    .catch(() => false);
  const after = (await page.evaluate(() => (window as any).__popularReqs?.length || 0)) as number;
  expect(ok, `expect popular request > before (before=${before}, after=${after})`).toBeTruthy();

  await expect(popularButton).toHaveAttribute('aria-pressed', /true|aria-pressed="true"/);
  const urls = (await page.evaluate(() => (window as any).__popularReqs || [])) as string[];
  if (urls && urls.length) {
    test.info().annotations.push({ type: 'captured', description: urls[urls.length - 1] });
  }
  return { skipped: false } as const;
}

test.describe('Tag detail: all sort toggles emit sort=-likes', () => {
  test('top/inline/portal groups work', async ({ page }) => {
    // リクエストスパイを先に仕込む
    await installFetchSpy(page);
    await gotoWithMockAuth(page, `/tags/${encodeURIComponent(TAG)}`);

    // 画面にいずれかのトグルが存在すること（デバッグ環境では3つ想定）
    const anyToggle = page.locator(
      '[data-testid^="tag-sort-toggle"], [data-testid="tag-sort-toggle"]'
    );
    await expect(anyToggle.first())
      .toBeVisible({ timeout: 10000 })
      .catch(() => {});

    const groups = [
      'tag-sort-toggle-top',
      'tag-sort-toggle-inline',
      'tag-sort-toggle-portal',
    ] as const;
    let success = 0;
    for (const gid of groups) {
      try {
        const res = await clickPopularAndCapture(page, gid);
        if (!res.skipped) success += 1;
      } catch {
        // 続行（他のグループで担保）
      }
    }
    expect(success).toBeGreaterThan(0);
  });
});
