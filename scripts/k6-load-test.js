// k6負荷テストスクリプト
// インストール: brew install k6 (Mac) または https://k6.io/docs/getting-started/installation/
// 実行: k6 run scripts/k6-load-test.js --env DOMAIN=your-domain.com

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// カスタムメトリクス
const errorRate = new Rate('errors');
const apiTrend = new Trend('api_response_time');

// 環境変数からドメイン取得
const DOMAIN = __ENV.DOMAIN || 'your-domain.com';
// localhostの場合はHTTPを使用
const PROTOCOL = DOMAIN.includes('localhost') || DOMAIN.includes('127.0.0.1') ? 'http' : 'https';
const BASE_URL = `${PROTOCOL}://${DOMAIN}`;
const API_URL = `${BASE_URL}/api`;

// テストシナリオ設定
export const options = {
  // 段階的な負荷テスト
  stages: [
    { duration: '30s', target: 10 },   // ウォームアップ: 30秒で10ユーザーまで
    { duration: '1m', target: 20 },    // 通常負荷: 1分間20ユーザー
    { duration: '2m', target: 50 },    // ピーク負荷: 2分間50ユーザー
    { duration: '1m', target: 100 },   // ストレステスト: 1分間100ユーザー
    { duration: '30s', target: 0 },    // クールダウン: 30秒で0まで
  ],
  
  // パフォーマンス基準
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'], // 95%が500ms以内、99%が1秒以内
    http_req_failed: ['rate<0.01'],                  // エラー率1%未満
    errors: ['rate<0.05'],                           // カスタムエラー率5%未満
    api_response_time: ['p(95)<300'],                // API応答時間の95%が300ms以内
  },
  
  // その他の設定
  noConnectionReuse: false,
  userAgent: 'K6LoadTest/1.0',
};

// テストデータ生成
function generatePostContent() {
  const contents = [
    'これはテスト投稿です。',
    'k6による負荷テストを実行中です。',
    'パフォーマンステストのサンプル投稿。',
    '自動テストによる投稿内容です。',
    'ストレステスト実行中...',
  ];
  return contents[Math.floor(Math.random() * contents.length)] + ` (${Date.now()})`;
}

// セットアップ（テスト開始前に1回実行）
export function setup() {
  console.log(`\n🚀 負荷テスト開始: ${BASE_URL}\n`);
  
  // ヘルスチェック
  const healthCheck = http.get(`${API_URL}/posts`);
  if (healthCheck.status !== 200) {
    throw new Error(`API not responding. Status: ${healthCheck.status}`);
  }
  
  return { startTime: Date.now() };
}

// メインテスト関数（各仮想ユーザーが繰り返し実行）
export default function(data) {
  // シナリオ1: トップページアクセス
  group('Homepage Load', () => {
    const res = http.get(BASE_URL);
    check(res, {
      'homepage status is 200': (r) => r.status === 200,
      'homepage loads fast': (r) => r.timings.duration < 1000,
      'has content': (r) => r.body && r.body.length > 0,
    }) || errorRate.add(1);
    
    sleep(1);
  });
  
  // シナリオ2: API投稿一覧取得
  group('Get Posts', () => {
    const start = Date.now();
    const res = http.get(`${API_URL}/posts`);
    const responseTime = Date.now() - start;
    
    apiTrend.add(responseTime);
    
    const success = check(res, {
      'posts API status is 200': (r) => r.status === 200,
      'posts API response is array': (r) => {
        try {
          const body = JSON.parse(r.body);
          return Array.isArray(body);
        } catch {
          return false;
        }
      },
      'posts API fast response': (r) => r.timings.duration < 300,
    });
    
    if (!success) errorRate.add(1);
    
    sleep(Math.random() * 2 + 1); // 1-3秒のランダム待機
  });
  
  // シナリオ3: 新規投稿作成（20%の確率）
  if (Math.random() < 0.2) {
    group('Create Post', () => {
      const payload = JSON.stringify({
        content: generatePostContent()
      });
      
      const params = {
        headers: {
          'Content-Type': 'application/json',
        },
      };
      
      const res = http.post(`${API_URL}/posts`, payload, params);
      
      const success = check(res, {
        'create post status is 201 or 200': (r) => r.status === 201 || r.status === 200,
        'create post returns ID': (r) => {
          try {
            const body = JSON.parse(r.body);
            return body._id !== undefined;
          } catch {
            return false;
          }
        },
        'create post fast': (r) => r.timings.duration < 500,
      });
      
      if (!success) {
        errorRate.add(1);
        console.log(`Create post failed: ${res.status} - ${res.body}`);
      }
      
      // 作成した投稿のIDを保存（後続のテストで使用可能）
      if (success && res.json('_id')) {
        const postId = res.json('_id');
        
        // シナリオ4: 投稿の更新（50%の確率）
        if (Math.random() < 0.5) {
          sleep(1);
          group('Update Post', () => {
            const updatePayload = JSON.stringify({
              content: '更新された内容: ' + generatePostContent()
            });
            
            const updateRes = http.put(
              `${API_URL}/posts/${postId}`,
              updatePayload,
              params
            );
            
            check(updateRes, {
              'update post status is 200': (r) => r.status === 200,
              'update post fast': (r) => r.timings.duration < 500,
            }) || errorRate.add(1);
          });
        }
        
        // シナリオ5: 投稿の削除（30%の確率）
        if (Math.random() < 0.3) {
          sleep(1);
          group('Delete Post', () => {
            const deleteRes = http.del(`${API_URL}/posts/${postId}`);
            
            check(deleteRes, {
              'delete post status is 200 or 204': (r) => 
                r.status === 200 || r.status === 204,
              'delete post fast': (r) => r.timings.duration < 300,
            }) || errorRate.add(1);
          });
        }
      }
    });
  }
  
  // シナリオ6: 静的リソースの取得（10%の確率）
  if (Math.random() < 0.1) {
    group('Static Resources', () => {
      const resources = [
        '/_next/static/css/app.css',
        '/_next/static/chunks/main.js',
        '/favicon.ico',
      ];
      
      resources.forEach(resource => {
        const res = http.get(`${BASE_URL}${resource}`);
        check(res, {
          [`${resource} loads`]: (r) => r.status === 200 || r.status === 304,
        }) || errorRate.add(1);
      });
    });
  }
  
  // ユーザー行動のシミュレーション（思考時間）
  sleep(Math.random() * 3 + 2); // 2-5秒のランダム待機
}

// テスト終了後の処理
export function teardown(data) {
  const duration = (Date.now() - data.startTime) / 1000;
  console.log(`\n✅ 負荷テスト完了（実行時間: ${duration}秒）\n`);
}

// カスタムサマリーの生成
export function handleSummary(data) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    [`./test-reports/k6-summary-${timestamp}.json`]: JSON.stringify(data, null, 2),
    [`./test-reports/k6-summary-${timestamp}.html`]: htmlReport(data),
  };
}

// テキストサマリー生成
function textSummary(data, options) {
  let summary = '\n=== 負荷テスト結果サマリー ===\n\n';
  
  // メトリクスのサマリー
  if (data.metrics) {
    summary += '📊 主要メトリクス:\n';
    
    // HTTPリクエスト
    if (data.metrics.http_reqs) {
      summary += `  • 総リクエスト数: ${data.metrics.http_reqs.values.count}\n`;
      summary += `  • リクエスト/秒: ${data.metrics.http_reqs.values.rate.toFixed(2)}\n`;
    }
    
    // レスポンスタイム
    if (data.metrics.http_req_duration) {
      const duration = data.metrics.http_req_duration.values;
      summary += `  • 平均レスポンスタイム: ${duration.avg.toFixed(2)}ms\n`;
      summary += `  • 95パーセンタイル: ${duration['p(95)'].toFixed(2)}ms\n`;
      summary += `  • 99パーセンタイル: ${duration['p(99)'].toFixed(2)}ms\n`;
    }
    
    // エラー率
    if (data.metrics.http_req_failed) {
      const failRate = data.metrics.http_req_failed.values.rate * 100;
      summary += `  • エラー率: ${failRate.toFixed(2)}%\n`;
    }
  }
  
  return summary;
}

// HTMLレポート生成
function htmlReport(data) {
  return `
<!DOCTYPE html>
<html>
<head>
    <title>K6 負荷テストレポート</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        h1 { color: #333; }
        .metric { 
            background: #f5f5f5; 
            padding: 10px; 
            margin: 10px 0; 
            border-radius: 5px;
        }
        .success { color: green; }
        .warning { color: orange; }
        .error { color: red; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #4CAF50; color: white; }
    </style>
</head>
<body>
    <h1>🚀 K6 負荷テストレポート</h1>
    <p>実行日時: ${new Date().toLocaleString()}</p>
    <p>対象URL: ${BASE_URL}</p>
    
    <h2>📊 テスト結果</h2>
    <div class="metric">
        <h3>HTTPリクエスト</h3>
        <p>総リクエスト数: ${data.metrics.http_reqs?.values.count || 0}</p>
        <p>リクエスト/秒: ${data.metrics.http_reqs?.values.rate?.toFixed(2) || 0}</p>
    </div>
    
    <div class="metric">
        <h3>レスポンスタイム</h3>
        <p>平均: ${data.metrics.http_req_duration?.values.avg?.toFixed(2) || 0}ms</p>
        <p>中央値: ${data.metrics.http_req_duration?.values.med?.toFixed(2) || 0}ms</p>
        <p>95%: ${data.metrics.http_req_duration?.values['p(95)']?.toFixed(2) || 0}ms</p>
        <p>99%: ${data.metrics.http_req_duration?.values['p(99)']?.toFixed(2) || 0}ms</p>
    </div>
    
    <div class="metric">
        <h3>エラー率</h3>
        <p class="${(data.metrics.http_req_failed?.values.rate || 0) < 0.01 ? 'success' : 'error'}">
            ${((data.metrics.http_req_failed?.values.rate || 0) * 100).toFixed(2)}%
        </p>
    </div>
    
    <h2>📈 詳細データ</h2>
    <pre>${JSON.stringify(data, null, 2)}</pre>
</body>
</html>
  `;
}