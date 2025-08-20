import { NextRequest, NextResponse } from 'next/server';

/**
 * CSP違反レポートエンドポイント
 * ブラウザから送信されるCSP違反レポートを受信・記録
 */

interface CSPReport {
  'csp-report': {
    'document-uri': string;
    'referrer'?: string;
    'violated-directive': string;
    'effective-directive': string;
    'original-policy': string;
    'disposition': string;
    'blocked-uri': string;
    'line-number'?: number;
    'column-number'?: number;
    'source-file'?: string;
    'status-code': number;
    'script-sample'?: string;
  };
}

// レポート保存（開発環境ではコンソール出力）
async function saveCSPViolation(report: CSPReport): Promise<void> {
  const violation = report['csp-report'];
  
  const logData = {
    timestamp: new Date().toISOString(),
    documentUri: violation['document-uri'],
    violatedDirective: violation['violated-directive'],
    effectiveDirective: violation['effective-directive'],
    blockedUri: violation['blocked-uri'],
    sourceFile: violation['source-file'],
    lineNumber: violation['line-number'],
    columnNumber: violation['column-number'],
    scriptSample: violation['script-sample'],
  };
  
  // 開発環境：コンソール出力
  if (process.env.NODE_ENV === 'development') {
    console.warn('[CSP Violation Detected]', logData);
  }
  
  // 本番環境：ログファイルまたはデータベースに保存
  if (process.env.NODE_ENV === 'production') {
    // TODO: データベースまたはログサービスに送信
    console.error('[CSP Violation]', JSON.stringify(logData));
    
    // 例: MongoDBに保存
    // await db.collection('csp_violations').insertOne(logData);
    
    // 例: 外部監視サービスに送信
    // await sendToMonitoringService(logData);
  }
}

export async function POST(request: NextRequest) {
  try {
    // CSPレポートの取得
    const contentType = request.headers.get('content-type');
    
    if (!contentType?.includes('application/csp-report') && 
        !contentType?.includes('application/json')) {
      return new NextResponse(null, { status: 400 });
    }
    
    const report = await request.json() as CSPReport;
    
    // レポートの検証
    if (!report['csp-report']) {
      return new NextResponse(null, { status: 400 });
    }
    
    // 違反を記録
    await saveCSPViolation(report);
    
    // 204 No Content を返す（CSP仕様準拠）
    return new NextResponse(null, { status: 204 });
    
  } catch (error) {
    console.error('[CSP Report Error]', error);
    
    // エラーでも204を返す（ブラウザのリトライを防ぐ）
    return new NextResponse(null, { status: 204 });
  }
}

// レート制限（オプション）
const reportCache = new Map<string, number>();
const RATE_LIMIT_WINDOW = 60000; // 1分
const MAX_REPORTS_PER_WINDOW = 10;

function isRateLimited(clientIp: string): boolean {
  const now = Date.now();
  const reports = reportCache.get(clientIp) || 0;
  
  // ウィンドウ内のレポート数をチェック
  if (reports >= MAX_REPORTS_PER_WINDOW) {
    return true;
  }
  
  // カウントを更新
  reportCache.set(clientIp, reports + 1);
  
  // ウィンドウ後にリセット
  setTimeout(() => {
    reportCache.delete(clientIp);
  }, RATE_LIMIT_WINDOW);
  
  return false;
}