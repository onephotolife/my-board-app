// Lighthouse自動テストスクリプト
// 使用方法: node scripts/lighthouse-test.js https://your-domain.com

const fs = require('fs');
const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');

const URL = process.argv[2] || 'https://your-domain.com';
const REPORT_DIR = `./test-reports/lighthouse-${new Date().toISOString().split('T')[0]}`;

// レポートディレクトリ作成
if (!fs.existsSync(REPORT_DIR)) {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
}

// Lighthouse設定
const config = {
  extends: 'lighthouse:default',
  settings: {
    onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
    formFactor: 'desktop',
    screenEmulation: {
      mobile: false,
      width: 1920,
      height: 1080,
      deviceScaleFactor: 1,
      disabled: false
    },
    throttling: {
      rttMs: 40,
      throughputKbps: 10240,
      cpuSlowdownMultiplier: 1
    }
  }
};

// 目標スコア
const targetScores = {
  performance: 90,
  accessibility: 95,
  'best-practices': 95,
  seo: 90
};

async function runLighthouse() {
  console.log(`\n🚀 Lighthouse テスト開始: ${URL}\n`);
  
  // Chrome起動
  const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless'] });
  
  try {
    // デスクトップテスト
    console.log('📱 デスクトップテスト実行中...');
    const desktopResult = await lighthouse(URL, {
      port: chrome.port,
      output: ['html', 'json'],
      ...config
    });
    
    // モバイルテスト
    console.log('📱 モバイルテスト実行中...');
    const mobileConfig = {
      ...config,
      settings: {
        ...config.settings,
        formFactor: 'mobile',
        screenEmulation: {
          mobile: true,
          width: 375,
          height: 667,
          deviceScaleFactor: 2,
          disabled: false
        }
      }
    };
    
    const mobileResult = await lighthouse(URL, {
      port: chrome.port,
      output: ['html', 'json'],
      ...mobileConfig
    });
    
    // レポート保存
    fs.writeFileSync(`${REPORT_DIR}/desktop-report.html`, desktopResult.report[0]);
    fs.writeFileSync(`${REPORT_DIR}/desktop-report.json`, desktopResult.report[1]);
    fs.writeFileSync(`${REPORT_DIR}/mobile-report.html`, mobileResult.report[0]);
    fs.writeFileSync(`${REPORT_DIR}/mobile-report.json`, mobileResult.report[1]);
    
    // スコア表示
    console.log('\n📊 テスト結果:\n');
    console.log('=== デスクトップ ===');
    displayScores(desktopResult.lhr);
    
    console.log('\n=== モバイル ===');
    displayScores(mobileResult.lhr);
    
    // Core Web Vitals表示
    console.log('\n⚡ Core Web Vitals (デスクトップ):');
    displayWebVitals(desktopResult.lhr);
    
    console.log('\n⚡ Core Web Vitals (モバイル):');
    displayWebVitals(mobileResult.lhr);
    
    // 改善提案
    console.log('\n💡 改善提案:');
    displayOpportunities(desktopResult.lhr);
    
    // テスト結果の判定
    const passed = checkScores(desktopResult.lhr);
    
    console.log('\n' + '='.repeat(50));
    if (passed) {
      console.log('✅ すべてのテストに合格しました！');
    } else {
      console.log('❌ 一部のテストが目標スコアを下回りました。');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('エラー:', error);
    process.exit(1);
  } finally {
    await chrome.kill();
  }
}

function displayScores(lhr) {
  Object.keys(targetScores).forEach(category => {
    const score = Math.round(lhr.categories[category].score * 100);
    const target = targetScores[category];
    const passed = score >= target;
    const emoji = passed ? '✅' : '❌';
    const color = passed ? '\x1b[32m' : '\x1b[31m';
    const reset = '\x1b[0m';
    
    console.log(`${emoji} ${category}: ${color}${score}${reset}/100 (目標: ${target})`);
  });
}

function displayWebVitals(lhr) {
  const metrics = {
    'First Contentful Paint': lhr.audits['first-contentful-paint'],
    'Largest Contentful Paint': lhr.audits['largest-contentful-paint'],
    'Total Blocking Time': lhr.audits['total-blocking-time'],
    'Cumulative Layout Shift': lhr.audits['cumulative-layout-shift'],
    'Speed Index': lhr.audits['speed-index']
  };
  
  Object.entries(metrics).forEach(([name, audit]) => {
    if (audit) {
      const value = audit.displayValue || audit.numericValue;
      const score = audit.score;
      const emoji = score >= 0.9 ? '🟢' : score >= 0.5 ? '🟡' : '🔴';
      console.log(`${emoji} ${name}: ${value}`);
    }
  });
}

function displayOpportunities(lhr) {
  const opportunities = Object.values(lhr.audits)
    .filter(audit => audit.details && audit.details.type === 'opportunity')
    .filter(audit => audit.score < 0.9)
    .sort((a, b) => (b.details.overallSavingsMs || 0) - (a.details.overallSavingsMs || 0))
    .slice(0, 5);
  
  if (opportunities.length === 0) {
    console.log('🎉 大きな改善点は見つかりませんでした！');
    return;
  }
  
  opportunities.forEach(opportunity => {
    const savings = opportunity.details.overallSavingsMs;
    if (savings > 0) {
      console.log(`• ${opportunity.title}: ${Math.round(savings)}ms削減可能`);
    } else {
      console.log(`• ${opportunity.title}`);
    }
  });
}

function checkScores(lhr) {
  return Object.keys(targetScores).every(category => {
    const score = Math.round(lhr.categories[category].score * 100);
    return score >= targetScores[category];
  });
}

// 実行
runLighthouse().catch(console.error);