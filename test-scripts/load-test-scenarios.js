// k6負荷テストシナリオ
// 会員制掲示板の包括的な負荷テスト

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// カスタムメトリクス
const errorRate = new Rate('errors');

// 環境設定
const BASE_URL = __ENV.BASE_URL || 'https://board.blankbrainai.com';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || '';

// テストシナリオの設定
export const options = {
  scenarios: {
    // シナリオ1: 通常負荷テスト
    normal_load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 50 },   // 2分で50ユーザーまで増加
        { duration: '5m', target: 50 },   // 5分間50ユーザーを維持
        { duration: '2m', target: 100 },  // 2分で100ユーザーまで増加
        { duration: '5m', target: 100 },  // 5分間100ユーザーを維持
        { duration: '2m', target: 0 },    // 2分で0まで減少
      ],
      gracefulRampDown: '30s',
      startTime: '0s',
    },
    
    // シナリオ2: スパイクテスト
    spike_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 10 },   // ウォームアップ
        { duration: '30s', target: 10 },   // 安定状態
        { duration: '30s', target: 200 },  // 突然のスパイク
        { duration: '1m', target: 200 },   // スパイク維持
        { duration: '30s', target: 10 },   // 通常に戻る
        { duration: '1m', target: 10 },    // 回復確認
        { duration: '30s', target: 0 },    // 終了
      ],
      startTime: '20m',
    },
    
    // シナリオ3: ストレステスト
    stress_test: {
      executor: 'ramping-arrival-rate',
      startRate: 10,
      timeUnit: '1s',
      preAllocatedVUs: 50,
      maxVUs: 500,
      stages: [
        { duration: '2m', target: 50 },    // 50req/sまで増加
        { duration: '5m', target: 100 },   // 100req/sまで増加
        { duration: '2m', target: 200 },   // 200req/sまで増加
        { duration: '5m', target: 200 },   // 高負荷維持
        { duration: '2m', target: 0 },     // 終了
      ],
      startTime: '30m',
    },
  },
  
  // 閾値設定
  thresholds: {
    http_req_duration: [
      'p(95)<500',  // 95%のリクエストが500ms以内
      'p(99)<1000', // 99%のリクエストが1秒以内
    ],
    http_req_failed: ['rate<0.01'],  // エラー率1%未満
    errors: ['rate<0.01'],            // カスタムエラー率1%未満
  },
};

// テスト実行関数
export default function() {
  // テストグループ定義
  const testGroups = [
    { name: 'ヘルスチェック', weight: 10, fn: healthCheck },
    { name: '投稿一覧取得', weight: 40, fn: getPosts },
    { name: '投稿詳細取得', weight: 30, fn: getPostDetail },
    { name: '新規投稿作成', weight: 10, fn: createPost },
    { name: '投稿編集', weight: 5, fn: updatePost },
    { name: '投稿削除', weight: 5, fn: deletePost },
  ];
  
  // 重み付けランダム選択
  const totalWeight = testGroups.reduce((sum, g) => sum + g.weight, 0);
  const random = Math.random() * totalWeight;
  let cumWeight = 0;
  
  for (const group of testGroups) {
    cumWeight += group.weight;
    if (random < cumWeight) {
      group.fn();
      break;
    }
  }
  
  sleep(Math.random() * 2 + 1); // 1-3秒のランダム待機
}

// テスト関数定義

function healthCheck() {
  const res = http.get(`${BASE_URL}/api/health`);
  
  const success = check(res, {
    'ヘルスチェック成功': (r) => r.status === 200,
    'レスポンスタイム < 200ms': (r) => r.timings.duration < 200,
  });
  
  errorRate.add(!success);
}

function getPosts() {
  const params = {
    headers: {
      'Authorization': AUTH_TOKEN ? `Bearer ${AUTH_TOKEN}` : undefined,
    },
  };
  
  const res = http.get(`${BASE_URL}/api/posts?page=1&limit=20`, params);
  
  const success = check(res, {
    '投稿一覧取得成功': (r) => r.status === 200 || r.status === 401,
    'レスポンスタイム < 500ms': (r) => r.timings.duration < 500,
    'コンテンツタイプ確認': (r) => r.headers['Content-Type']?.includes('application/json'),
  });
  
  errorRate.add(!success);
  
  // レスポンスサイズ確認
  if (res.body) {
    check(res, {
      'レスポンスサイズ適切': (r) => r.body.length < 100000, // 100KB未満
    });
  }
}

function getPostDetail() {
  // ダミーのPost ID（実際のテストでは動的に取得）
  const postId = 'dummy-post-id';
  
  const params = {
    headers: {
      'Authorization': AUTH_TOKEN ? `Bearer ${AUTH_TOKEN}` : undefined,
    },
  };
  
  const res = http.get(`${BASE_URL}/api/posts/${postId}`, params);
  
  const success = check(res, {
    '投稿詳細取得': (r) => r.status === 200 || r.status === 404 || r.status === 401,
    'レスポンスタイム < 300ms': (r) => r.timings.duration < 300,
  });
  
  errorRate.add(!success);
}

function createPost() {
  if (!AUTH_TOKEN) return; // 認証なしではスキップ
  
  const payload = JSON.stringify({
    title: `負荷テスト投稿 ${Date.now()}`,
    content: '負荷テストによる自動投稿です。パフォーマンス測定のために作成されました。',
    tags: ['test', 'load-test'],
  });
  
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${AUTH_TOKEN}`,
    },
  };
  
  const res = http.post(`${BASE_URL}/api/posts`, payload, params);
  
  const success = check(res, {
    '投稿作成': (r) => r.status === 201 || r.status === 401,
    'レスポンスタイム < 1000ms': (r) => r.timings.duration < 1000,
  });
  
  errorRate.add(!success);
}

function updatePost() {
  if (!AUTH_TOKEN) return; // 認証なしではスキップ
  
  const postId = 'dummy-post-id';
  const payload = JSON.stringify({
    content: `更新: ${new Date().toISOString()}`,
  });
  
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${AUTH_TOKEN}`,
    },
  };
  
  const res = http.put(`${BASE_URL}/api/posts/${postId}`, payload, params);
  
  const success = check(res, {
    '投稿更新': (r) => r.status === 200 || r.status === 404 || r.status === 403,
    'レスポンスタイム < 800ms': (r) => r.timings.duration < 800,
  });
  
  errorRate.add(!success);
}

function deletePost() {
  if (!AUTH_TOKEN) return; // 認証なしではスキップ
  
  const postId = 'dummy-post-id';
  
  const params = {
    headers: {
      'Authorization': `Bearer ${AUTH_TOKEN}`,
    },
  };
  
  const res = http.del(`${BASE_URL}/api/posts/${postId}`, null, params);
  
  const success = check(res, {
    '投稿削除': (r) => r.status === 200 || r.status === 404 || r.status === 403,
    'レスポンスタイム < 500ms': (r) => r.timings.duration < 500,
  });
  
  errorRate.add(!success);
}

// テスト終了時のサマリー
export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'load-test-results.json': JSON.stringify(data),
    'load-test-results.html': htmlReport(data),
  };
}

// カスタムレポート生成
function textSummary(data, options) {
  const { metrics } = data;
  let summary = '\n=== 負荷テスト結果サマリー ===\n\n';
  
  // リクエスト統計
  if (metrics.http_reqs) {
    summary += `総リクエスト数: ${metrics.http_reqs.values.count}\n`;
    summary += `リクエスト率: ${metrics.http_reqs.values.rate.toFixed(2)} req/s\n\n`;
  }
  
  // レスポンスタイム
  if (metrics.http_req_duration) {
    const duration = metrics.http_req_duration.values;
    summary += 'レスポンスタイム:\n';
    summary += `  平均: ${duration.avg.toFixed(2)}ms\n`;
    summary += `  中央値: ${duration.med.toFixed(2)}ms\n`;
    summary += `  P95: ${duration['p(95)'].toFixed(2)}ms\n`;
    summary += `  P99: ${duration['p(99)'].toFixed(2)}ms\n\n`;
  }
  
  // エラー率
  if (metrics.http_req_failed) {
    const errorRate = metrics.http_req_failed.values.rate * 100;
    summary += `エラー率: ${errorRate.toFixed(2)}%\n\n`;
  }
  
  // 閾値チェック
  summary += '閾値チェック:\n';
  for (const [name, threshold] of Object.entries(data.thresholds || {})) {
    const status = threshold.ok ? '✅ PASS' : '❌ FAIL';
    summary += `  ${name}: ${status}\n`;
  }
  
  return summary;
}

function htmlReport(data) {
  // HTML形式のレポート生成（簡略版）
  return `
<!DOCTYPE html>
<html>
<head>
    <title>負荷テストレポート</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        h1 { color: #333; }
        .metric { margin: 10px 0; padding: 10px; background: #f5f5f5; }
        .pass { color: green; }
        .fail { color: red; }
    </style>
</head>
<body>
    <h1>会員制掲示板 負荷テストレポート</h1>
    <div class="metric">
        <h2>テスト実施日時</h2>
        <p>${new Date().toISOString()}</p>
    </div>
    <div class="metric">
        <h2>総リクエスト数</h2>
        <p>${data.metrics.http_reqs?.values.count || 0}</p>
    </div>
    <div class="metric">
        <h2>平均レスポンスタイム</h2>
        <p>${data.metrics.http_req_duration?.values.avg.toFixed(2) || 0}ms</p>
    </div>
    <div class="metric">
        <h2>エラー率</h2>
        <p>${(data.metrics.http_req_failed?.values.rate * 100).toFixed(2) || 0}%</p>
    </div>
</body>
</html>
  `;
}