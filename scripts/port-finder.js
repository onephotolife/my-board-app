#!/usr/bin/env node

/**
 * ポート自動検出ユーティリティ
 * 14人天才会議承認済み
 */

const net = require('net');

// 色定義（ANSIエスケープコード）
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

/**
 * ポートが使用可能かチェック
 * @param {number} port - チェックするポート番号
 * @returns {Promise<boolean>} - 使用可能ならtrue
 */
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    
    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve(false);
      } else {
        resolve(false);
      }
    });
    
    server.once('listening', () => {
      server.close();
      resolve(true);
    });
    
    server.listen(port, '0.0.0.0');
  });
}

/**
 * 利用可能なポートを探す
 * @param {number} startPort - 開始ポート番号
 * @param {number} endPort - 終了ポート番号
 * @returns {Promise<number>} - 利用可能なポート番号
 */
async function findAvailablePort(startPort = 3000, endPort = 65535) {
  console.log(`${colors.cyan}🔍 ポート ${startPort} から検索中...${colors.reset}`);
  
  for (let port = startPort; port <= endPort; port++) {
    const available = await isPortAvailable(port);
    if (available) {
      return port;
    }
    
    // 進捗表示（100ポートごと）
    if ((port - startPort) % 100 === 0 && port !== startPort) {
      process.stdout.write(`${colors.yellow}.${colors.reset}`);
    }
  }
  
  return -1;
}

/**
 * ポート使用状況の詳細を取得
 * @param {number} port - チェックするポート番号
 */
async function getPortStatus(port) {
  const available = await isPortAvailable(port);
  
  if (available) {
    console.log(`${colors.green}✅ ポート ${port} は使用可能です${colors.reset}`);
    return { port, available: true };
  } else {
    console.log(`${colors.yellow}⚠️  ポート ${port} は使用中です${colors.reset}`);
    
    // 代替ポートを提案
    const alternativePort = await findAvailablePort(port + 1);
    if (alternativePort > 0) {
      console.log(`${colors.green}💡 代替ポート: ${alternativePort}${colors.reset}`);
      return { port, available: false, alternative: alternativePort };
    } else {
      console.log(`${colors.red}❌ 代替ポートが見つかりません${colors.reset}`);
      return { port, available: false, alternative: null };
    }
  }
}

/**
 * メイン関数
 */
async function main() {
  const args = process.argv.slice(2);
  const requestedPort = parseInt(args[0]) || 3000;
  
  console.log(`${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.blue}  ポート検出ユーティリティ v1.0  ${colors.reset}`);
  console.log(`${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log('');
  
  const status = await getPortStatus(requestedPort);
  
  if (status.available) {
    console.log('');
    console.log(`${colors.green}🎉 ポート ${requestedPort} で開発サーバーを起動できます${colors.reset}`);
    process.exit(0);
  } else if (status.alternative) {
    console.log('');
    console.log(`${colors.cyan}💡 推奨: ポート ${status.alternative} を使用してください${colors.reset}`);
    console.log(`${colors.cyan}   実行例: npm run dev -- --port ${status.alternative}${colors.reset}`);
    process.exit(1);
  } else {
    console.log('');
    console.log(`${colors.red}❌ 利用可能なポートが見つかりませんでした${colors.reset}`);
    process.exit(1);
  }
}

// エラーハンドリング
process.on('uncaughtException', (err) => {
  console.error(`${colors.red}❌ エラー: ${err.message}${colors.reset}`);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error(`${colors.red}❌ 未処理の拒否: ${reason}${colors.reset}`);
  process.exit(1);
});

// 実行
if (require.main === module) {
  main().catch((err) => {
    console.error(`${colors.red}❌ 実行エラー: ${err.message}${colors.reset}`);
    process.exit(1);
  });
}

module.exports = {
  isPortAvailable,
  findAvailablePort,
  getPortStatus,
};