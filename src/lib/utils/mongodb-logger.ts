/**
 * MongoDB接続ログユーティリティ
 * 14人天才会議 - 天才11
 * 
 * 接続状態の詳細なログ記録とモニタリング
 */

import mongoose from 'mongoose';

// ログレベル定義
export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR'
}

// ログ設定
const LOG_CONFIG = {
  enabled: process.env.MONGODB_DEBUG === 'true' || process.env.NODE_ENV === 'development',
  level: (process.env.MONGODB_LOG_LEVEL || 'INFO') as LogLevel,
  showTimestamp: true,
  showConnectionDetails: true,
  maskSensitiveData: true
};

// カラーコード（ターミナル用）
const colors = {
  DEBUG: '\x1b[36m', // cyan
  INFO: '\x1b[32m',  // green
  WARN: '\x1b[33m',  // yellow
  ERROR: '\x1b[31m', // red
  RESET: '\x1b[0m',
  BOLD: '\x1b[1m'
};

// 接続履歴
interface ConnectionEvent {
  timestamp: Date;
  type: 'connect' | 'disconnect' | 'error' | 'retry';
  connectionType?: 'atlas' | 'local';
  message: string;
  details?: any;
}

const connectionHistory: ConnectionEvent[] = [];
const MAX_HISTORY_SIZE = 100;

/**
 * 機密情報をマスク
 */
function maskSensitiveInfo(str: string): string {
  if (!LOG_CONFIG.maskSensitiveData) return str;
  
  // パスワード部分をマスク
  return str
    .replace(/\/\/([^:]+):([^@]+)@/, '//***:***@')
    .replace(/password=([^&\s]+)/gi, 'password=***')
    .replace(/apikey=([^&\s]+)/gi, 'apikey=***');
}

/**
 * ログメッセージのフォーマット
 */
function formatLogMessage(level: LogLevel, message: string, details?: any): string {
  const timestamp = LOG_CONFIG.showTimestamp 
    ? `[${new Date().toISOString()}] ` 
    : '';
  
  const levelColor = colors[level];
  const levelText = `[${level}]`;
  
  let formattedMessage = `${timestamp}${levelColor}${levelText}${colors.RESET} ${message}`;
  
  if (details) {
    const detailsStr = typeof details === 'object' 
      ? JSON.stringify(details, null, 2)
      : String(details);
    formattedMessage += `\n${maskSensitiveInfo(detailsStr)}`;
  }
  
  return formattedMessage;
}

/**
 * ログ出力
 */
export function log(level: LogLevel, message: string, details?: any) {
  if (!LOG_CONFIG.enabled) return;
  
  const levels = ['DEBUG', 'INFO', 'WARN', 'ERROR'];
  const currentLevelIndex = levels.indexOf(LOG_CONFIG.level);
  const messageLevelIndex = levels.indexOf(level);
  
  if (messageLevelIndex >= currentLevelIndex) {
    const formattedMessage = formatLogMessage(level, message, details);
    
    switch (level) {
      case LogLevel.ERROR:
        console.error(formattedMessage);
        break;
      case LogLevel.WARN:
        console.warn(formattedMessage);
        break;
      default:
        console.log(formattedMessage);
    }
  }
}

/**
 * 接続イベントの記録
 */
export function recordConnectionEvent(
  type: 'connect' | 'disconnect' | 'error' | 'retry',
  message: string,
  connectionType?: 'atlas' | 'local',
  details?: any
) {
  const event: ConnectionEvent = {
    timestamp: new Date(),
    type,
    connectionType,
    message,
    details
  };
  
  connectionHistory.push(event);
  
  // 履歴サイズ制限
  if (connectionHistory.length > MAX_HISTORY_SIZE) {
    connectionHistory.shift();
  }
  
  // ログ出力
  const level = type === 'error' ? LogLevel.ERROR 
    : type === 'retry' ? LogLevel.WARN 
    : LogLevel.INFO;
  
  log(level, `[MongoDB ${type.toUpperCase()}] ${message}`, details);
}

/**
 * MongoDB接続のモニタリング設定
 */
export function setupMongooseMonitoring(connection?: mongoose.Connection) {
  const conn = connection || mongoose.connection;
  
  // 接続イベント
  conn.on('connected', () => {
    recordConnectionEvent('connect', 'MongoDBに接続しました');
  });
  
  conn.on('disconnected', () => {
    recordConnectionEvent('disconnect', 'MongoDB接続が切断されました');
  });
  
  conn.on('error', (error) => {
    recordConnectionEvent('error', 'MongoDB接続エラー', undefined, {
      error: error.message,
      stack: error.stack
    });
  });
  
  conn.on('reconnected', () => {
    recordConnectionEvent('retry', 'MongoDBに再接続しました');
  });
  
  // 詳細デバッグ（開発環境のみ）
  if (process.env.NODE_ENV === 'development' && process.env.MONGODB_DEBUG === 'true') {
    conn.on('open', () => {
      log(LogLevel.DEBUG, 'MongoDB接続がオープンしました');
    });
    
    conn.on('close', () => {
      log(LogLevel.DEBUG, 'MongoDB接続がクローズしました');
    });
    
    conn.on('reconnectFailed', () => {
      log(LogLevel.ERROR, 'MongoDB再接続に失敗しました');
    });
  }
}

/**
 * 接続状態の詳細ログ
 */
export function logConnectionStatus(conn?: mongoose.Connection) {
  const connection = conn || mongoose.connection;
  
  const status = {
    readyState: connection.readyState,
    readyStateText: ['切断', '接続済み', '接続中', '切断中'][connection.readyState],
    host: connection.host,
    port: connection.port,
    name: connection.name,
    models: Object.keys(connection.models).length
  };
  
  log(LogLevel.INFO, '接続ステータス', status);
  return status;
}

/**
 * 接続履歴の取得
 */
export function getConnectionHistory(limit: number = 10): ConnectionEvent[] {
  return connectionHistory.slice(-limit);
}

/**
 * 接続統計の取得
 */
export function getConnectionStats() {
  const stats = {
    totalEvents: connectionHistory.length,
    connects: 0,
    disconnects: 0,
    errors: 0,
    retries: 0,
    lastConnect: null as Date | null,
    lastError: null as Date | null,
    uptime: 0
  };
  
  connectionHistory.forEach(event => {
    switch (event.type) {
      case 'connect':
        stats.connects++;
        stats.lastConnect = event.timestamp;
        break;
      case 'disconnect':
        stats.disconnects++;
        break;
      case 'error':
        stats.errors++;
        stats.lastError = event.timestamp;
        break;
      case 'retry':
        stats.retries++;
        break;
    }
  });
  
  // アップタイム計算
  if (stats.lastConnect) {
    stats.uptime = Date.now() - stats.lastConnect.getTime();
  }
  
  return stats;
}

/**
 * デバッグ情報の出力
 */
export function printDebugInfo() {
  console.log('\n' + '='.repeat(60));
  console.log('MongoDB接続デバッグ情報');
  console.log('='.repeat(60));
  
  // 環境変数
  console.log('\n[環境変数]');
  console.log(`MONGODB_URI: ${process.env.MONGODB_URI ? '設定済み' : '未設定'}`);
  console.log(`MONGODB_URI_PRODUCTION: ${process.env.MONGODB_URI_PRODUCTION ? '設定済み' : '未設定'}`);
  console.log(`MONGODB_ENV: ${process.env.MONGODB_ENV || '未設定'}`);
  console.log(`NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
  
  // 接続状態
  console.log('\n[接続状態]');
  const status = logConnectionStatus();
  
  // 接続統計
  console.log('\n[接続統計]');
  const stats = getConnectionStats();
  console.log(`総イベント数: ${stats.totalEvents}`);
  console.log(`接続回数: ${stats.connects}`);
  console.log(`切断回数: ${stats.disconnects}`);
  console.log(`エラー回数: ${stats.errors}`);
  console.log(`再試行回数: ${stats.retries}`);
  
  if (stats.lastConnect) {
    const uptimeSeconds = Math.floor(stats.uptime / 1000);
    const uptimeMinutes = Math.floor(uptimeSeconds / 60);
    const uptimeHours = Math.floor(uptimeMinutes / 60);
    
    if (uptimeHours > 0) {
      console.log(`アップタイム: ${uptimeHours}時間${uptimeMinutes % 60}分`);
    } else if (uptimeMinutes > 0) {
      console.log(`アップタイム: ${uptimeMinutes}分${uptimeSeconds % 60}秒`);
    } else {
      console.log(`アップタイム: ${uptimeSeconds}秒`);
    }
  }
  
  // 最近のイベント
  console.log('\n[最近の接続イベント]');
  const recentEvents = getConnectionHistory(5);
  recentEvents.forEach(event => {
    const time = event.timestamp.toLocaleTimeString();
    const type = event.type.toUpperCase().padEnd(10);
    console.log(`${time} | ${type} | ${event.message}`);
  });
  
  console.log('='.repeat(60) + '\n');
}

// エクスポート
export default {
  log,
  LogLevel,
  recordConnectionEvent,
  setupMongooseMonitoring,
  logConnectionStatus,
  getConnectionHistory,
  getConnectionStats,
  printDebugInfo
};