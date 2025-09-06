import { test, expect } from '@playwright/test';

test.describe('Tags page desktop layout', () => {
  test.use({ viewport: { width: 1280, height: 900 }, isMobile: false });

  test('Sidebar is not full-screen and main content is visible/clickable', async ({ page }) => {
    await page.goto('/tags/%E6%9D%B1%E4%BA%AC');

    // サイドバーの Drawer paper 要素を取得
    const sidebarPaper = page.locator('[data-testid="app-sidebar"] .MuiDrawer-paper');
    await expect(sidebarPaper).toBeVisible();

    const paperBox = await sidebarPaper.boundingBox();
    const viewport = page.viewportSize();

    expect(paperBox).not.toBeNull();
    if (!paperBox || !viewport) return; // TS的ガード

    // 幅が 100vw ではなく、概ね 280px であること
    expect(paperBox.width).toBeGreaterThanOrEqual(260);
    expect(paperBox.width).toBeLessThanOrEqual(300);
    expect(paperBox.width).toBeLessThan(viewport.width);

    // Backdrop は permanent なので存在しない（オーバーレイでない）
    await expect(page.locator('.MuiBackdrop-root')).toHaveCount(0);

    // メインコンテンツが見えておりクリック可能（ソートトグル操作）
    const sortToggle = page.locator('[data-testid="tag-sort-toggle"]');
    await expect(sortToggle).toBeVisible();

    const popularBtn = page.getByRole('button', { name: 'popular posts' });
    await popularBtn.click();
    await expect(popularBtn).toHaveAttribute('aria-pressed', 'true');
  });
});
