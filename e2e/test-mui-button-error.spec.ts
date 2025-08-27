import { test, expect } from '@playwright/test';

test.describe('MUI ListItem button属性エラー検証', () => {
  test('Boardページでのコンソールエラー確認', async ({ page }) => {
    const consoleErrors: string[] = [];
    
    // コンソールエラーを監視
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      } else if (msg.type() === 'warning') {
        consoleErrors.push(`Warning: ${msg.text()}`);
      }
    });

    // /boardにアクセス（認証が必要な場合はリダイレクト）
    await page.goto('http://localhost:3000/board');
    await page.waitForLoadState('networkidle');
    
    // 現在のURLを記録
    const currentUrl = page.url();
    console.log('現在のURL:', currentUrl);
    
    // サインインページにリダイレクトされた場合
    if (currentUrl.includes('/auth/signin')) {
      // テスト用ユーザーでログイン
      await page.fill('input[name="email"]', 'test@example.com');
      await page.fill('input[name="password"]', 'Test1234!');
      await page.click('button[type="submit"]');
      
      // ダッシュボードまたはboardページへの遷移を待つ
      await page.waitForURL(url => url.includes('/dashboard') || url.includes('/board'), { timeout: 10000 }).catch(() => {});
      
      // boardページへ移動
      await page.goto('http://localhost:3000/board');
      await page.waitForLoadState('networkidle');
    }
    
    // ページのタイトル確認
    const pageTitle = await page.title();
    console.log('ページタイトル:', pageTitle);
    
    // ListItemコンポーネントの存在確認
    const listItems = await page.locator('[class*="MuiListItem"]').count();
    console.log('ListItemコンポーネント数:', listItems);
    
    // button属性を持つListItem要素の存在確認（DOM属性として）
    const buttonListItems = await page.evaluate(() => {
      const items = document.querySelectorAll('[class*="MuiListItem"]');
      const itemsWithButton: any[] = [];
      items.forEach((item, index) => {
        if (item.hasAttribute('button')) {
          itemsWithButton.push({
            index,
            hasButton: true,
            buttonValue: item.getAttribute('button'),
            className: item.className,
            text: item.textContent?.trim().substring(0, 50)
          });
        }
      });
      return itemsWithButton;
    });
    
    console.log('button属性を持つListItem:', JSON.stringify(buttonListItems, null, 2));
    
    // エラーメッセージ検証
    const buttonAttributeErrors = consoleErrors.filter(err => 
      err.includes('Received `true` for a non-boolean attribute `button`') ||
      err.includes('AppLayout.tsx:149')
    );
    
    console.log('収集されたコンソールエラー:', consoleErrors);
    console.log('button属性関連エラー:', buttonAttributeErrors);
    
    // スクリーンショット取得
    await page.screenshot({ path: 'board-page-test.png', fullPage: true });
    
    // 証拠データ
    return {
      url: page.url(),
      title: pageTitle,
      listItemCount: listItems,
      buttonListItems,
      consoleErrors,
      buttonAttributeErrors,
      timestamp: new Date().toISOString()
    };
  });
});