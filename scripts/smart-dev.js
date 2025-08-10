#!/usr/bin/env node

/**
 * スマート開発サーバー起動スクリプト
 * 14人天才会議承認済み - ポート競合を自動解決
 */

const { spawn, execSync } = require('child_process');
const net = require('net');
const readline = require('readline');

// 色定義
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

/**
 * ポートが使用可能かチェック
 */
function checkPort(port) {
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
    
    server.listen(port);
  });
}

/**
 * プロセスを停止
 */
function killProcess(port) {
  try {
    if (process.platform === 'darwin' || process.platform === 'linux') {
      // Unix系OS
      const pid = execSync(`lsof -t -i:${port} 2>/dev/null || true`).toString().trim();
      if (pid) {
        console.log(`${colors.yellow}⚠️  ポート ${port} を使用中のプロセス (PID: ${pid}) を停止します${colors.reset}`);
        execSync(`kill -9 ${pid}`);
        console.log(`${colors.green}✅ プロセスを停止しました${colors.reset}`);
        return true;
      }
    } else if (process.platform === 'win32') {
      // Windows
      const result = execSync(`netstat -ano | findstr :${port}`).toString();
      const lines = result.split('\n');
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && !isNaN(pid)) {
          console.log(`${colors.yellow}⚠️  ポート ${port} を使用中のプロセス (PID: ${pid}) を停止します${colors.reset}`);
          execSync(`taskkill /F /PID ${pid}`);
          console.log(`${colors.green}✅ プロセスを停止しました${colors.reset}`);
          return true;
        }
      }
    }
  } catch (error) {
    // エラーは無視（プロセスが見つからない場合など）
  }
  return false;
}

/**
 * ユーザーに確認を求める
 */
function askUser(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

/**
 * 開発サーバーを起動
 */
function startDevServer(port) {
  console.log('');
  console.log(`${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.green}🚀 Next.js開発サーバーを起動します${colors.reset}`);
  console.log(`${colors.green}   URL: http://localhost:${port}${colors.reset}`);
  console.log(`${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log('');
  
  const child = spawn('npx', ['next', 'dev', '--turbopack', '--port', port.toString()], {
    stdio: 'inherit',
    shell: true
  });
  
  child.on('error', (error) => {
    console.error(`${colors.red}❌ エラー: ${error.message}${colors.reset}`);
    process.exit(1);
  });
  
  child.on('close', (code) => {
    if (code !== 0) {
      console.log(`${colors.yellow}⚠️  開発サーバーが終了しました (code: ${code})${colors.reset}`);
    }
    process.exit(code);
  });
}

/**
 * メイン処理
 */
async function main() {
  const targetPort = parseInt(process.argv[2]) || 3000;
  
  console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.cyan}  スマート開発サーバー v1.0  ${colors.reset}`);
  console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log('');
  
  // ポートチェック
  const isAvailable = await checkPort(targetPort);
  
  if (isAvailable) {
    console.log(`${colors.green}✅ ポート ${targetPort} は使用可能です${colors.reset}`);
    startDevServer(targetPort);
  } else {
    console.log(`${colors.yellow}⚠️  ポート ${targetPort} は使用中です${colors.reset}`);
    
    // ユーザーに確認
    const shouldKill = await askUser(`${colors.yellow}既存のプロセスを停止しますか？ (y/n): ${colors.reset}`);
    
    if (shouldKill) {
      // プロセスを停止
      const killed = killProcess(targetPort);
      
      if (killed) {
        // 少し待機してからポートを再チェック
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const isNowAvailable = await checkPort(targetPort);
        if (isNowAvailable) {
          startDevServer(targetPort);
        } else {
          console.log(`${colors.red}❌ ポート ${targetPort} を解放できませんでした${colors.reset}`);
          
          // 代替ポートを提案
          for (let altPort = targetPort + 1; altPort <= targetPort + 10; altPort++) {
            const altAvailable = await checkPort(altPort);
            if (altAvailable) {
              console.log(`${colors.cyan}💡 代替ポート ${altPort} が利用可能です${colors.reset}`);
              const useAlt = await askUser(`${colors.cyan}ポート ${altPort} を使用しますか？ (y/n): ${colors.reset}`);
              if (useAlt) {
                startDevServer(altPort);
                return;
              }
              break;
            }
          }
          
          process.exit(1);
        }
      } else {
        console.log(`${colors.red}❌ プロセスの停止に失敗しました${colors.reset}`);
        process.exit(1);
      }
    } else {
      // 代替ポートを探す
      for (let altPort = targetPort + 1; altPort <= targetPort + 10; altPort++) {
        const altAvailable = await checkPort(altPort);
        if (altAvailable) {
          console.log(`${colors.cyan}💡 代替ポート ${altPort} が利用可能です${colors.reset}`);
          const useAlt = await askUser(`${colors.cyan}ポート ${altPort} を使用しますか？ (y/n): ${colors.reset}`);
          if (useAlt) {
            startDevServer(altPort);
            return;
          }
          break;
        }
      }
      
      console.log(`${colors.red}❌ 開発サーバーの起動をキャンセルしました${colors.reset}`);
      process.exit(0);
    }
  }
}

// エラーハンドリング
process.on('SIGINT', () => {
  console.log(`\n${colors.yellow}⚠️  開発サーバーを停止しています...${colors.reset}`);
  process.exit(0);
});

process.on('uncaughtException', (err) => {
  console.error(`${colors.red}❌ エラー: ${err.message}${colors.reset}`);
  process.exit(1);
});

// 実行
main().catch((err) => {
  console.error(`${colors.red}❌ 実行エラー: ${err.message}${colors.reset}`);
  process.exit(1);
});