#!/usr/bin/env node

/**
 * MongoDB接続エラー分析スクリプト
 * E2E_TEST_REPORT.mdと現在の設定を基に、MongoDBエラーの全容を把握
 */

const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');
const dns = require('dns').promises;

// カラー出力用
const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

function log(message, color = 'reset') {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

// E2Eテストレポートからのエラー
const knownErrors = {
  dnsError: 'querySrv ENOTFOUND _mongodb._tcp.cluster0.1gofz.mongodb.net',
  connectionRefused: 'ECONNREFUSED',
  authenticationFailed: 'authentication failed',
  networkTimeout: 'Server selection timed out',
  invalidUri: 'Invalid connection string',
};

// 環境変数を読み込む
function loadEnvVariables() {
  const envPath = path.join(process.cwd(), '.env.local');
  const envContent = fs.readFileSync(envPath, 'utf-8');
  const env = {};
  
  envContent.split('\n').forEach(line => {
    if (line && !line.startsWith('#')) {
      const [key, ...valueParts] = line.split('=');
      if (key) {
        env[key.trim()] = valueParts.join('=').trim();
      }
    }
  });
  
  return env;
}

// MongoDB接続ファイルを分析
function analyzeConnectionFiles() {
  const dbDir = path.join(process.cwd(), 'src', 'lib', 'db');
  const files = fs.readdirSync(dbDir).filter(f => f.endsWith('.ts'));
  
  const analysis = {};
  
  files.forEach(file => {
    const content = fs.readFileSync(path.join(dbDir, file), 'utf-8');
    
    // MONGODB_ENV使用を検出
    const usesEnv = content.includes('MONGODB_ENV');
    
    // 接続URLパターンを検出
    const hasAtlasUrl = content.includes('mongodb+srv://');
    const hasLocalUrl = content.includes('mongodb://localhost');
    
    // フォールバック機構を検出
    const hasFallback = content.includes('fallback') || 
                        content.includes('catch') && content.includes('local');
    
    // エラーハンドリングを検出
    const hasErrorHandling = content.includes('try') && content.includes('catch');
    
    analysis[file] = {
      usesEnv,
      hasAtlasUrl,
      hasLocalUrl,
      hasFallback,
      hasErrorHandling,
      lineCount: content.split('\n').length,
    };
  });
  
  return analysis;
}

// エラーログを解析
async function analyzeErrorLogs() {
  const serverLogPath = path.join(process.cwd(), 'server.log');
  const errors = {
    dnsErrors: [],
    connectionErrors: [],
    authErrors: [],
    otherErrors: [],
  };
  
  if (fs.existsSync(serverLogPath)) {
    const logContent = fs.readFileSync(serverLogPath, 'utf-8');
    const lines = logContent.split('\n');
    
    lines.forEach(line => {
      if (line.includes('ENOTFOUND')) {
        errors.dnsErrors.push(line);
      } else if (line.includes('ECONNREFUSED') || line.includes('connection failed')) {
        errors.connectionErrors.push(line);
      } else if (line.includes('authentication') || line.includes('unauthorized')) {
        errors.authErrors.push(line);
      } else if (line.includes('MongoDB') && line.includes('error')) {
        errors.otherErrors.push(line);
      }
    });
  }
  
  return errors;
}

// DNS解決テスト
async function testDnsResolution(hostname) {
  try {
    const addresses = await dns.resolve4(hostname);
    return { success: true, addresses };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// 接続テスト
async function testConnection(uri, name) {
  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 5000,
  });
  
  try {
    await client.connect();
    await client.db().admin().ping();
    await client.close();
    return { success: true, name };
  } catch (error) {
    return { 
      success: false, 
      name,
      error: error.message,
      errorType: classifyError(error.message),
    };
  }
}

// エラー分類
function classifyError(errorMessage) {
  if (errorMessage.includes('ENOTFOUND')) return 'DNS_ERROR';
  if (errorMessage.includes('ECONNREFUSED')) return 'CONNECTION_REFUSED';
  if (errorMessage.includes('authentication')) return 'AUTH_ERROR';
  if (errorMessage.includes('timeout')) return 'TIMEOUT';
  if (errorMessage.includes('Invalid')) return 'INVALID_CONFIG';
  return 'UNKNOWN';
}

// メイン分析関数
async function analyzeMongoDBErrors() {
  log('\n🔍 MongoDB接続エラー詳細分析', 'cyan');
  log('=' .repeat(60), 'cyan');
  
  // Phase 1: 設定確認
  log('\n📋 Phase 1: 設定確認', 'blue');
  const env = loadEnvVariables();
  
  log('\n環境変数:', 'yellow');
  log(`  MONGODB_ENV: ${env.MONGODB_ENV || 'not set'}`);
  log(`  MONGODB_URI: ${env.MONGODB_URI ? '✅ 設定済み (Atlas)' : '❌ 未設定'}`);
  log(`  MONGODB_URI_LOCAL: ${env.MONGODB_URI_LOCAL ? '✅ 設定済み' : '❌ 未設定'}`);
  
  // Phase 2: ファイル分析
  log('\n📋 Phase 2: 接続ファイル分析', 'blue');
  const fileAnalysis = analyzeConnectionFiles();
  
  Object.entries(fileAnalysis).forEach(([file, info]) => {
    log(`\n${file}:`, 'yellow');
    log(`  環境変数使用: ${info.usesEnv ? '✅' : '❌'}`);
    log(`  Atlas URL: ${info.hasAtlasUrl ? '✅' : '❌'}`);
    log(`  Local URL: ${info.hasLocalUrl ? '✅' : '❌'}`);
    log(`  フォールバック: ${info.hasFallback ? '✅' : '❌'}`);
    log(`  エラーハンドリング: ${info.hasErrorHandling ? '✅' : '❌'}`);
  });
  
  // Phase 3: エラーログ分析
  log('\n📋 Phase 3: エラーログ分析', 'blue');
  const errorLogs = await analyzeErrorLogs();
  
  log(`\nDNSエラー: ${errorLogs.dnsErrors.length}件`);
  log(`接続エラー: ${errorLogs.connectionErrors.length}件`);
  log(`認証エラー: ${errorLogs.authErrors.length}件`);
  log(`その他: ${errorLogs.otherErrors.length}件`);
  
  // Phase 4: DNS解決テスト
  log('\n📋 Phase 4: DNS解決テスト', 'blue');
  
  if (env.MONGODB_URI && env.MONGODB_URI.includes('mongodb+srv://')) {
    const match = env.MONGODB_URI.match(/@([^/]+)/);
    if (match) {
      const hostname = match[1];
      log(`\nテスト対象: ${hostname}`);
      const dnsResult = await testDnsResolution(hostname);
      
      if (dnsResult.success) {
        log(`  ✅ DNS解決成功: ${dnsResult.addresses.join(', ')}`, 'green');
      } else {
        log(`  ❌ DNS解決失敗: ${dnsResult.error}`, 'red');
      }
    }
  }
  
  // Phase 5: 接続テスト
  log('\n📋 Phase 5: 接続テスト', 'blue');
  
  const connectionTests = [];
  
  if (env.MONGODB_URI) {
    connectionTests.push(testConnection(env.MONGODB_URI, 'MongoDB Atlas'));
  }
  
  if (env.MONGODB_URI_LOCAL) {
    connectionTests.push(testConnection(env.MONGODB_URI_LOCAL, 'Local MongoDB'));
  }
  
  const results = await Promise.all(connectionTests);
  
  results.forEach(result => {
    if (result.success) {
      log(`\n✅ ${result.name}: 接続成功`, 'green');
    } else {
      log(`\n❌ ${result.name}: 接続失敗`, 'red');
      log(`  エラータイプ: ${result.errorType}`, 'yellow');
      log(`  詳細: ${result.error}`, 'cyan');
    }
  });
  
  // Phase 6: E2Eテストレポートとの照合
  log('\n📋 Phase 6: E2Eテストレポートとの照合', 'blue');
  
  const e2eReportPath = path.join(process.cwd(), 'E2E_TEST_REPORT.md');
  if (fs.existsSync(e2eReportPath)) {
    const e2eContent = fs.readFileSync(e2eReportPath, 'utf-8');
    
    log('\nE2Eレポートで報告されたエラー:', 'yellow');
    
    if (e2eContent.includes('querySrv ENOTFOUND')) {
      log('  ⚠️ DNS解決エラー（cluster0.1gofz.mongodb.net）', 'yellow');
      log('    → 現在の設定とは異なるクラスター', 'cyan');
    }
    
    if (e2eContent.includes('MongoDB接続の安定化')) {
      log('  ⚠️ 接続の不安定性が指摘されている', 'yellow');
    }
    
    if (e2eContent.includes('71.4%')) {
      log('  ⚠️ テスト成功率: 71.4%（MongoDB関連の失敗含む）', 'yellow');
    }
  }
  
  // Phase 7: 総合診断
  log('\n📊 総合診断', 'magenta');
  log('=' .repeat(60), 'magenta');
  
  const issues = [];
  const recommendations = [];
  
  // 問題の特定
  if (env.MONGODB_ENV === 'atlas' && !env.MONGODB_URI) {
    issues.push('MONGODB_ENV=atlasだが、MONGODB_URIが未設定');
    recommendations.push('MONGODB_URIを正しく設定するか、MONGODB_ENV=localに変更');
  }
  
  const atlasTestFailed = results.some(r => 
    r.name === 'MongoDB Atlas' && !r.success
  );
  
  if (atlasTestFailed) {
    issues.push('MongoDB Atlasへの接続が失敗');
    recommendations.push('Atlas接続文字列の確認');
    recommendations.push('ネットワーク接続の確認');
    recommendations.push('IPホワイトリストの確認（0.0.0.0/0を許可）');
  }
  
  const localTestFailed = results.some(r => 
    r.name === 'Local MongoDB' && !r.success
  );
  
  if (localTestFailed) {
    issues.push('ローカルMongoDBへの接続が失敗');
    recommendations.push('MongoDBサービスが起動していることを確認');
    recommendations.push('`brew services start mongodb-community`を実行');
  }
  
  // 複数のmongodb接続ファイルの存在
  const dbFiles = Object.keys(fileAnalysis);
  if (dbFiles.length > 3) {
    issues.push(`複数の接続ファイルが存在（${dbFiles.length}個）`);
    recommendations.push('使用する接続ファイルを1つに統一');
    recommendations.push('不要なファイルを削除またはバックアップ');
  }
  
  // 結果表示
  if (issues.length > 0) {
    log('\n🔴 検出された問題:', 'red');
    issues.forEach(issue => log(`  • ${issue}`, 'yellow'));
    
    log('\n💡 推奨される対策:', 'green');
    recommendations.forEach(rec => log(`  • ${rec}`, 'cyan'));
  } else {
    log('\n✅ 重大な問題は検出されませんでした', 'green');
  }
  
  // レポート生成
  const report = generateDetailedReport({
    env,
    fileAnalysis,
    errorLogs,
    connectionResults: results,
    issues,
    recommendations,
  });
  
  const reportPath = path.join(process.cwd(), 'MONGODB_ERROR_ANALYSIS.md');
  fs.writeFileSync(reportPath, report);
  
  log('\n📄 詳細レポート生成: MONGODB_ERROR_ANALYSIS.md', 'green');
  log('=' .repeat(60) + '\n', 'cyan');
}

// 詳細レポート生成
function generateDetailedReport(data) {
  const now = new Date().toLocaleString('ja-JP');
  
  return `# 📊 MongoDB接続エラー詳細分析レポート

## 生成日時
${now}

## エグゼクティブサマリー

### 検出された問題（${data.issues.length}件）
${data.issues.map(issue => `- ${issue}`).join('\n') || '- なし'}

### 推奨される対策
${data.recommendations.map(rec => `- ${rec}`).join('\n') || '- 特になし'}

## 環境設定状況

| 設定項目 | 値 | 状態 |
|---------|-----|------|
| MONGODB_ENV | ${data.env.MONGODB_ENV || '未設定'} | ${data.env.MONGODB_ENV ? '✅' : '⚠️'} |
| MONGODB_URI (Atlas) | ${data.env.MONGODB_URI ? '設定済み' : '未設定'} | ${data.env.MONGODB_URI ? '✅' : '❌'} |
| MONGODB_URI_LOCAL | ${data.env.MONGODB_URI_LOCAL ? '設定済み' : '未設定'} | ${data.env.MONGODB_URI_LOCAL ? '✅' : '❌'} |

## 接続ファイル分析

${Object.entries(data.fileAnalysis).map(([file, info]) => `
### ${file}
- 環境変数使用: ${info.usesEnv ? '✅' : '❌'}
- Atlas URL: ${info.hasAtlasUrl ? '✅' : '❌'}  
- Local URL: ${info.hasLocalUrl ? '✅' : '❌'}
- フォールバック機構: ${info.hasFallback ? '✅' : '❌'}
- エラーハンドリング: ${info.hasErrorHandling ? '✅' : '❌'}
- ファイルサイズ: ${info.lineCount}行
`).join('\n')}

## エラーログ分析

| エラータイプ | 件数 |
|------------|------|
| DNSエラー | ${data.errorLogs.dnsErrors.length} |
| 接続エラー | ${data.errorLogs.connectionErrors.length} |
| 認証エラー | ${data.errorLogs.authErrors.length} |
| その他 | ${data.errorLogs.otherErrors.length} |

## 接続テスト結果

${data.connectionResults.map(result => `
### ${result.name}
- 状態: ${result.success ? '✅ 成功' : '❌ 失敗'}
${!result.success ? `- エラータイプ: ${result.errorType}
- エラー詳細: ${result.error}` : ''}
`).join('\n')}

## E2Eテストレポートとの相関

### 報告されたエラー
- DNS解決エラー: cluster0.1gofz.mongodb.net（旧クラスター）
- 現在の設定: ${data.env.MONGODB_URI ? data.env.MONGODB_URI.match(/@([^/]+)/)?.[1] || 'N/A' : 'N/A'}
- 不一致: ${data.env.MONGODB_URI && !data.env.MONGODB_URI.includes('1gofz') ? '✅ 修正済み' : '⚠️ 要確認'}

### テスト成功率への影響
- E2Eテスト成功率: 71.4%
- MongoDB関連の失敗: 4件
- 影響度: 高

## 推奨アクションプラン

### 即座対応（Critical）
${data.issues.filter(i => i.includes('接続が失敗')).map(i => `1. ${i}の解決`).join('\n') || '- なし'}

### 短期対応（High）
1. 接続ファイルの統一化
2. 環境変数の整理
3. エラーハンドリングの強化

### 中期対応（Medium）
1. 接続プールの最適化
2. リトライメカニズムの実装
3. モニタリングの追加

## 技術的詳細

### 現在のクラスター情報
- Atlas URI: ${data.env.MONGODB_URI ? '設定済み' : '未設定'}
- クラスター: ${data.env.MONGODB_URI ? data.env.MONGODB_URI.match(/@([^/]+)/)?.[1] || 'N/A' : 'N/A'}
- データベース: ${data.env.MONGODB_URI ? data.env.MONGODB_URI.match(/\/([^?]+)/)?.[1] || 'N/A' : 'N/A'}

### 接続オプション
- retryWrites: ${data.env.MONGODB_URI?.includes('retryWrites=true') ? '有効' : '無効'}
- w: ${data.env.MONGODB_URI?.match(/w=(\w+)/)?.[1] || 'デフォルト'}

## 結論

${data.issues.length === 0 ? 
'✅ MongoDB接続は正常に動作しています。' :
`⚠️ ${data.issues.length}件の問題が検出されました。上記の推奨事項に従って対応してください。`}

---

*このレポートは自動生成されました。*
`;
}

// 実行
analyzeMongoDBErrors().catch(error => {
  log(`\n❌ 致命的エラー: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});