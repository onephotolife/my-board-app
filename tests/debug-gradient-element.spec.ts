import { test } from '@playwright/test';

test('グラデーション背景要素のデバッグ', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto('http://localhost:3000');
  
  // ページの読み込み完了を待機
  await page.waitForSelector('main', { timeout: 30000 });
  await page.waitForTimeout(2000);
  
  // グラデーション背景を持つ新規登録関連要素を詳細に調査
  const gradientElements = await page.evaluate(() => {
    const results = [];
    const allElements = Array.from(document.querySelectorAll('*'));
    
    allElements.forEach((el, index) => {
      const style = window.getComputedStyle(el);
      const text = el.textContent || '';
      const background = style.background || style.backgroundImage;
      
      // グラデーション背景かつ新規登録テキストを含む要素を検索
      if ((background.includes('rgb(99, 102, 241)') || background.includes('#6366f1')) &&
          (background.includes('rgb(139, 92, 246)') || background.includes('#8b5cf6')) &&
          text.includes('新規登録')) {
        
        const rect = el.getBoundingClientRect();
        results.push({
          index,
          tagName: el.tagName.toLowerCase(),
          className: el.className,
          id: el.id || 'no-id',
          href: el.getAttribute('href'),
          text: text.substring(0, 50),
          background: background.substring(0, 100),
          position: {
            x: rect.left,
            y: rect.top,
            width: rect.width,
            height: rect.height
          },
          display: style.display,
          visibility: style.visibility,
          opacity: style.opacity,
          parent: el.parentElement?.tagName.toLowerCase() || 'no-parent',
          parentClass: el.parentElement?.className || 'no-parent-class'
        });
      }
    });
    
    return results;
  });
  
  console.log('🔍 グラデーション背景を持つ新規登録要素:', JSON.stringify(gradientElements, null, 2));
  
  // 親要素も調査
  for (const element of gradientElements) {
    console.log(`\n要素詳細: ${element.tagName}[${element.className}]`);
    console.log(`位置: ${element.position.x}, ${element.position.y}, ${element.position.width}x${element.position.height}`);
    console.log(`親要素: ${element.parent}[${element.parentClass}]`);
  }
});