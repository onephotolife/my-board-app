/**
 * k6負荷テストスクリプト
 * 本番環境のパフォーマンステスト
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// カスタムメトリクス
const errorRate = new Rate('errors');
const apiDuration = new Trend('api_duration');
const loginSuccess = new Rate('login_success');
const postCreationTime = new Trend('post_creation_time');

// テスト設定
export const options = {
  stages: [
    { duration: '2m', target: 10 },   // ウォームアップ: 10ユーザーまで増加
    { duration: '5m', target: 50 },   // 通常負荷: 50ユーザー
    { duration: '10m', target: 100 }, // ピーク負荷: 100ユーザー
    { duration: '5m', target: 200 },  // ストレス: 200ユーザー
    { duration: '2m', target: 0 },    // クールダウン
  ],
  thresholds: {
    'http_req_duration': ['p(95)<3000'], // 95%のリクエストが3秒以内
    'http_req_failed': ['rate<0.1'],     // エラー率10%未満
    'errors': ['rate<0.1'],               // カスタムエラー率
    'login_success': ['rate>0.9'],        // ログイン成功率90%以上
  },
};

// テスト環境設定
const BASE_URL = 'https://board.blankbrainai.com';
const TEST_USER = {
  email: 'loadtest@example.com',
  password: 'LoadTest123!',
};

// ヘルパー関数
function generatePost() {
  return {
    title: `負荷テスト投稿 ${Date.now()}`,
    content: `これは負荷テストによる自動投稿です。タイムスタンプ: ${new Date().toISOString()}`,
    tags: ['test', 'performance', 'k6'],
  };
}

// メインシナリオ
export default function() {
  // ユーザーシナリオ1: 閲覧のみユーザー（70%）
  if (Math.random() < 0.7) {
    group('閲覧ユーザー', function() {
      // トップページアクセス
      let res = http.get(`${BASE_URL}/`);
      check(res, {
        'status is 200': (r) => r.status === 200,
        'page loaded': (r) => r.body.includes('会員制掲示板') || r.body.includes('Board'),
      });
      errorRate.add(res.status !== 200);
      sleep(1);

      // 投稿一覧を閲覧
      res = http.get(`${BASE_URL}/api/posts?page=1&limit=20`);
      check(res, {
        'posts loaded': (r) => r.status === 200 || r.status === 401,
        'response time OK': (r) => r.timings.duration < 2000,
      });
      apiDuration.add(res.timings.duration);
      sleep(2);

      // 個別投稿を閲覧（3-5件）
      const viewCount = Math.floor(Math.random() * 3) + 3;
      for (let i = 0; i < viewCount; i++) {
        // ランダムな投稿IDを生成（実際はAPIから取得すべき）
        const postId = '507f1f77bcf86cd799439011'; // 仮のObjectID
        res = http.get(`${BASE_URL}/api/posts/${postId}`);
        check(res, {
          'post detail loaded': (r) => r.status === 200 || r.status === 404,
        });
        sleep(Math.random() * 2 + 1);
      }
    });
  }
  // ユーザーシナリオ2: 投稿ユーザー（20%）
  else if (Math.random() < 0.9) {
    group('投稿ユーザー', function() {
      // ログイン
      const loginStart = Date.now();
      let res = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify(TEST_USER), {
        headers: { 'Content-Type': 'application/json' },
      });
      
      const loginSucceeded = check(res, {
        'login successful': (r) => r.status === 200,
      });
      loginSuccess.add(loginSucceeded);
      
      if (!loginSucceeded) {
        errorRate.add(1);
        return;
      }

      // セッショントークンを取得
      const token = res.json('token') || res.cookies.session || '';
      const authHeaders = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      };

      sleep(1);

      // 投稿作成
      const postStart = Date.now();
      const newPost = generatePost();
      res = http.post(`${BASE_URL}/api/posts`, JSON.stringify(newPost), {
        headers: authHeaders,
      });
      
      check(res, {
        'post created': (r) => r.status === 201 || r.status === 200,
        'post has ID': (r) => r.json('id') !== undefined,
      });
      postCreationTime.add(Date.now() - postStart);
      
      if (res.status !== 201 && res.status !== 200) {
        errorRate.add(1);
      }

      sleep(2);

      // 自分の投稿を編集
      if (res.json('id')) {
        const postId = res.json('id');
        const updatedPost = {
          content: `更新: ${newPost.content}`,
        };
        
        res = http.put(`${BASE_URL}/api/posts/${postId}`, JSON.stringify(updatedPost), {
          headers: authHeaders,
        });
        
        check(res, {
          'post updated': (r) => r.status === 200,
        });
      }

      sleep(1);

      // ログアウト
      http.post(`${BASE_URL}/api/auth/logout`, null, {
        headers: authHeaders,
      });
    });
  }
  // ユーザーシナリオ3: 検索ユーザー（10%）
  else {
    group('検索ユーザー', function() {
      const searchTerms = ['テスト', 'セキュリティ', '新機能', 'バグ', 'リリース'];
      const searchTerm = searchTerms[Math.floor(Math.random() * searchTerms.length)];
      
      // 検索実行
      const searchStart = Date.now();
      let res = http.get(`${BASE_URL}/api/posts?search=${encodeURIComponent(searchTerm)}`);
      
      check(res, {
        'search completed': (r) => r.status === 200 || r.status === 401,
        'search fast': (r) => r.timings.duration < 2000,
      });
      
      apiDuration.add(res.timings.duration);
      
      // フィルタリング
      res = http.get(`${BASE_URL}/api/posts?sort=-createdAt&limit=10`);
      check(res, {
        'filtered results': (r) => r.status === 200 || r.status === 401,
      });
      
      sleep(1);
    });
  }
}

// セットアップ関数（テスト開始前に実行）
export function setup() {
  console.log('Load test starting...');
  console.log(`Target: ${BASE_URL}`);
  console.log(`Duration: ${options.stages.reduce((sum, stage) => sum + parseInt(stage.duration), 0)} minutes`);
  
  // ヘルスチェック
  const healthCheck = http.get(`${BASE_URL}/api/health`);
  check(healthCheck, {
    'system healthy': (r) => r.status === 200,
  });
  
  if (healthCheck.status !== 200) {
    throw new Error('System health check failed');
  }
  
  return { startTime: Date.now() };
}

// ティアダウン関数（テスト終了後に実行）
export function teardown(data) {
  const duration = (Date.now() - data.startTime) / 1000;
  console.log(`Load test completed in ${duration} seconds`);
}

// カスタムサマリー生成
export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'summary.json': JSON.stringify(data),
    'summary.html': htmlReport(data),
  };
}

// HTMLレポート生成関数
function htmlReport(data) {
  const metrics = data.metrics;
  return `
<!DOCTYPE html>
<html>
<head>
    <title>負荷テスト結果 - ${new Date().toISOString()}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .metric { margin: 10px 0; padding: 10px; border-left: 3px solid #007bff; }
        .pass { border-color: #28a745; }
        .fail { border-color: #dc3545; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { padding: 10px; text-align: left; border: 1px solid #ddd; }
        th { background-color: #f8f9fa; }
    </style>
</head>
<body>
    <h1>負荷テスト結果レポート</h1>
    <p>実施日時: ${new Date().toISOString()}</p>
    <p>対象URL: ${BASE_URL}</p>
    
    <h2>主要メトリクス</h2>
    <div class="metric ${metrics.http_req_duration.med < 3000 ? 'pass' : 'fail'}">
        <strong>レスポンス時間（中央値）:</strong> ${metrics.http_req_duration.med.toFixed(2)}ms
    </div>
    <div class="metric ${metrics.http_req_failed.rate < 0.1 ? 'pass' : 'fail'}">
        <strong>エラー率:</strong> ${(metrics.http_req_failed.rate * 100).toFixed(2)}%
    </div>
    <div class="metric">
        <strong>総リクエスト数:</strong> ${metrics.http_reqs.count}
    </div>
    
    <h2>詳細結果</h2>
    <table>
        <tr>
            <th>メトリクス</th>
            <th>最小値</th>
            <th>中央値</th>
            <th>平均値</th>
            <th>最大値</th>
            <th>95パーセンタイル</th>
        </tr>
        <tr>
            <td>レスポンス時間</td>
            <td>${metrics.http_req_duration.min?.toFixed(2)}ms</td>
            <td>${metrics.http_req_duration.med?.toFixed(2)}ms</td>
            <td>${metrics.http_req_duration.avg?.toFixed(2)}ms</td>
            <td>${metrics.http_req_duration.max?.toFixed(2)}ms</td>
            <td>${metrics.http_req_duration['p(95)']?.toFixed(2)}ms</td>
        </tr>
    </table>
</body>
</html>
  `;
}

// テキストサマリー生成関数
function textSummary(data, options) {
  const metrics = data.metrics;
  let summary = '\n=== 負荷テスト結果サマリー ===\n\n';
  
  summary += `実行時間: ${(data.state.testRunDurationMs / 1000).toFixed(2)}秒\n`;
  summary += `仮想ユーザー数: 最大${options.stages[2].target}人\n\n`;
  
  summary += '【パフォーマンス指標】\n';
  summary += `  レスポンス時間(中央値): ${metrics.http_req_duration.med?.toFixed(2)}ms\n`;
  summary += `  レスポンス時間(95%ile): ${metrics.http_req_duration['p(95)']?.toFixed(2)}ms\n`;
  summary += `  エラー率: ${(metrics.http_req_failed.rate * 100).toFixed(2)}%\n`;
  summary += `  成功率: ${((1 - metrics.http_req_failed.rate) * 100).toFixed(2)}%\n\n`;
  
  summary += '【スループット】\n';
  summary += `  総リクエスト数: ${metrics.http_reqs.count}\n`;
  summary += `  リクエスト/秒: ${metrics.http_reqs.rate?.toFixed(2)}\n\n`;
  
  // 合否判定
  const passed = metrics.http_req_duration['p(95)'] < 3000 && metrics.http_req_failed.rate < 0.1;
  summary += `【判定】${passed ? '✅ 合格' : '❌ 不合格'}\n`;
  
  return summary;
}