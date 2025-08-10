
#!/usr/bin/env node

const puppeteer = require('puppeteer');

async function measurePerformance() {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  // パフォーマンス測定を有効化
  await page.evaluateOnNewDocument(() => {
    window.performanceData = [];
  });
  
  // メール確認ページのパフォーマンス測定
  console.log('📊 メール確認ページのパフォーマンス測定...');
  
  const verifyUrl = 'http://localhost:3000/auth/verify-email?token=test';
  
  const metrics = await page.evaluate(() => {
    return JSON.stringify(performance.getEntriesByType('navigation')[0], null, 2);
  });
  
  await page.goto(verifyUrl, { waitUntil: 'networkidle0' });
  
  const performanceMetrics = await page.metrics();
  
  console.log('メトリクス:', {
    'DOM構築時間': performanceMetrics.TaskDuration,
    'スクリプト実行時間': performanceMetrics.ScriptDuration,
    'レイアウト時間': performanceMetrics.LayoutDuration,
    'メモリ使用量': Math.round(performanceMetrics.JSHeapUsedSize / 1024 / 1024) + 'MB'
  });
  
  await browser.close();
}

measurePerformance().catch(console.error);
