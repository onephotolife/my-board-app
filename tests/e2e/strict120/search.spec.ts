import { test, expect } from '@playwright/test';

const SEARCH_PATH = '/search?q=%E3%82%84%E3%81%BE';

test.describe('ユーザー検索 UI', () => {
  test('サジェスト選択と検索結果表示', async ({ page }) => {
    await page.goto(SEARCH_PATH);

    const input = page.getByRole('combobox', { name: 'ユーザーを検索' });
    await expect(input).toBeVisible();

    await input.fill('やま');
    await page.waitForSelector('[role="listbox"]');

    await input.press('ArrowDown');
    await input.press('Enter');

    await expect(page.getByText('検索結果がありません').first()).not.toBeVisible({ timeout: 2000 });
    await expect(page.getByText('おすすめユーザー')).toBeVisible();
  });

  test('履歴チップのクリックで検索が実行される', async ({ page }) => {
    await page.goto('/search');
    await expect(page.getByText('最近の検索')).toBeVisible();

    const historyChip = page.getByRole('button', { name: /やま/ }).first();
    await historyChip.click();
    await expect(page).toHaveURL(/q=/);
  });
});
