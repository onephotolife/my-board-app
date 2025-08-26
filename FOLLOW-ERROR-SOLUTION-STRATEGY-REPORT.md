# フォロー機能エラー解決戦略レポート

## 作成日時
2025年8月26日

## エグゼクティブサマリー
フォロー機能の500エラーと429エラーに対する解決戦略を策定しました。優先度1の解決策（Next.js 15 params非同期対応）は、APIエンドポイントの修正により全フォロー操作を正常化します。影響範囲は限定的で、リスクも低く、実装は1時間以内に完了可能です。

---

## 1. 解決策の策定

### 1.1 優先度順の原因と解決策

| 優先度 | 原因 | 解決策 | 実装難易度 | 所要時間 |
|--------|------|--------|-----------|----------|
| **1** | Next.js 15 params非同期化 | params型をPromiseに変更しawait | 低 | 30分 |
| **2** | 無効なMongoDBObjectID | テストデータを有効なObjectIDに変更 | 低 | 15分 |
| **3** | レート制限の最適化 | 開発環境用の緩和設定追加 | 中 | 30分 |

### 1.2 解決策の詳細

#### 解決策1: Next.js 15 params非同期対応（優先度: 最高）

**実装内容**:
```typescript
// 修正前
export async function POST(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  // params.userIdを直接使用

// 修正後
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  // userIdを使用
```

**影響ファイル**:
1. `/src/app/api/follow/[userId]/route.ts`
2. `/src/app/api/users/[userId]/follow/route.ts`
3. `/src/app/api/users/[userId]/followers/route.ts`
4. `/src/app/api/users/[userId]/following/route.ts`

#### 解決策2: 有効なObjectID使用（優先度: 高）

**実装内容**:
```typescript
// 修正前
<FollowButton userId="test-user-3" size="small" />

// 修正後（案1: モックユーザーのObjectIDを使用）
<FollowButton userId="68ad36cbfd831a5fbd96b575" size="small" />

// 修正後（案2: 動的にテストユーザーを作成）
const testUserId = await createTestUser();
<FollowButton userId={testUserId} size="small" />
```

**影響ファイル**:
1. `/src/app/test-follow/page.tsx`
2. テスト用のユーザー作成APIの追加が必要

#### 解決策3: レート制限の環境別設定（優先度: 中）

**実装内容**:
```typescript
// 開発環境では緩和された制限を使用
export const apiRateLimiter = new RateLimiterV2({
  max: process.env.NODE_ENV === 'development' ? 100 : 30,
  window: 60000,
  maxItems: 10000,
});
```

---

## 2. 解決策の評価

### 2.1 評価マトリクス

| 評価軸 | 解決策1 (Next.js 15) | 解決策2 (ObjectID) | 解決策3 (レート制限) |
|--------|---------------------|-------------------|-------------------|
| **効果** | ★★★★★ 全エラー解決 | ★★★★☆ 一部エラー解決 | ★★☆☆☆ 利便性向上 |
| **実装容易性** | ★★★★★ 機械的修正 | ★★★★☆ 単純修正 | ★★★☆☆ 設定調整 |
| **リスク** | ★★★★★ 低リスク | ★★★★★ 低リスク | ★★★☆☆ 中リスク |
| **保守性** | ★★★★★ 標準準拠 | ★★★★☆ 良好 | ★★★☆☆ 普通 |
| **緊急性** | ★★★★★ 最優先 | ★★★★☆ 高 | ★★☆☆☆ 中 |

### 2.2 推奨実装順序

1. **第1段階（即座）**: 解決策1を実装 → 全500エラーが解消
2. **第2段階（1日以内）**: 解決策2を実装 → テスト環境の完全正常化
3. **第3段階（1週間以内）**: 解決策3を実装 → 開発効率の向上

---

## 3. 優先度1解決策の影響範囲

### 3.1 直接影響を受けるAPIエンドポイント

| エンドポイント | ファイル | 現状 | 修正必要 |
|---------------|----------|------|----------|
| `/api/follow/[userId]` | `follow/[userId]/route.ts` | ❌ エラー | ✅ 要修正 |
| `/api/users/[userId]/follow` | `users/[userId]/follow/route.ts` | ❌ エラー | ✅ 要修正 |
| `/api/users/[userId]/followers` | `users/[userId]/followers/route.ts` | ❌ エラー | ✅ 要修正 |
| `/api/users/[userId]/following` | `users/[userId]/following/route.ts` | ❌ エラー | ✅ 要修正 |
| `/api/posts/[id]` | `posts/[id]/route.ts` | ✅ 正常 | ❌ 不要 |
| `/api/reports/[id]` | `reports/[id]/route.ts` | ✅ 正常 | ❌ 不要 |

### 3.2 影響を受けるフロントエンドコンポーネント

| コンポーネント | ファイル | 影響度 | 対応 |
|---------------|----------|--------|------|
| FollowButton | `/src/components/FollowButton.tsx` | 高 | APIエラー解消で正常化 |
| PostCardWithFollow | `/src/components/PostCardWithFollow.tsx` | 中 | 同上 |
| UserCard | `/src/components/UserCard.tsx` | 中 | 同上 |
| test-follow | `/src/app/test-follow/page.tsx` | 高 | ObjectID修正も必要 |

---

## 4. ファイル構造と依存関係

### 4.1 APIルート構造
```
src/app/api/
├── follow/
│   └── [userId]/
│       └── route.ts      # メインフォローAPI（要修正）
├── users/
│   └── [userId]/
│       ├── follow/
│       │   └── route.ts  # 代替フォローAPI（要修正）
│       ├── followers/
│       │   └── route.ts  # フォロワー一覧（要修正）
│       └── following/
│           └── route.ts  # フォロー中一覧（要修正）
└── posts/
    └── [id]/
        └── route.ts      # 正常（既に修正済み）
```

### 4.2 依存関係図
```
FollowButton.tsx
    ├── CSRFProvider（CSRFトークン取得）
    ├── /api/follow/[userId]（フォロー/アンフォロー）
    └── Socket.io（リアルタイム更新）
        
test-follow/page.tsx
    └── FollowButton（複数インスタンス）

PostCardWithFollow.tsx / UserCard.tsx
    └── FollowButton
```

---

## 5. 単体テスト設計

### 5.1 APIエンドポイントテスト

#### テストケース: `/api/follow/[userId]/route.ts`

```javascript
// test/api/follow.test.js
describe('Follow API', () => {
  // OKパターン
  test('有効なuserIdでフォロー成功', async () => {
    const validUserId = '68ad36cbfd831a5fbd96b575';
    const response = await POST('/api/follow/' + validUserId);
    expect(response.status).toBe(200);
    expect(response.body.isFollowing).toBe(true);
  });

  // NGパターンと対処法
  test('無効なObjectIDでエラー', async () => {
    const invalidUserId = 'invalid-id';
    const response = await POST('/api/follow/' + invalidUserId);
    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/invalid.*objectid/i);
    // 対処法: クライアント側でObjectID形式をバリデーション
  });

  test('自分自身をフォロー', async () => {
    const selfUserId = getCurrentUserId();
    const response = await POST('/api/follow/' + selfUserId);
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Cannot follow yourself');
    // 対処法: UIで自分のフォローボタンを非表示
  });

  test('存在しないユーザー', async () => {
    const nonExistentId = '000000000000000000000000';
    const response = await POST('/api/follow/' + nonExistentId);
    expect(response.status).toBe(404);
    // 対処法: ユーザー存在確認を事前に実施
  });

  test('認証なしでアクセス', async () => {
    const response = await POST('/api/follow/validId', { noAuth: true });
    expect(response.status).toBe(401);
    // 対処法: 認証ミドルウェアで自動リダイレクト
  });
});
```

### 5.2 コンポーネントテスト

#### テストケース: `FollowButton.tsx`

```javascript
// test/components/FollowButton.test.tsx
describe('FollowButton Component', () => {
  // OKパターン
  test('フォローボタンクリックで状態変更', async () => {
    render(<FollowButton userId="validId" />);
    const button = screen.getByRole('button');
    
    await userEvent.click(button);
    expect(button).toHaveTextContent('フォロー中');
    expect(mockAPI).toHaveBeenCalledWith('/api/follow/validId', 'POST');
  });

  // NGパターンと対処法
  test('APIエラー時にエラー表示', async () => {
    mockAPI.mockRejectedValue(new Error('500'));
    render(<FollowButton userId="invalidId" />);
    
    await userEvent.click(screen.getByRole('button'));
    expect(screen.getByText('エラーが発生しました')).toBeInTheDocument();
    // 対処法: エラーメッセージを3秒後に自動消去
  });

  test('連続クリック防止', async () => {
    render(<FollowButton userId="validId" />);
    const button = screen.getByRole('button');
    
    await userEvent.click(button);
    await userEvent.click(button); // 2回目
    
    expect(mockAPI).toHaveBeenCalledTimes(1); // 1回のみ
    // 対処法: デバウンスまたはローディング中は無効化
  });
});
```

---

## 6. 結合テスト設計

### 6.1 フォロー機能E2Eテスト

```javascript
// test/e2e/follow.spec.js
describe('フォロー機能統合テスト', () => {
  // OKパターン
  test('ユーザーAがユーザーBをフォロー', async () => {
    // 1. ユーザーAでログイン
    await login('userA@example.com');
    
    // 2. ユーザーBのプロフィールへ移動
    await page.goto('/users/userB');
    
    // 3. フォローボタンクリック
    await page.click('[data-testid="follow-button"]');
    
    // 4. 状態確認
    await expect(page.locator('[data-testid="follow-button"]'))
      .toHaveText('フォロー中');
    
    // 5. データベース確認
    const follow = await db.follows.findOne({ 
      follower: 'userA', 
      following: 'userB' 
    });
    expect(follow).toBeTruthy();
    
    // 6. カウント確認
    const userA = await db.users.findById('userA');
    expect(userA.followingCount).toBe(1);
  });

  // NGパターンと対処法
  test('レート制限エラーの処理', async () => {
    await login('userA@example.com');
    
    // 31回連続でフォロー操作
    for (let i = 0; i < 31; i++) {
      await page.click('[data-testid="follow-button"]');
      await page.waitForTimeout(100);
    }
    
    // エラーメッセージ確認
    await expect(page.locator('[data-testid="error-message"]'))
      .toHaveText('しばらくお待ちください');
    
    // 対処法: 1分後に自動リトライまたは手動リトライボタン表示
  });

  test('ネットワークエラー時のフォールバック', async () => {
    await page.route('**/api/follow/**', route => route.abort());
    
    await page.click('[data-testid="follow-button"]');
    
    // オフライン表示
    await expect(page.locator('[data-testid="offline-message"]'))
      .toBeVisible();
    
    // 対処法: ローカルストレージに保存し、復旧時に同期
  });
});
```

### 6.2 相互フォロー機能テスト

```javascript
describe('相互フォロー統合テスト', () => {
  test('相互フォロー成立', async () => {
    // ユーザーAがBをフォロー
    await loginAs('userA');
    await followUser('userB');
    
    // ユーザーBがAをフォロー
    await loginAs('userB');
    await followUser('userA');
    
    // 相互フォロー確認
    const followAB = await db.follows.findOne({ 
      follower: 'userA', 
      following: 'userB' 
    });
    expect(followAB.isReciprocal).toBe(true);
    
    // カウント確認
    const userA = await db.users.findById('userA');
    expect(userA.mutualFollowsCount).toBe(1);
  });
});
```

---

## 7. 包括テスト設計

### 7.1 パフォーマンステスト

```javascript
// test/performance/follow.perf.js
describe('フォロー機能パフォーマンステスト', () => {
  // OKパターン
  test('100ユーザー同時フォロー', async () => {
    const users = await createTestUsers(100);
    const startTime = Date.now();
    
    const promises = users.map(user => 
      followUser(user.id)
    );
    
    await Promise.all(promises);
    const duration = Date.now() - startTime;
    
    expect(duration).toBeLessThan(5000); // 5秒以内
    
    // データ整合性確認
    const followCount = await db.follows.count();
    expect(followCount).toBe(100);
  });

  // NGパターンと対処法
  test('メモリリーク検知', async () => {
    const initialMemory = process.memoryUsage().heapUsed;
    
    // 1000回フォロー/アンフォロー
    for (let i = 0; i < 1000; i++) {
      await followUser('testUser');
      await unfollowUser('testUser');
    }
    
    global.gc(); // ガベージコレクション強制実行
    const finalMemory = process.memoryUsage().heapUsed;
    
    const leak = finalMemory - initialMemory;
    expect(leak).toBeLessThan(10 * 1024 * 1024); // 10MB未満
    
    // 対処法: イベントリスナーの適切な解除、キャッシュサイズ制限
  });
});
```

### 7.2 セキュリティテスト

```javascript
// test/security/follow.security.js
describe('フォロー機能セキュリティテスト', () => {
  // OKパターン
  test('CSRF保護確認', async () => {
    const response = await fetch('/api/follow/userId', {
      method: 'POST',
      headers: {
        // CSRFトークンなし
      }
    });
    
    expect(response.status).toBe(403);
    expect(response.body.error).toMatch(/csrf/i);
  });

  // NGパターンと対処法
  test('SQLインジェクション防御', async () => {
    const maliciousId = "'; DROP TABLE users; --";
    const response = await POST('/api/follow/' + maliciousId);
    
    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/invalid/i);
    
    // データベース確認
    const tableExists = await db.tableExists('users');
    expect(tableExists).toBe(true);
    
    // 対処法: パラメータバリデーション、プリペアドステートメント使用
  });

  test('権限昇格攻撃防御', async () => {
    await loginAs('normalUser');
    
    // 他人のフォロー関係を操作しようとする
    const response = await fetch('/api/follow/adminUser', {
      method: 'POST',
      headers: {
        'X-User-Id': 'adminUser' // ヘッダー改ざん
      }
    });
    
    expect(response.status).toBe(401);
    
    // 対処法: セッションベースの認証、JWTの署名検証
  });
});
```

### 7.3 アクセシビリティテスト

```javascript
// test/a11y/follow.a11y.js
describe('フォロー機能アクセシビリティテスト', () => {
  test('スクリーンリーダー対応', async () => {
    const { container } = render(<FollowButton userId="testUser" />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveAccessibleName(/フォロー/);
    expect(button).toHaveAttribute('aria-pressed', 'false');
    
    await userEvent.click(button);
    expect(button).toHaveAttribute('aria-pressed', 'true');
    
    // axe-coreでの自動検証
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  test('キーボード操作', async () => {
    render(<FollowButton userId="testUser" />);
    
    const button = screen.getByRole('button');
    button.focus();
    
    await userEvent.keyboard('{Enter}');
    expect(button).toHaveTextContent('フォロー中');
    
    await userEvent.keyboard(' '); // スペースキー
    expect(button).toHaveTextContent('フォロー');
  });
});
```

---

## 8. リスク評価と軽減策

### 8.1 リスクマトリクス

| リスク | 発生可能性 | 影響度 | 軽減策 |
|--------|-----------|--------|--------|
| 修正漏れによる一部API故障 | 低 | 高 | 全動的ルートの網羅的検索と確認 |
| 型変更による新規バグ | 低 | 中 | TypeScript厳格モード、単体テスト |
| パフォーマンス劣化 | 極低 | 低 | awaitは1回のみ、影響なし |
| 既存機能への影響 | 極低 | 高 | 段階的リリース、カナリアデプロイ |

### 8.2 ロールバック計画

```bash
# 問題発生時の即座のロールバック手順
1. git revert HEAD  # 最新コミットを取り消し
2. npm run build    # ビルド確認
3. npm run test     # テスト実行
4. git push origin main  # デプロイ
```

---

## 9. 実装手順（推奨）

### 9.1 第1段階: Next.js 15対応（30分）

```bash
# 1. ブランチ作成
git checkout -b fix/nextjs15-async-params

# 2. 修正実施
# - /src/app/api/follow/[userId]/route.ts
# - /src/app/api/users/[userId]/follow/route.ts
# - /src/app/api/users/[userId]/followers/route.ts
# - /src/app/api/users/[userId]/following/route.ts

# 3. 型チェック
npm run typecheck

# 4. テスト実行
npm run test:api

# 5. 動作確認
npm run dev
# http://localhost:3000/test-follow でテスト

# 6. コミット
git add .
git commit -m "fix: Next.js 15 async params対応 - フォローAPI修正"

# 7. PR作成
gh pr create --title "Fix: Next.js 15 async params対応" --body "..."
```

### 9.2 第2段階: テストデータ修正（15分）

```bash
# 1. テストユーザー作成API実装
# /src/app/api/test/create-follow-users/route.ts

# 2. test-followページ修正
# 有効なObjectIDを使用するよう変更

# 3. テスト実行
npm run test:e2e
```

### 9.3 第3段階: モニタリング設定

```javascript
// monitoring/follow-api.js
const monitor = {
  endpoints: [
    '/api/follow/*',
    '/api/users/*/follow',
    '/api/users/*/followers',
    '/api/users/*/following'
  ],
  metrics: ['response_time', 'error_rate', 'success_rate'],
  alerts: {
    error_rate: { threshold: 0.05, action: 'email' },
    response_time: { threshold: 1000, action: 'slack' }
  }
};
```

---

## 10. 成功基準

### 10.1 定量的基準

| メトリクス | 現状 | 目標 | 測定方法 |
|------------|------|------|----------|
| API成功率 | 0% | 99.9% | Datadog/CloudWatch |
| 平均応答時間 | N/A | <200ms | パフォーマンステスト |
| エラー率 | 100% | <0.1% | エラーログ監視 |
| テストカバレッジ | 0% | >80% | Jest coverage |

### 10.2 定性的基準

- ✅ フォローボタンが全ページで正常動作
- ✅ エラーメッセージが表示されない
- ✅ レート制限が適切に機能
- ✅ 相互フォロー機能が正常動作
- ✅ リアルタイム更新が機能

---

## 11. 結論

### 11.1 推奨アクション

1. **即座に実施**: Next.js 15 params非同期対応（優先度1）
   - 影響: 全500エラーの解消
   - リスク: 極低
   - 所要時間: 30分

2. **24時間以内**: テストデータ修正（優先度2）
   - 影響: テスト環境の完全正常化
   - リスク: なし
   - 所要時間: 15分

3. **1週間以内**: レート制限最適化（優先度3）
   - 影響: 開発効率向上
   - リスク: 低
   - 所要時間: 30分

### 11.2 期待される成果

- **即時効果**: フォロー機能の完全復旧
- **品質向上**: エラー率0.1%未満達成
- **開発効率**: テスト環境の安定化
- **ユーザー満足度**: 機能の信頼性向上

---

## 付録

### A. 修正コード例

```typescript
// /src/app/api/follow/[userId]/route.ts の修正例

// 修正前
export async function POST(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  if (currentUser._id.toString() === params.userId) {
    // エラー発生
  }
}

// 修正後
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  if (currentUser._id.toString() === userId) {
    // 正常動作
  }
}
```

### B. テストコマンド

```bash
# APIテスト
npm run test:api -- --watch

# E2Eテスト
npm run test:e2e -- --headed

# パフォーマンステスト
npm run test:perf

# 全テスト実行
npm run test:all
```

### C. 参考資料

- [Next.js 15 Migration Guide - Dynamic Params](https://nextjs.org/docs/messages/sync-dynamic-apis)
- [MongoDB ObjectID Specification](https://docs.mongodb.com/manual/reference/method/ObjectId/)
- [Jest Testing Best Practices](https://jestjs.io/docs/best-practices)
- [Playwright E2E Testing](https://playwright.dev/docs/intro)

---

**作成者**: チーフシステムアーキテクト  
**レビュー**: 保留中  
**承認**: 保留中

**署名**: I attest: all technical specifications and test designs come from the analyzed codebase evidence.