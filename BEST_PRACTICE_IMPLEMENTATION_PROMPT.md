# 🏆 掲示板アプリ ベストプラクティス実装 & 包括的検証テストプロンプト

## 🎯 実装目標

### 達成すべき品質基準
```markdown
✅ アクセシビリティ: WCAG 2.1 Level AA準拠
✅ パフォーマンス: Core Web Vitals全指標良好
✅ セキュリティ: OWASP Top 10対策済み
✅ ユーザビリティ: Nielsen's 10 Heuristicsに準拠
✅ 保守性: Clean Architecture原則適用
```

## 🏗️ ベストプラクティス実装ガイド

### Architecture 1: レイヤードアーキテクチャ

#### 1.1 プロジェクト構造の最適化
```
src/
├── app/                      # Next.js App Router
│   ├── (auth)/              # 認証が必要なルートグループ
│   │   └── board/
│   └── api/
│       └── posts/
├── components/              # UIコンポーネント
│   ├── board/              # 掲示板専用コンポーネント
│   │   ├── PostCard/
│   │   ├── QuickPostCard/
│   │   └── PostDialog/
│   └── common/             # 共通コンポーネント
├── hooks/                  # カスタムフック
│   ├── usePostsData.ts    # 投稿データ管理
│   ├── useAccessibility.ts # アクセシビリティ管理
│   └── useOptimisticUpdate.ts
├── lib/                    # ビジネスロジック
│   ├── api/               # API通信層
│   ├── cache/             # キャッシュ戦略
│   ├── validation/        # バリデーション
│   └── accessibility/     # アクセシビリティユーティリティ
└── types/                 # 型定義
```

### Architecture 2: コンポーネント設計パターン

#### 2.1 Compound Component Pattern
```typescript
// src/components/board/PostCard/index.tsx
import { createContext, useContext } from 'react';

// Context for sharing state
const PostCardContext = createContext<PostCardContextType | null>(null);

// Main component
export function PostCard({ children, post }: PostCardProps) {
  const value = { post, /* other shared state */ };
  
  return (
    <PostCardContext.Provider value={value}>
      <article 
        role="article"
        aria-labelledby={`post-title-${post._id}`}
        className="post-card"
      >
        {children}
      </article>
    </PostCardContext.Provider>
  );
}

// Sub-components
PostCard.Header = function PostCardHeader() {
  const { post } = usePostCardContext();
  return (
    <header>
      <h3 id={`post-title-${post._id}`}>{post.title}</h3>
      {/* ... */}
    </header>
  );
};

PostCard.Content = function PostCardContent() {
  const { post } = usePostCardContext();
  return <div>{post.content}</div>;
};

PostCard.Actions = function PostCardActions() {
  // Actions implementation
};
```

### Implementation 1: アクセシビリティ完全対応

#### 1.1 改善されたQuickPostCard
```typescript
// src/components/board/QuickPostCard/QuickPostCard.tsx
'use client';

import { forwardRef, useRef, useImperativeHandle } from 'react';
import { Card, CardContent, Box, Avatar, Typography, Button } from '@mui/material';
import CreateIcon from '@mui/icons-material/Create';
import { useSession } from 'next-auth/react';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { useAnnounce } from '@/hooks/useAnnounce';

interface QuickPostCardProps {
  onOpen: () => void;
}

export interface QuickPostCardRef {
  restoreFocus: () => void;
}

const QuickPostCard = forwardRef<QuickPostCardRef, QuickPostCardProps>(
  ({ onOpen }, ref) => {
    const { data: session } = useSession();
    const buttonRef = useRef<HTMLButtonElement>(null);
    const { announce } = useAnnounce();
    
    useImperativeHandle(ref, () => ({
      restoreFocus: () => {
        buttonRef.current?.focus();
      }
    }));
    
    if (!session?.user) return null;
    
    const handleOpen = () => {
      // アクセシビリティアナウンス
      announce('新規投稿ダイアログを開いています');
      onOpen();
    };
    
    const userName = session.user.name || session.user.email?.split('@')[0] || 'ユーザー';
    const userInitial = userName[0]?.toUpperCase() || '?';
    
    return (
      <Card 
        sx={{ 
          mb: 3,
          background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
          transition: 'all 0.3s ease',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: 4,
          }
        }}
        role="region"
        aria-label="投稿作成エリア"
      >
        <CardContent>
          <Box display="flex" gap={2} alignItems="center">
            <Avatar 
              sx={{ bgcolor: 'primary.main' }}
              aria-hidden="true"
            >
              {userInitial}
            </Avatar>
            <Box flex={1}>
              <Typography 
                variant="body1" 
                color="text.secondary"
                id="quick-post-label"
              >
                {userName}さん、何か共有しませんか？
              </Typography>
            </Box>
            <Button
              ref={buttonRef}
              variant="contained"
              startIcon={<CreateIcon />}
              onClick={handleOpen}
              sx={{ minWidth: 120 }}
              aria-describedby="quick-post-label"
            >
              投稿する
            </Button>
          </Box>
        </CardContent>
      </Card>
    );
  }
);

QuickPostCard.displayName = 'QuickPostCard';

export default QuickPostCard;
```

#### 1.2 アクセシビリティフック
```typescript
// src/hooks/useAccessibility.ts
import { useEffect, useRef } from 'react';

export function useFocusTrap(isActive: boolean) {
  const containerRef = useRef<HTMLElement>(null);
  
  useEffect(() => {
    if (!isActive || !containerRef.current) return;
    
    const container = containerRef.current;
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;
    
    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      
      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement?.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement?.focus();
      }
    };
    
    container.addEventListener('keydown', handleTabKey);
    firstElement?.focus();
    
    return () => {
      container.removeEventListener('keydown', handleTabKey);
    };
  }, [isActive]);
  
  return containerRef;
}

export function useAnnounce() {
  const announceRef = useRef<HTMLDivElement | null>(null);
  
  useEffect(() => {
    // Create live region for announcements
    const announcer = document.createElement('div');
    announcer.setAttribute('role', 'status');
    announcer.setAttribute('aria-live', 'polite');
    announcer.setAttribute('aria-atomic', 'true');
    announcer.style.position = 'absolute';
    announcer.style.left = '-10000px';
    announcer.style.width = '1px';
    announcer.style.height = '1px';
    announcer.style.overflow = 'hidden';
    
    document.body.appendChild(announcer);
    announceRef.current = announcer;
    
    return () => {
      document.body.removeChild(announcer);
    };
  }, []);
  
  const announce = (message: string) => {
    if (announceRef.current) {
      announceRef.current.textContent = message;
      // Clear after announcement
      setTimeout(() => {
        if (announceRef.current) {
          announceRef.current.textContent = '';
        }
      }, 1000);
    }
  };
  
  return { announce };
}
```

### Implementation 2: データ管理の最適化

#### 2.1 状態管理とキャッシュ戦略
```typescript
// src/hooks/usePostsData.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { postsAPI } from '@/lib/api/posts';
import { useOptimisticUpdate } from './useOptimisticUpdate';

interface UsePostsDataOptions {
  page?: number;
  limit?: number;
  enableCache?: boolean;
  cacheTime?: number; // milliseconds
}

export function usePostsData(options: UsePostsDataOptions = {}) {
  const { 
    page = 1, 
    limit = 10, 
    enableCache = true,
    cacheTime = 5 * 60 * 1000 // 5 minutes
  } = options;
  
  const { data: session, status } = useSession();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  
  const cacheRef = useRef<{
    data: Post[];
    timestamp: number;
    page: number;
  } | null>(null);
  
  const { optimisticAdd, optimisticUpdate, optimisticDelete } = useOptimisticUpdate(
    posts,
    setPosts
  );
  
  // Fetch posts with cache strategy
  const fetchPosts = useCallback(async (forceFetch = false) => {
    // Check cache first
    if (enableCache && !forceFetch && cacheRef.current) {
      const age = Date.now() - cacheRef.current.timestamp;
      if (age < cacheTime && cacheRef.current.page === page) {
        setPosts(cacheRef.current.data);
        setLoading(false);
        return;
      }
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const data = await postsAPI.fetchPosts(page, limit);
      
      // Update cache
      cacheRef.current = {
        data: data.posts,
        timestamp: Date.now(),
        page
      };
      
      setPosts(data.posts);
      setPagination(data.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : '投稿の取得に失敗しました');
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [page, limit, enableCache, cacheTime]);
  
  // Create post with optimistic update
  const createPost = useCallback(async (data: CreatePostData) => {
    const tempId = `temp-${Date.now()}`;
    const optimisticPost: Post = {
      _id: tempId,
      ...data,
      author: session?.user?.id || '',
      authorName: session?.user?.name || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    // Optimistic update
    optimisticAdd(optimisticPost);
    
    try {
      const created = await postsAPI.createPost(data);
      
      // Replace optimistic with real data
      setPosts(prev => prev.map(p => 
        p._id === tempId ? created : p
      ));
      
      // Invalidate cache
      cacheRef.current = null;
      
      return created;
    } catch (error) {
      // Rollback optimistic update
      setPosts(prev => prev.filter(p => p._id !== tempId));
      throw error;
    }
  }, [session, optimisticAdd]);
  
  // Update post with optimistic update
  const updatePost = useCallback(async (id: string, data: UpdatePostData) => {
    const originalPost = posts.find(p => p._id === id);
    if (!originalPost) throw new Error('Post not found');
    
    // Optimistic update
    optimisticUpdate(id, data);
    
    try {
      const updated = await postsAPI.updatePost(id, data);
      
      // Replace with real data
      setPosts(prev => prev.map(p => 
        p._id === id ? updated : p
      ));
      
      // Invalidate cache
      cacheRef.current = null;
      
      return updated;
    } catch (error) {
      // Rollback
      setPosts(prev => prev.map(p => 
        p._id === id ? originalPost : p
      ));
      throw error;
    }
  }, [posts, optimisticUpdate]);
  
  // Delete post with optimistic update
  const deletePost = useCallback(async (id: string) => {
    const originalPosts = [...posts];
    
    // Optimistic delete
    optimisticDelete(id);
    
    try {
      await postsAPI.deletePost(id);
      
      // Invalidate cache
      cacheRef.current = null;
    } catch (error) {
      // Rollback
      setPosts(originalPosts);
      throw error;
    }
  }, [posts, optimisticDelete]);
  
  // Initial fetch
  useEffect(() => {
    if (status === 'authenticated') {
      fetchPosts();
    }
  }, [status, fetchPosts]);
  
  // Refetch on window focus
  useEffect(() => {
    const handleFocus = () => {
      if (status === 'authenticated') {
        fetchPosts();
      }
    };
    
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [status, fetchPosts]);
  
  return {
    posts,
    loading,
    error,
    pagination,
    refetch: () => fetchPosts(true),
    createPost,
    updatePost,
    deletePost,
  };
}
```

### Implementation 3: パフォーマンス最適化

#### 3.1 仮想化とメモ化
```typescript
// src/components/board/PostList/VirtualizedPostList.tsx
import { memo, useCallback } from 'react';
import { VariableSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import { PostCard } from '../PostCard';

interface VirtualizedPostListProps {
  posts: Post[];
  onEdit: (post: Post) => void;
  onDelete: (id: string) => void;
  currentUserId?: string;
}

const PostItem = memo(({ index, style, data }: any) => {
  const { posts, onEdit, onDelete, currentUserId } = data;
  const post = posts[index];
  
  return (
    <div style={style}>
      <PostCard
        post={post}
        onEdit={onEdit}
        onDelete={onDelete}
        isOwner={currentUserId === post.author}
      />
    </div>
  );
});

PostItem.displayName = 'PostItem';

export const VirtualizedPostList = memo(({
  posts,
  onEdit,
  onDelete,
  currentUserId
}: VirtualizedPostListProps) => {
  
  const getItemSize = useCallback((index: number) => {
    // Calculate dynamic height based on content
    const post = posts[index];
    const baseHeight = 200;
    const contentHeight = Math.ceil(post.content.length / 50) * 20;
    return baseHeight + contentHeight;
  }, [posts]);
  
  const itemData = {
    posts,
    onEdit,
    onDelete,
    currentUserId
  };
  
  return (
    <AutoSizer>
      {({ height, width }) => (
        <List
          height={height}
          itemCount={posts.length}
          itemSize={getItemSize}
          width={width}
          itemData={itemData}
        >
          {PostItem}
        </List>
      )}
    </AutoSizer>
  );
});

VirtualizedPostList.displayName = 'VirtualizedPostList';
```

## 🧪 包括的検証テスト実装

### Test Suite 1: E2Eテスト（Playwright）

#### 1.1 セットアップ
```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html'],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['json', { outputFile: 'test-results/results.json' }]
  ],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    // Mobile testing
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    port: 3000,
    reuseExistingServer: !process.env.CI,
  },
});
```

#### 1.2 アクセシビリティE2Eテスト
```typescript
// tests/e2e/accessibility.spec.ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('アクセシビリティテスト', () => {
  test.beforeEach(async ({ page }) => {
    // ログイン
    await page.goto('/auth/signin');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/board');
  });
  
  test('掲示板ページがWCAG 2.1 AA準拠', async ({ page }) => {
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });
  
  test('キーボードナビゲーションが正常動作', async ({ page }) => {
    // Tab キーでナビゲーション
    await page.keyboard.press('Tab');
    const firstFocused = await page.evaluate(() => document.activeElement?.className);
    expect(firstFocused).toBeTruthy();
    
    // Enter キーで投稿ダイアログを開く
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');
    
    // ダイアログが開いたことを確認
    await expect(page.getByRole('dialog')).toBeVisible();
    
    // Escape キーでダイアログを閉じる
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });
  
  test('スクリーンリーダー用のアナウンスが機能', async ({ page }) => {
    // aria-live regionの存在確認
    const liveRegion = await page.$('[aria-live="polite"]');
    expect(liveRegion).toBeTruthy();
    
    // 投稿作成時のアナウンス確認
    await page.click('button:has-text("投稿する")');
    
    const announcement = await page.evaluate(() => {
      const region = document.querySelector('[aria-live="polite"]');
      return region?.textContent;
    });
    
    expect(announcement).toContain('新規投稿ダイアログ');
  });
});
```

### Test Suite 2: 統合テスト（Jest + React Testing Library）

#### 2.1 データ同期テスト
```typescript
// tests/integration/data-sync.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SessionProvider } from 'next-auth/react';
import BoardPage from '@/app/board/page';
import { server } from '@/tests/mocks/server';
import { rest } from 'msw';

describe('データ同期統合テスト', () => {
  const mockSession = {
    user: {
      id: 'user-123',
      name: 'Test User',
      email: 'test@example.com'
    }
  };
  
  beforeEach(() => {
    // Clear cache
    sessionStorage.clear();
    localStorage.clear();
  });
  
  test('新規投稿が即座に反映される', async () => {
    const user = userEvent.setup();
    
    render(
      <SessionProvider session={mockSession}>
        <BoardPage />
      </SessionProvider>
    );
    
    // 初期表示を待つ
    await waitFor(() => {
      expect(screen.getByText('会員制掲示板')).toBeInTheDocument();
    });
    
    // 投稿作成ボタンをクリック
    const createButton = screen.getByRole('button', { name: /投稿する/ });
    await user.click(createButton);
    
    // ダイアログが表示される
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    
    // フォームに入力
    await user.type(screen.getByLabelText('タイトル'), 'テスト投稿');
    await user.type(screen.getByLabelText('内容'), 'テスト内容');
    
    // 送信
    await user.click(screen.getByRole('button', { name: /投稿/ }));
    
    // 新規投稿が即座に表示される
    await waitFor(() => {
      expect(screen.getByText('テスト投稿')).toBeInTheDocument();
    });
  });
  
  test('ネットワークエラー時の楽観的更新とロールバック', async () => {
    const user = userEvent.setup();
    
    // エラーレスポンスを設定
    server.use(
      rest.post('/api/posts', (req, res, ctx) => {
        return res(ctx.status(500), ctx.json({ error: 'Server error' }));
      })
    );
    
    render(
      <SessionProvider session={mockSession}>
        <BoardPage />
      </SessionProvider>
    );
    
    // 投稿作成
    await user.click(screen.getByRole('button', { name: /投稿する/ }));
    await user.type(screen.getByLabelText('タイトル'), 'エラーテスト');
    await user.type(screen.getByLabelText('内容'), 'エラー内容');
    await user.click(screen.getByRole('button', { name: /投稿/ }));
    
    // 楽観的更新で一時的に表示
    expect(screen.getByText('エラーテスト')).toBeInTheDocument();
    
    // エラー後にロールバック
    await waitFor(() => {
      expect(screen.queryByText('エラーテスト')).not.toBeInTheDocument();
      expect(screen.getByText(/保存に失敗しました/)).toBeInTheDocument();
    });
  });
});
```

### Test Suite 3: パフォーマンステスト

#### 3.1 Lighthouse CI設定
```javascript
// lighthouserc.js
module.exports = {
  ci: {
    collect: {
      url: [
        'http://localhost:3000/',
        'http://localhost:3000/board',
        'http://localhost:3000/auth/signin'
      ],
      numberOfRuns: 3,
      settings: {
        preset: 'desktop',
        throttling: {
          cpuSlowdownMultiplier: 1,
        },
      },
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 0.95 }],
        'categories:best-practices': ['error', { minScore: 0.9 }],
        'categories:seo': ['error', { minScore: 0.9 }],
        'first-contentful-paint': ['error', { maxNumericValue: 2000 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'total-blocking-time': ['error', { maxNumericValue: 300 }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
```

#### 3.2 負荷テスト（k6）
```javascript
// tests/load/board-load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '30s', target: 10 },  // Ramp up to 10 users
    { duration: '1m', target: 10 },   // Stay at 10 users
    { duration: '30s', target: 50 },  // Ramp up to 50 users
    { duration: '2m', target: 50 },   // Stay at 50 users
    { duration: '30s', target: 0 },   // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests under 500ms
    errors: ['rate<0.1'],              // Error rate under 10%
  },
};

const BASE_URL = 'http://localhost:3000';

export default function() {
  // ログイン
  const loginRes = http.post(`${BASE_URL}/api/auth/signin`, {
    email: 'test@example.com',
    password: 'password123',
  });
  
  check(loginRes, {
    'login successful': (r) => r.status === 200,
  });
  
  const authToken = loginRes.json('token');
  
  // 投稿一覧取得
  const params = {
    headers: {
      'Authorization': `Bearer ${authToken}`,
    },
  };
  
  const postsRes = http.get(`${BASE_URL}/api/posts`, params);
  
  check(postsRes, {
    'posts fetched': (r) => r.status === 200,
    'posts returned': (r) => JSON.parse(r.body).posts.length >= 0,
    'response time OK': (r) => r.timings.duration < 500,
  });
  
  errorRate.add(postsRes.status !== 200);
  
  // 新規投稿作成
  if (Math.random() > 0.7) { // 30% chance
    const createRes = http.post(
      `${BASE_URL}/api/posts`,
      JSON.stringify({
        title: `Load Test ${Date.now()}`,
        content: 'Load test content',
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
      }
    );
    
    check(createRes, {
      'post created': (r) => r.status === 201,
    });
    
    errorRate.add(createRes.status !== 201);
  }
  
  sleep(1);
}
```

## 🔍 検証チェックリスト

### 自動検証項目
```yaml
# .github/workflows/test.yml
name: Comprehensive Testing

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test:unit
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v3

  integration-tests:
    runs-on: ubuntu-latest
    services:
      mongodb:
        image: mongo:6
        ports:
          - 27017:27017
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test:integration

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npx playwright install
      - run: npm run test:e2e

  accessibility-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run build
      - run: npm run test:a11y

  performance-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run build
      - run: npm run lhci:ci

  security-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm audit
      - uses: aquasecurity/trivy-action@master
```

### 手動検証項目
```markdown
## 🔲 機能テスト
- [ ] ログイン/ログアウトが正常動作
- [ ] 投稿の作成/編集/削除が正常動作
- [ ] ページ遷移後もデータが保持される
- [ ] リロード後もセッションが維持される

## 🔲 アクセシビリティテスト
- [ ] キーボードのみで全操作可能
- [ ] スクリーンリーダーで正しく読み上げ
- [ ] 高コントラストモードで視認可能
- [ ] 200%ズームでレイアウト崩れなし

## 🔲 パフォーマンステスト
- [ ] FCP < 1.8秒
- [ ] LCP < 2.5秒
- [ ] CLS < 0.1
- [ ] FID < 100ms

## 🔲 互換性テスト
- [ ] Chrome/Edge (最新2バージョン)
- [ ] Firefox (最新2バージョン)
- [ ] Safari (最新2バージョン)
- [ ] iOS Safari
- [ ] Android Chrome

## 🔲 セキュリティテスト
- [ ] XSS攻撃への耐性
- [ ] CSRF保護の確認
- [ ] SQLインジェクション対策
- [ ] 認証/認可の適切な実装
```

## 📊 品質メトリクス目標

### コード品質
```javascript
// sonar-project.properties
sonar.projectKey=board-app
sonar.sources=src
sonar.tests=tests
sonar.javascript.lcov.reportPaths=coverage/lcov.info
sonar.coverage.exclusions=**/*.test.ts,**/*.spec.ts,**/mocks/**

// Quality Gates
// - Coverage > 80%
// - Duplications < 3%
// - Maintainability Rating: A
// - Reliability Rating: A
// - Security Rating: A
```

### パフォーマンス目標
```javascript
// performance-budget.json
{
  "timings": {
    "firstContentfulPaint": 1800,
    "largestContentfulPaint": 2500,
    "firstInputDelay": 100,
    "cumulativeLayoutShift": 0.1
  },
  "resourceSizes": {
    "javascript": 300000,  // 300KB
    "css": 60000,         // 60KB
    "images": 500000,     // 500KB
    "total": 1000000      // 1MB
  },
  "resourceCounts": {
    "third-party": 5,
    "fonts": 2
  }
}
```

## 🚀 実装優先順位

### Phase 1: 基盤整備（1日）
1. アーキテクチャ構造の整理
2. 基本的なフック実装
3. アクセシビリティユーティリティ

### Phase 2: コア機能実装（2日）
1. QuickPostCard改善
2. データ管理フック
3. 楽観的更新実装

### Phase 3: 最適化（1日）
1. 仮想化実装
2. パフォーマンス最適化
3. キャッシュ戦略実装

### Phase 4: テスト実装（2日）
1. E2Eテストスイート
2. 統合テスト
3. パフォーマンステスト
4. CI/CD設定

---
*このプロンプトを使用して、プロダクションレディな高品質アプリケーションを構築してください。*