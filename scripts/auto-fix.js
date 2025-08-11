#!/usr/bin/env node

/**
 * 自動修正ループスクリプト
 * Playwrightを使用して問題を検出し、自動的に修正を適用
 */

const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

// 修正戦略のリスト
const FIX_STRATEGIES = [
  {
    name: 'CSS Transform Reset',
    description: 'すべてのtransformを無効化',
    apply: async (page) => {
      await page.addStyleTag({
        content: `
          * { transform: none !important; }
          .MuiDrawer-root { z-index: 2147483647 !important; }
        `
      });
    }
  },
  {
    name: 'Force Fixed Position',
    description: 'position: fixedを強制',
    apply: async (page) => {
      await page.addStyleTag({
        content: `
          .MuiDrawer-root, .MuiModal-root {
            position: fixed !important;
            z-index: 2147483647 !important;
            top: 0 !important;
            left: 0 !important;
            right: 0 !important;
            bottom: 0 !important;
          }
        `
      });
    }
  },
  {
    name: 'Isolation Strategy',
    description: 'isolationを使用してスタッキングコンテキストを分離',
    apply: async (page) => {
      await page.addStyleTag({
        content: `
          main, .MuiContainer-root { isolation: isolate !important; }
          .MuiDrawer-root { z-index: 2147483647 !important; }
        `
      });
    }
  },
  {
    name: 'JavaScript DOM Manipulation',
    description: 'JavaScriptで直接DOM操作',
    apply: async (page) => {
      await page.evaluate(() => {
        const menu = document.querySelector('.MuiDrawer-root, .MuiModal-root');
        if (menu) {
          document.body.appendChild(menu);
          menu.style.zIndex = '2147483647';
        }
      });
    }
  },
  {
    name: 'Remove Parent Transforms',
    description: '親要素のtransformを削除',
    apply: async (page) => {
      await page.evaluate(() => {
        const menu = document.querySelector('.MuiDrawer-root, .MuiModal-root');
        if (menu) {
          let parent = menu.parentElement;
          while (parent && parent !== document.body) {
            parent.style.transform = 'none';
            parent = parent.parentElement;
          }
        }
      });
    }
  },
  {
    name: 'Native Portal Implementation',
    description: 'ネイティブPortal実装',
    apply: async (page) => {
      await page.evaluate(() => {
        const menu = document.querySelector('.MuiDrawer-root, .MuiModal-root');
        if (menu) {
          const portal = document.createElement('div');
          portal.id = 'menu-portal';
          portal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            z-index: 2147483647;
            pointer-events: auto;
          `;
          portal.appendChild(menu);
          document.body.appendChild(portal);
        }
      });
    }
  }
];

async function detectProblem(page) {
  return await page.evaluate(() => {
    const menu = document.querySelector('.MuiDrawer-root, .MuiModal-root, [role="presentation"]');
    const content = document.querySelector('.MuiPaper-root, .MuiCard-root');
    
    if (!menu) {
      return { hasProblem: true, description: 'メニューが見つかりません' };
    }
    
    const menuStyles = window.getComputedStyle(menu);
    const menuZ = parseInt(menuStyles.zIndex) || 0;
    const contentZ = content ? parseInt(window.getComputedStyle(content).zIndex) || 0 : 0;
    
    if (menuZ <= contentZ) {
      return { 
        hasProblem: true, 
        description: `z-indexが不適切: menu=${menuZ}, content=${contentZ}` 
      };
    }
    
    // 実際の表示位置を確認
    const rect = menu.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const topElement = document.elementFromPoint(centerX, centerY);
    
    if (!menu.contains(topElement)) {
      return { 
        hasProblem: true, 
        description: `メニューが他の要素に隠れています: ${topElement?.tagName}` 
      };
    }
    
    // 親要素のスタッキングコンテキストをチェック
    let parent = menu.parentElement;
    while (parent && parent !== document.body) {
      const styles = window.getComputedStyle(parent);
      if (styles.transform !== 'none' || 
          styles.opacity !== '1' || 
          styles.filter !== 'none') {
        return { 
          hasProblem: true, 
          description: `親要素にスタッキングコンテキストが存在: ${parent.tagName}` 
        };
      }
      parent = parent.parentElement;
    }
    
    return { hasProblem: false, description: 'メニューは正しく表示されています' };
  });
}

async function autoFix() {
  console.log('🚀 自動修正ループを開始します...\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    devtools: true 
  });
  
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15'
  });
  
  const page = await context.newPage();
  
  try {
    // ログイン
    console.log('📱 ログイン中...');
    await page.goto('http://localhost:3000/auth/signin');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'Test123!@#');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(board|$)/);
    console.log('✅ ログイン成功\n');
    
    // メニューを開く
    await page.goto('http://localhost:3000/board');
    await page.click('[aria-label="menu"]');
    await page.waitForTimeout(1000);
    
    // 初期状態を確認
    console.log('🔍 初期状態を確認中...');
    let problem = await detectProblem(page);
    console.log(`状態: ${problem.description}\n`);
    
    if (!problem.hasProblem) {
      console.log('✅ 問題は既に解決されています！');
      await browser.close();
      return;
    }
    
    // 各修正戦略を試行
    for (let i = 0; i < FIX_STRATEGIES.length; i++) {
      const strategy = FIX_STRATEGIES[i];
      console.log(`\n🔧 修正戦略 ${i + 1}/${FIX_STRATEGIES.length}: ${strategy.name}`);
      console.log(`   ${strategy.description}`);
      
      // 修正を適用
      await strategy.apply(page);
      await page.waitForTimeout(500);
      
      // 結果を確認
      problem = await detectProblem(page);
      console.log(`   結果: ${problem.description}`);
      
      if (!problem.hasProblem) {
        console.log('\n🎉 問題が解決されました！');
        console.log(`   成功した戦略: ${strategy.name}`);
        
        // 成功した修正をファイルに保存
        await saveSuccessfulFix(strategy);
        
        // スクリーンショットを保存
        await page.screenshot({ 
          path: 'tests/screenshots/menu-fixed.png', 
          fullPage: true 
        });
        
        break;
      }
    }
    
    if (problem.hasProblem) {
      console.log('\n❌ すべての修正戦略が失敗しました');
      console.log('   より深い調査が必要です');
      
      // 詳細なデバッグ情報を収集
      await collectDebugInfo(page);
    }
    
  } catch (error) {
    console.error('エラーが発生しました:', error);
  } finally {
    // ブラウザを開いたままにして手動確認可能にする
    console.log('\n📝 ブラウザは開いたままです。手動で確認してください。');
    console.log('   終了するにはCtrl+Cを押してください。');
    
    // 無限ループで待機
    await new Promise(() => {});
  }
}

async function saveSuccessfulFix(strategy) {
  const fixCode = `
// 成功した修正戦略: ${strategy.name}
// ${strategy.description}

export function applyFix() {
  ${strategy.apply.toString()}
}
`;
  
  const fixPath = path.join(__dirname, '../src/utils/menu-fix.js');
  fs.writeFileSync(fixPath, fixCode);
  console.log(`   修正コードを保存しました: ${fixPath}`);
}

async function collectDebugInfo(page) {
  const debugInfo = await page.evaluate(() => {
    const info = {
      menu: null,
      allZIndexes: [],
      stackingContexts: []
    };
    
    const menu = document.querySelector('.MuiDrawer-root, .MuiModal-root');
    if (menu) {
      const styles = window.getComputedStyle(menu);
      info.menu = {
        tag: menu.tagName,
        class: menu.className,
        zIndex: styles.zIndex,
        position: styles.position,
        parent: menu.parentElement?.tagName
      };
    }
    
    // すべての要素のz-indexを収集
    document.querySelectorAll('*').forEach(el => {
      const z = window.getComputedStyle(el).zIndex;
      if (z !== 'auto' && parseInt(z) > 0) {
        info.allZIndexes.push({
          tag: el.tagName,
          class: el.className,
          zIndex: z
        });
      }
    });
    
    return info;
  });
  
  const debugPath = path.join(__dirname, '../tests/debug-info.json');
  fs.writeFileSync(debugPath, JSON.stringify(debugInfo, null, 2));
  console.log(`\n📄 デバッグ情報を保存しました: ${debugPath}`);
}

// メイン実行
if (require.main === module) {
  autoFix().catch(console.error);
}

module.exports = { autoFix, detectProblem };