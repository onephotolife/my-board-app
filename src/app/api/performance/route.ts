import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';

// パフォーマンスメトリクスのバリデーションスキーマ
const PerformanceMetricsSchema = z.object({
  url: z.string().url('有効なURLを入力してください'),
  userAgent: z.string().optional(),
  metrics: z.object({
    // Core Web Vitals
    fcp: z.number().min(0).optional(), // First Contentful Paint
    lcp: z.number().min(0).optional(), // Largest Contentful Paint
    fid: z.number().min(0).optional(), // First Input Delay
    cls: z.number().min(0).optional(), // Cumulative Layout Shift
    ttfb: z.number().min(0).optional(), // Time to First Byte
    
    // Navigation Timing
    dns: z.number().min(0).optional(),
    tcp: z.number().min(0).optional(),
    tls: z.number().min(0).optional(),
    domComplete: z.number().min(0).optional(),
    loadComplete: z.number().min(0).optional(),
    
    // Custom metrics
    appReady: z.number().min(0).optional(),
    apiResponse: z.number().min(0).optional(),
  }),
  
  // Client info
  viewport: z.object({
    width: z.number().min(0),
    height: z.number().min(0),
  }).optional(),
  
  connection: z.object({
    effectiveType: z.string().optional(),
    downlink: z.number().optional(),
    rtt: z.number().optional(),
  }).optional(),
  
  timestamp: z.number().min(0),
});

// メトリクス保存用（本来はDBに保存）
interface PerformanceData {
  id: string;
  timestamp: number;
  url: string;
  userAgent?: string;
  metrics: any;
  viewport?: any;
  connection?: any;
}

const performanceData: PerformanceData[] = [];
const MAX_RECORDS = 1000; // メモリ制限

/**
 * パフォーマンスメトリクスの収集
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // バリデーション
    const validatedData = PerformanceMetricsSchema.parse(body);
    
    // データ保存
    const record: PerformanceData = {
      id: `perf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: validatedData.timestamp,
      url: validatedData.url,
      userAgent: validatedData.userAgent || request.headers.get('user-agent') || undefined,
      metrics: validatedData.metrics,
      viewport: validatedData.viewport,
      connection: validatedData.connection,
    };
    
    performanceData.push(record);
    
    // メモリ制限管理
    if (performanceData.length > MAX_RECORDS) {
      performanceData.shift(); // 古いデータを削除
    }
    
    // クライアントの対応推奨事項を生成
    const recommendations = generateRecommendations(validatedData.metrics);
    
    return NextResponse.json({
      success: true,
      recordId: record.id,
      recommendations,
      summary: {
        totalRecords: performanceData.length,
        avgLoadTime: calculateAverageLoadTime(),
      }
    }, { status: 201 });
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'バリデーションエラー',
        details: error.issues
      }, { status: 400 });
    }
    
    console.error('Performance data collection error:', error);
    return NextResponse.json({
      error: 'パフォーマンスデータの収集に失敗しました'
    }, { status: 500 });
  }
}

/**
 * パフォーマンス統計の取得
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const hours = parseInt(searchParams.get('hours') || '24');
  const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 1000);
  
  const cutoff = Date.now() - (hours * 60 * 60 * 1000);
  const recentData = performanceData
    .filter(record => record.timestamp > cutoff)
    .slice(-limit);
  
  if (recentData.length === 0) {
    return NextResponse.json({
      summary: {
        totalRecords: 0,
        timeRange: `過去${hours}時間`,
        message: 'データがありません'
      },
      data: []
    });
  }
  
  // 統計計算
  const stats = calculatePerformanceStats(recentData);
  
  return NextResponse.json({
    summary: {
      totalRecords: recentData.length,
      timeRange: `過去${hours}時間`,
      ...stats
    },
    data: recentData.map(record => ({
      id: record.id,
      timestamp: record.timestamp,
      url: record.url,
      metrics: record.metrics,
      viewport: record.viewport,
    })),
    recommendations: generateGlobalRecommendations(stats)
  });
}

/**
 * パフォーマンス統計計算
 */
function calculatePerformanceStats(data: PerformanceData[]) {
  const metrics = data.map(d => d.metrics);
  
  return {
    averages: {
      fcp: calculateAverage(metrics, 'fcp'),
      lcp: calculateAverage(metrics, 'lcp'),
      ttfb: calculateAverage(metrics, 'ttfb'),
      domComplete: calculateAverage(metrics, 'domComplete'),
      appReady: calculateAverage(metrics, 'appReady'),
    },
    percentiles: {
      fcp_p95: calculatePercentile(metrics, 'fcp', 95),
      lcp_p95: calculatePercentile(metrics, 'lcp', 95),
      ttfb_p95: calculatePercentile(metrics, 'ttfb', 95),
    },
    deviceBreakdown: calculateDeviceBreakdown(data),
    connectionBreakdown: calculateConnectionBreakdown(data),
  };
}

function calculateAverage(metrics: any[], field: string): number | null {
  const values = metrics
    .map(m => m[field])
    .filter(v => typeof v === 'number' && v > 0);
  
  if (values.length === 0) return null;
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

function calculatePercentile(metrics: any[], field: string, percentile: number): number | null {
  const values = metrics
    .map(m => m[field])
    .filter(v => typeof v === 'number' && v > 0)
    .sort((a, b) => a - b);
  
  if (values.length === 0) return null;
  
  const index = Math.ceil((percentile / 100) * values.length) - 1;
  return Math.round(values[index]);
}

function calculateDeviceBreakdown(data: PerformanceData[]) {
  const devices = { mobile: 0, desktop: 0, tablet: 0, unknown: 0 };
  
  data.forEach(record => {
    const width = record.viewport?.width || 0;
    if (width < 768) devices.mobile++;
    else if (width < 1024) devices.tablet++;
    else if (width >= 1024) devices.desktop++;
    else devices.unknown++;
  });
  
  return devices;
}

function calculateConnectionBreakdown(data: PerformanceData[]) {
  const connections: Record<string, number> = {};
  
  data.forEach(record => {
    const type = record.connection?.effectiveType || 'unknown';
    connections[type] = (connections[type] || 0) + 1;
  });
  
  return connections;
}

function calculateAverageLoadTime(): number | null {
  if (performanceData.length === 0) return null;
  
  const loadTimes = performanceData
    .map(d => d.metrics.appReady || d.metrics.loadComplete)
    .filter(t => typeof t === 'number' && t > 0);
  
  if (loadTimes.length === 0) return null;
  return Math.round(loadTimes.reduce((a, b) => a + b, 0) / loadTimes.length);
}

/**
 * 推奨事項の生成
 */
function generateRecommendations(metrics: any) {
  const recommendations = [];
  
  if (metrics.fcp && metrics.fcp > 1800) {
    recommendations.push({
      type: 'performance',
      severity: 'warning',
      message: 'First Contentful Paint が遅いです。画像最適化やキャッシュ戦略の見直しを検討してください。',
      value: `${metrics.fcp}ms`,
      target: '< 1800ms'
    });
  }
  
  if (metrics.lcp && metrics.lcp > 2500) {
    recommendations.push({
      type: 'performance',
      severity: 'error',
      message: 'Largest Contentful Paint が Core Web Vitals の基準を超えています。',
      value: `${metrics.lcp}ms`,
      target: '< 2500ms'
    });
  }
  
  if (metrics.cls && metrics.cls > 0.1) {
    recommendations.push({
      type: 'layout',
      severity: 'warning',
      message: 'Cumulative Layout Shift が高いです。レイアウトの安定性を改善してください。',
      value: metrics.cls.toFixed(3),
      target: '< 0.1'
    });
  }
  
  if (metrics.ttfb && metrics.ttfb > 800) {
    recommendations.push({
      type: 'server',
      severity: 'warning',
      message: 'Time to First Byte が遅いです。サーバー応答時間の最適化を検討してください。',
      value: `${metrics.ttfb}ms`,
      target: '< 800ms'
    });
  }
  
  return recommendations;
}

function generateGlobalRecommendations(stats: any) {
  const recommendations = [];
  
  if (stats.averages.lcp && stats.averages.lcp > 2000) {
    recommendations.push({
      type: 'infrastructure',
      priority: 'high',
      message: '平均 LCP が高いため、CDN やキャッシュ戦略の見直しを推奨します。',
      impact: 'ユーザー体験の大幅改善'
    });
  }
  
  if (stats.deviceBreakdown.mobile > stats.deviceBreakdown.desktop) {
    recommendations.push({
      type: 'mobile',
      priority: 'medium',
      message: 'モバイルユーザーが多いため、モバイルファーストの最適化を強化してください。',
      impact: 'モバイル体験の向上'
    });
  }
  
  return recommendations;
}