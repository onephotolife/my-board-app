import { test, expect } from '@playwright/test';

const routes = ['/', '/tags/%E6%9D%B1%E4%BA%AC', '/dashboard'];

for (const route of routes) {
  test(`global header is removed on ${route}`, async ({ page }) => {
    await page.goto(route);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('[role="banner"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="global-banner"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="app-header"]')).toHaveCount(0);
  });
}
