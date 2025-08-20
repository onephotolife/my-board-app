#!/usr/bin/env node

/**
 * ドメイン可用性チェックスクリプト（API版）
 * 無料APIを使用してドメインの可用性を確認
 */

const https = require('https');
const dns = require('dns').promises;

// チェック対象ドメイン
const DOMAINS = [
  'myboard.jp',
  'boardhub.com',
  'postclub.com'
];

// 色付きコンソール出力
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

/**
 * HTTPSリクエストを送信
 */
function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    }).on('error', reject);
  });
}

/**
 * DNS解決チェック
 */
async function checkDNS(domain) {
  console.log(`${colors.blue}[DNS] ${domain} をチェック中...${colors.reset}`);
  
  try {
    // A レコードの解決を試みる
    const addresses = await dns.resolve4(domain);
    if (addresses.length > 0) {
      console.log(`  ${colors.red}✗ 使用中${colors.reset} - IP: ${addresses.join(', ')}`);
      return false;
    }
  } catch (error) {
    if (error.code === 'ENOTFOUND' || error.code === 'ENODATA') {
      console.log(`  ${colors.green}✓ DNS記録なし${colors.reset}`);
      return true;
    }
    console.log(`  ${colors.yellow}⚠ エラー: ${error.message}${colors.reset}`);
  }
  
  return null;
}

/**
 * RDAP (Registration Data Access Protocol) チェック
 * Whoisの代替となる標準プロトコル
 */
async function checkRDAP(domain) {
  console.log(`${colors.blue}[RDAP] ${domain} をチェック中...${colors.reset}`);
  
  const tld = domain.split('.').pop();
  let rdapUrl;
  
  // TLDごとのRDAPサーバー
  const rdapServers = {
    'com': 'https://rdap.verisign.com/com/v1/domain/',
    'net': 'https://rdap.verisign.com/net/v1/domain/',
    'jp': 'https://rdap.jprs.jp/rdap/domain/'
  };
  
  rdapUrl = rdapServers[tld];
  if (!rdapUrl) {
    console.log(`  ${colors.yellow}⚠ このTLDのRDAPサーバーが不明です${colors.reset}`);
    return null;
  }
  
  try {
    const response = await httpsGet(rdapUrl + domain);
    
    if (response.status === 200) {
      console.log(`  ${colors.red}✗ 登録済み${colors.reset}`);
      return false;
    } else if (response.status === 404) {
      console.log(`  ${colors.green}✓ 登録可能${colors.reset}`);
      return true;
    } else {
      console.log(`  ${colors.yellow}⚠ 不明なステータス: ${response.status}${colors.reset}`);
    }
  } catch (error) {
    console.log(`  ${colors.yellow}⚠ エラー: ${error.message}${colors.reset}`);
  }
  
  return null;
}

/**
 * HTTP/HTTPSアクセスチェック
 */
async function checkHTTP(domain) {
  console.log(`${colors.blue}[HTTP] ${domain} をチェック中...${colors.reset}`);
  
  try {
    // HTTPSでアクセスを試みる
    const response = await httpsGet(`https://${domain}`);
    
    if (response.status < 400) {
      console.log(`  ${colors.red}✗ ウェブサイト稼働中${colors.reset} (HTTPS: ${response.status})`);
      return false;
    }
  } catch (error) {
    // エラーの場合は利用可能と判断
    console.log(`  ${colors.green}✓ ウェブサイトなし${colors.reset}`);
    return true;
  }
  
  return true;
}

/**
 * ドメインチェックのメイン処理
 */
async function checkDomain(domain) {
  console.log(`\n${colors.cyan}${'━'.repeat(50)}${colors.reset}`);
  console.log(`${colors.cyan}📍 ${domain}${colors.reset}`);
  console.log(`${colors.cyan}${'━'.repeat(50)}${colors.reset}`);
  
  const results = {
    dns: await checkDNS(domain),
    rdap: await checkRDAP(domain),
    http: await checkHTTP(domain)
  };
  
  // 総合判定
  console.log('');
  if (results.dns && results.rdap && results.http) {
    console.log(`${colors.green}🎉 このドメインは取得可能と思われます！${colors.reset}`);
    return 'available';
  } else if (results.rdap === false) {
    console.log(`${colors.red}❌ このドメインは既に登録されています${colors.reset}`);
    return 'registered';
  } else {
    console.log(`${colors.yellow}⚠️  一部確認できない項目があります${colors.reset}`);
    console.log('   レジストラで直接確認することをお勧めします');
    return 'uncertain';
  }
}

/**
 * 価格情報の表示
 */
function showPriceInfo() {
  console.log(`\n${colors.blue}${'━'.repeat(50)}${colors.reset}`);
  console.log(`${colors.blue}💰 ドメイン価格の目安（年間）${colors.reset}`);
  console.log(`${colors.blue}${'━'.repeat(50)}${colors.reset}\n`);
  
  const prices = {
    '.com': '1,500円〜2,500円',
    '.net': '1,200円〜2,000円',
    '.jp': '3,000円〜4,000円'
  };
  
  Object.entries(prices).forEach(([tld, price]) => {
    console.log(`  ${tld}: ${price}`);
  });
  
  console.log('\n主要レジストラ:');
  console.log('  - お名前.com (日本)');
  console.log('  - ムームードメイン (日本)');
  console.log('  - Namecheap (海外/安価)');
  console.log('  - Cloudflare Registrar (海外/原価)');
}

/**
 * メイン処理
 */
async function main() {
  console.log(`${colors.cyan}╔${'═'.repeat(48)}╗${colors.reset}`);
  console.log(`${colors.cyan}║       🌐 Domain Availability Check 🌐          ║${colors.reset}`);
  console.log(`${colors.cyan}║         ドメイン可用性チェック (API版)         ║${colors.reset}`);
  console.log(`${colors.cyan}╚${'═'.repeat(48)}╝${colors.reset}\n`);
  
  const results = {};
  
  // 各ドメインをチェック
  for (const domain of DOMAINS) {
    results[domain] = await checkDomain(domain);
    // レート制限対策
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // サマリー表示
  console.log(`\n${colors.green}╔${'═'.repeat(48)}╗${colors.reset}`);
  console.log(`${colors.green}║           📊 チェック結果サマリー              ║${colors.reset}`);
  console.log(`${colors.green}╚${'═'.repeat(48)}╝${colors.reset}\n`);
  
  let availableCount = 0;
  Object.entries(results).forEach(([domain, status]) => {
    const icon = status === 'available' ? '✓' : status === 'registered' ? '✗' : '?';
    const color = status === 'available' ? colors.green : status === 'registered' ? colors.red : colors.yellow;
    const statusText = status === 'available' ? '取得可能' : status === 'registered' ? '登録済み' : '要確認';
    
    console.log(`  ${color}${icon}${colors.reset} ${domain} - ${statusText}`);
    
    if (status === 'available') availableCount++;
  });
  
  if (availableCount > 0) {
    console.log(`\n${colors.green}🎉 ${availableCount} 個のドメインが取得可能です！${colors.reset}\n`);
    console.log('次のステップ:');
    console.log('1. レジストラで最終確認');
    console.log('2. 価格比較');
    console.log('3. 早めの取得（他の人に取られる前に！）');
  }
  
  showPriceInfo();
}

// エラーハンドリング
process.on('unhandledRejection', (error) => {
  console.error(`\n${colors.red}エラーが発生しました: ${error.message}${colors.reset}`);
  process.exit(1);
});

// 実行
main().catch(console.error);