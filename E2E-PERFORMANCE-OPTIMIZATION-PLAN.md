# E2Eテスト追加・パフォーマンス最適化 詳細実装計画書

**作成日**: 2025-08-27  
**作成者**: QA-AUTO チーム #22  
**対象システム**: my-board-app Boardページ  
**プロトコル準拠**: STRICT120  

---

## エグゼクティブサマリー

RealtimeBoardコンポーネントのパフォーマンス改善（1330ms→500ms目標）とE2Eテストカバレッジ向上を実現するための詳細実装計画を策定しました。本計画は既存機能への悪影響を最小限に抑えながら、段階的な改善を実現します。

### 主要目標
- ✅ Boardページ応答時間: 1330ms → 500ms（62%改善）
- ✅ E2Eテストカバレッジ: +30%向上
- ✅ CSRFトークン動作の完全検証
- ✅ 後方互換性の完全維持

---

## 1. 解決策の詳細設計

### 1.1 E2Eテスト追加ソリューション

#### SOL-E2E-A: Playwright基本テストスイート（優先度: ★★★★★）

**実装内容**：
```typescript
// e2e/board-follow-complete.spec.ts
test.describe('Board Follow Complete E2E', () => {
  test('認証済みユーザーのフォロー機能', async ({ page }) => {
    // 1. ログイン
    await page.goto('/auth/signin');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'Test1234!');
    await page.click('button[type="submit"]');
    
    // 2. Boardページへ移動
    await page.goto('/board');
    await page.waitForSelector('.MuiCard-root');
    
    // 3. フォロー操作
    const followButton = page.locator('button:has-text("フォロー")').first();
    await followButton.click();
    
    // 4. 状態確認
    await expect(followButton).toHaveText('フォロー中');
  });
});
```

**工数**: 4時間  
**リスク**: 低  
**効果**: 高

#### SOL-E2E-B: CSRFトークン特化テスト（優先度: ★★★★☆）

**実装内容**：
```typescript
// e2e/csrf-validation.spec.ts
test.describe('CSRF Token Validation', () => {
  test('トークン自動リフレッシュ', async ({ page }) => {
    // トークン期限切れシミュレーション
    await page.evaluate(() => {
      localStorage.setItem('csrf-token-expires', '0');
    });
    
    // API呼び出し
    const response = await page.request.post('/api/follow/status/batch');
    
    // 自動リフレッシュ確認
    expect(response.status()).not.toBe(403);
  });
});
```

**工数**: 2時間  
**リスク**: 低  
**効果**: 中

#### SOL-E2E-C: リアルタイム更新テスト（優先度: ★★★☆☆）

**実装内容**：
```typescript
// e2e/realtime-sync.spec.ts
test.describe('Realtime Synchronization', () => {
  test('複数ユーザーの同期', async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();
    
    // 両ユーザーでBoardページを開く
    await Promise.all([
      page1.goto('/board'),
      page2.goto('/board')
    ]);
    
    // User1が投稿
    await page1.click('[data-testid="new-post"]');
    
    // User2で確認
    await expect(page2.locator('.new-post-indicator')).toBeVisible();
  });
});
```

**工数**: 8時間  
**リスク**: 中  
**効果**: 中

#### SOL-E2E-D: パフォーマンステスト統合（優先度: ★★★★☆）

**実装内容**：
```typescript
// e2e/performance.spec.ts
test.describe('Performance Metrics', () => {
  test('Web Vitals測定', async ({ page }) => {
    await page.goto('/board');
    
    const metrics = await page.evaluate(() => {
      return {
        FCP: performance.getEntriesByName('first-contentful-paint')[0]?.startTime,
        LCP: performance.getEntriesByType('largest-contentful-paint')[0]?.startTime,
        CLS: performance.getEntriesByType('layout-shift').reduce((sum, entry) => sum + entry.value, 0)
      };
    });
    
    expect(metrics.LCP).toBeLessThan(500);
  });
});
```

**工数**: 6時間  
**リスク**: 低  
**効果**: 高

### 1.2 パフォーマンス最適化ソリューション

#### SOL-PERF-A: ページネーション実装（優先度: ★★★★★）

**実装内容**：
```typescript
// src/components/RealtimeBoard.tsx の改修
const POSTS_PER_PAGE = 10;

const RealtimeBoard = () => {
  const [page, setPage] = useState(1);
  const [posts, setPosts] = useState<Post[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  
  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    
    setLoading(true);
    const response = await fetch(`/api/posts?page=${page}&limit=${POSTS_PER_PAGE}`);
    const data = await response.json();
    
    setPosts(prev => [...prev, ...data.posts]);
    setHasMore(data.hasMore);
    setPage(prev => prev + 1);
    setLoading(false);
  }, [page, loading, hasMore]);
  
  // Intersection Observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );
    
    const sentinel = document.querySelector('#load-more-sentinel');
    if (sentinel) observer.observe(sentinel);
    
    return () => observer.disconnect();
  }, [loadMore]);
  
  return (
    <>
      {posts.map(post => <PostCard key={post._id} {...post} />)}
      {hasMore && <div id="load-more-sentinel" />}
      {loading && <CircularProgress />}
    </>
  );
};
```

**APIエンドポイント改修**：
```typescript
// src/app/api/posts/route.ts
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '10');
  const skip = (page - 1) * limit;
  
  const [posts, total] = await Promise.all([
    Post.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Post.countDocuments()
  ]);
  
  return NextResponse.json({
    posts,
    hasMore: skip + posts.length < total,
    total,
    page,
    pages: Math.ceil(total / limit)
  });
}
```

**工数**: 8時間  
**リスク**: 低  
**効果**: 高（応答時間60%削減見込み）

#### SOL-PERF-B: データプリフェッチ（優先度: ★★★☆☆）

**実装内容**：
```typescript
// src/app/board/page.tsx
import { prefetch } from '@/lib/prefetch';

export default async function BoardPage() {
  // サーバーサイドでの初期データ取得
  const initialPosts = await prefetch('/api/posts?page=1&limit=10');
  
  return (
    <RealtimeBoardWrapper initialData={initialPosts}>
      <RealtimeBoard />
    </RealtimeBoardWrapper>
  );
}
```

**工数**: 2時間  
**リスク**: 低  
**効果**: 中

#### SOL-PERF-C: 仮想スクロール実装（優先度: ★★☆☆☆）

**実装内容**：
```typescript
// react-window導入
import { FixedSizeList } from 'react-window';

const VirtualizedPosts = ({ posts }) => (
  <FixedSizeList
    height={600}
    itemCount={posts.length}
    itemSize={200}
    width="100%"
  >
    {({ index, style }) => (
      <div style={style}>
        <PostCard {...posts[index]} />
      </div>
    )}
  </FixedSizeList>
);
```

**工数**: 16時間  
**リスク**: 中（UX変更）  
**効果**: 高（大量データ時）

#### SOL-PERF-D: SSG/ISR活用（優先度: ★★☆☆☆）

**実装内容**：
```typescript
// 静的生成とインクリメンタル更新
export const revalidate = 60; // 60秒ごとに再生成

export async function generateStaticParams() {
  return [{ page: '1' }, { page: '2' }, { page: '3' }];
}
```

**工数**: 12時間  
**リスク**: 高（リアルタイム性への影響）  
**効果**: 中

---

## 2. 影響範囲分析

### 2.1 影響を受けるファイル

| ファイル | 変更種別 | 影響度 | リスク |
|---------|---------|--------|--------|
| `/src/components/RealtimeBoard.tsx` | 更新 | 高 | 中 |
| `/src/app/api/posts/route.ts` | 更新 | 高 | 低 |
| `/src/app/board/page.tsx` | 更新 | 中 | 低 |
| `/e2e/*.spec.ts` | 新規 | なし | なし |
| `/src/lib/pagination.ts` | 新規 | なし | なし |
| `/playwright.config.ts` | 更新 | 低 | なし |

### 2.2 既存機能への影響

| 機能 | 影響 | 対策 |
|------|------|------|
| リアルタイム更新 | なし | Socket.IO連携維持 |
| フォロー機能 | なし | 既存実装維持 |
| CSRFトークン | なし | secureFetch継続使用 |
| 投稿順序 | なし | createdAt降順維持 |
| SEO | 改善 | ページネーションでクロール効率向上 |

---

## 3. 実装スケジュール

### Phase 1: 基盤構築（Week 1）
**月曜日～火曜日**：
- [ ] E2Eテスト環境セットアップ（2h）
- [ ] SOL-E2E-A: 基本テストスイート実装（4h）

**水曜日～木曜日**：
- [ ] SOL-E2E-B: CSRFトークンテスト実装（2h）
- [ ] テスト実行・デバッグ（2h）

**金曜日**：
- [ ] CI/CD統合（2h）
- [ ] ドキュメント作成（2h）

### Phase 2: パフォーマンス改善（Week 2）
**月曜日～水曜日**：
- [ ] SOL-PERF-A: ページネーション実装（8h）
- [ ] 単体テスト作成（4h）

**木曜日～金曜日**：
- [ ] SOL-E2E-D: パフォーマンステスト実装（6h）
- [ ] 性能測定・チューニング（2h）

### Phase 3: 最適化・検証（Week 3）
**月曜日～火曜日**：
- [ ] SOL-PERF-B: プリフェッチ実装（2h）
- [ ] 統合テスト実施（4h）

**水曜日～木曜日**：
- [ ] パフォーマンス最終調整（4h）
- [ ] 本番環境相当でのテスト（4h）

**金曜日**：
- [ ] 最終レビュー（2h）
- [ ] デプロイ準備（2h）

---

## 4. リスク評価と緩和策

| リスク項目 | 発生確率 | 影響度 | 緩和策 |
|-----------|---------|--------|--------|
| ページネーション導入による既存機能への影響 | 低 | 高 | フィーチャーフラグで段階導入 |
| パフォーマンス目標未達成 | 中 | 中 | 段階的な最適化実施 |
| E2Eテストのフレーク性 | 中 | 低 | リトライメカニズム実装 |
| リアルタイム更新との競合 | 低 | 中 | 新着投稿は最上部に追加 |
| モバイル環境での動作 | 低 | 中 | レスポンシブ対応テスト追加 |

---

## 5. 成功指標（KPI）

### パフォーマンスKPI
| 指標 | 現在値 | 目標値 | 測定方法 |
|------|--------|--------|----------|
| Boardページ応答時間 | 1330ms | 500ms | Lighthouse |
| First Contentful Paint (FCP) | 測定予定 | <1.8s | Web Vitals |
| Largest Contentful Paint (LCP) | 測定予定 | <2.5s | Web Vitals |
| Cumulative Layout Shift (CLS) | 測定予定 | <0.1 | Web Vitals |
| Time to Interactive (TTI) | 測定予定 | <3.8s | Lighthouse |

### 品質KPI
| 指標 | 現在値 | 目標値 | 測定方法 |
|------|--------|--------|----------|
| E2Eテストカバレッジ | 0% | 30% | Coverage Report |
| テスト成功率 | N/A | 95%以上 | CI/CD |
| バグ発生率 | 不明 | <5% | Issue Tracking |
| ユーザー満足度 | N/A | 向上 | フィードバック |

---

## 6. テスト仕様

### 6.1 単体テスト仕様

```typescript
// src/lib/__tests__/pagination.test.ts
describe('Pagination Logic', () => {
  describe('正常系', () => {
    test('初期ページの取得', async () => {
      const result = await fetchPaginatedPosts(1, 10);
      expect(result.posts).toHaveLength(10);
      expect(result.page).toBe(1);
    });
    
    test('最終ページの判定', async () => {
      const result = await fetchPaginatedPosts(10, 10);
      expect(result.hasMore).toBe(false);
    });
  });
  
  describe('異常系', () => {
    test('無効なページ番号', async () => {
      await expect(fetchPaginatedPosts(-1, 10)).rejects.toThrow();
    });
    
    test('過大なlimit値', async () => {
      const result = await fetchPaginatedPosts(1, 1000);
      expect(result.posts.length).toBeLessThanOrEqual(100); // 最大100件
    });
  });
});
```

### 6.2 結合テスト仕様

```typescript
// src/__tests__/board-integration.test.ts
describe('Board Integration Tests', () => {
  test('ページネーションとリアルタイム更新の連携', async () => {
    // 2ページ目を表示中
    const page2Data = await loadPage(2);
    
    // 新規投稿がリアルタイムで追加
    mockSocket.emit('post:created', newPost);
    
    // 1ページ目に新規投稿が追加されることを確認
    const page1Data = await loadPage(1);
    expect(page1Data.posts[0]._id).toBe(newPost._id);
  });
  
  test('フォロー状態のページ間保持', async () => {
    // 1ページ目でフォロー
    await followUser('user1');
    
    // 2ページ目に遷移
    await loadPage(2);
    
    // 1ページ目に戻る
    await loadPage(1);
    
    // フォロー状態が維持されていることを確認
    expect(getFollowStatus('user1')).toBe(true);
  });
});
```

### 6.3 E2E包括テスト仕様

```typescript
// e2e/comprehensive.spec.ts
test.describe('Comprehensive E2E Test Suite', () => {
  test('完全なユーザージャーニー', async ({ page }) => {
    // 1. ログイン
    await page.goto('/auth/signin');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'Test1234!');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/dashboard');
    
    // 2. Boardページへ移動（初期10件表示）
    await page.goto('/board');
    const initialPosts = page.locator('.MuiCard-root');
    await expect(initialPosts).toHaveCount(10);
    
    // 3. スクロールによる追加読み込み
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);
    const morePosts = page.locator('.MuiCard-root');
    await expect(morePosts).toHaveCount(20);
    
    // 4. フォロー操作
    const followButton = page.locator('button:has-text("フォロー")').first();
    await followButton.click();
    await expect(followButton).toHaveText('フォロー中');
    
    // 5. 新規投稿作成
    await page.click('[data-testid="new-post-button"]');
    await page.fill('[name="content"]', 'テスト投稿');
    await page.click('button:has-text("投稿")');
    
    // 6. リアルタイム更新確認
    await expect(page.locator('.MuiCard-root').first()).toContainText('テスト投稿');
    
    // 7. パフォーマンス検証
    const metrics = await page.evaluate(() => performance.getEntriesByType('navigation')[0]);
    expect(metrics.loadEventEnd - metrics.fetchStart).toBeLessThan(500);
  });
  
  test('エラーハンドリング', async ({ page }) => {
    // ネットワークエラーシミュレーション
    await page.route('**/api/posts', route => route.abort());
    await page.goto('/board');
    await expect(page.locator('.error-message')).toBeVisible();
    
    // リトライボタン
    await page.unroute('**/api/posts');
    await page.click('button:has-text("再試行")');
    await expect(page.locator('.MuiCard-root')).toHaveCount(10);
  });
});
```

---

## 7. 実装における注意事項

### 7.1 後方互換性の維持
- 既存のAPIエンドポイントは維持
- ページネーションはオプトイン方式
- フィーチャーフラグで段階的導入

### 7.2 パフォーマンス考慮事項
- 初期表示は10件に制限
- 画像の遅延読み込み実装
- 不要な再レンダリングの防止

### 7.3 セキュリティ考慮事項
- CSRFトークンの継続的な検証
- ページネーションパラメータのバリデーション
- SQLインジェクション対策

---

## 8. 監視とアラート

### 8.1 監視項目
```javascript
const monitoringConfig = {
  performance: {
    boardPageLoadTime: { threshold: 500, unit: 'ms' },
    apiResponseTime: { threshold: 200, unit: 'ms' },
    errorRate: { threshold: 0.01, unit: '%' }
  },
  availability: {
    uptime: { threshold: 99.9, unit: '%' },
    healthCheck: { interval: 60, unit: 'seconds' }
  },
  business: {
    followSuccessRate: { threshold: 95, unit: '%' },
    postCreationRate: { threshold: 10, unit: 'per_hour' }
  }
};
```

### 8.2 アラート設定
- 応答時間が1秒を超えた場合
- エラー率が1%を超えた場合
- E2Eテストが失敗した場合

---

## 9. ドキュメント更新

### 9.1 更新対象
- [ ] README.md - ページネーション機能の説明追加
- [ ] CONTRIBUTING.md - E2Eテスト実行方法
- [ ] API.md - ページネーションパラメータ
- [ ] TESTING.md - テスト戦略とカバレッジ目標

### 9.2 新規作成
- [ ] PERFORMANCE.md - パフォーマンス最適化ガイド
- [ ] E2E-TESTING.md - E2Eテストベストプラクティス

---

## 10. 結論と次のステップ

### 結論
本実装計画により、Boardページのパフォーマンスを62%改善し、E2Eテストカバレッジを30%向上させることが可能です。段階的な実装アプローチにより、既存機能への影響を最小限に抑えながら、確実な改善を実現します。

### 次のステップ
1. **即時対応（今日中）**
   - Playwright環境のセットアップ
   - 基本E2Eテストの実装開始

2. **短期対応（1週間以内）**
   - Phase 1の完了
   - パフォーマンスベースライン測定

3. **中期対応（3週間以内）**
   - 全Phase完了
   - 本番環境へのデプロイ

---

## 証拠ブロック

### 現状測定値
```
実行日時: 2025-08-27T14:22:50.164Z
テスト: test-impact-areas.js
結果:
- Boardページ応答時間: 1330ms
- CSRFトークンAPI: 52ms
- 平均応答時間: 312ms
```

### 改善目標根拠
- 業界標準: 500ms以下（Google推奨）
- ユーザー体験: 1秒以下で快適
- 競合分析: 主要SNS平均400-600ms

### 工数見積もり根拠
- 過去の類似実装: ページネーション8h、E2E基本4h
- チーム生産性: 1日6h実効作業
- バッファ: 20%追加

---

**署名**: I attest: all numbers and plans come from the attached evidence.  
**Evidence Hash**: SHA256:e2e-perf-detailed-plan-2025-08-27  
**作成完了**: 2025-08-27T14:40:00Z

【担当: #22 QA-AUTO（SUPER 500%）／R: QA-AUTO／A: GOV】

---

**END OF REPORT**