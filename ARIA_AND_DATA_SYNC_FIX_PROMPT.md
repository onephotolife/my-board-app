# 🔍 掲示板アプリ アクセシビリティ & データ同期問題 深層分析プロンプト

## 🚨 報告された問題

### 問題1: aria-hidden アクセシビリティ警告
```
エラー内容：
"Blocked aria-hidden on an element because its descendant retained focus."

発生タイミング：新規投稿ダイアログを開いた時
影響要素：QuickPostCard内のreadonly input要素
```

### 問題2: 投稿データの不整合
```
再現手順：
1. ログイン → 新規投稿作成
2. トップページへ遷移
3. 掲示板ページに戻る
4. 問題：作成した投稿が表示されない
```

## 🧠 深層分析フェーズ

### Phase 1: aria-hidden問題の根本原因

#### 1.1 問題の構造分析
```html
<!-- 問題のDOM構造 -->
<main aria-hidden="true">  <!-- ダイアログ開時に設定される -->
  <Container>
    <QuickPostCard>
      <input readonly class="MuiInputBase-input" />  <!-- フォーカスが残る -->
    </QuickPostCard>
  </Container>
  
  <Dialog open={true}>  <!-- ダイアログが開く -->
    ...
  </Dialog>
</main>
```

#### 1.2 なぜこのエラーが発生するか
```markdown
原因の連鎖：
1. QuickPostCardをクリック → inputにフォーカス
2. ダイアログが開く → MUIが自動的にmainにaria-hidden="true"を設定
3. しかし、QuickPostCardのinputにフォーカスが残ったまま
4. aria-hidden内にフォーカス要素 = アクセシビリティ違反
```

#### 1.3 アクセシビリティへの影響
```markdown
影響：
- スクリーンリーダーがフォーカス要素を読み上げられない
- キーボードナビゲーションが混乱する
- WCAG 2.1 違反（Level A）
```

### Phase 2: データ同期問題の根本原因

#### 2.1 データフロー分析
```typescript
// 現在の問題のあるフロー
1. 新規投稿作成 → POST /api/posts
2. レスポンス受信 → ローカルステート更新（setPosts）
3. ページ遷移 → コンポーネントアンマウント
4. 戻る → useEffectで再度fetch → 古いデータ？

// 可能性のある原因：
- キャッシュの問題
- 非同期処理のタイミング
- セッション状態の不整合
- MongoDB接続の遅延
```

#### 2.2 キャッシュ戦略の問題
```typescript
// Next.jsのfetchキャッシュ
fetch('/api/posts', {
  // cache設定がない = デフォルトキャッシュ使用
  // 結果：古いデータが返される可能性
});
```

## 📋 実装指示

### Solution 1: aria-hidden問題の修正

#### 1.1 QuickPostCardの改善
```typescript
// src/components/QuickPostCard.tsx

export default function QuickPostCard({ onOpen }: QuickPostCardProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // フォーカスを明示的に解除
    if (inputRef.current) {
      inputRef.current.blur();
    }
    
    // ダイアログを開く
    onOpen();
  };
  
  return (
    <Card 
      sx={{ 
        mb: 3,
        cursor: 'pointer',
        // ... styles
      }}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      aria-label="新規投稿を作成"
    >
      <CardContent>
        <Box display="flex" gap={2} alignItems="center">
          <Avatar>{userInitial}</Avatar>
          <TextField
            ref={inputRef}
            fullWidth
            placeholder={`${userName}さん、何か共有しませんか？`}
            onClick={handleClick}
            onFocus={(e) => {
              // フォーカス時に即座にダイアログを開く
              e.target.blur();
              onOpen();
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                // ... styles
              },
              pointerEvents: 'none', // クリックイベントを無効化
            }}
            InputProps={{
              readOnly: true,
              tabIndex: -1, // フォーカス不可にする
            }}
            inputProps={{
              'aria-hidden': 'true', // スクリーンリーダーから隠す
              tabIndex: -1,
            }}
          />
        </Box>
      </CardContent>
    </Card>
  );
}
```

#### 1.2 Dialogコンポーネントの改善
```typescript
// src/app/board/page.tsx

<Dialog 
  open={openDialog} 
  onClose={handleCloseDialog}
  maxWidth="sm" 
  fullWidth
  disableRestoreFocus // 閉じた時のフォーカス復元を無効化
  onTransitionEnd={() => {
    // ダイアログのトランジション完了後にフォーカス管理
    if (openDialog) {
      // タイトル入力にフォーカス
      const titleInput = document.querySelector('[name="title"]') as HTMLInputElement;
      titleInput?.focus();
    }
  }}
  PaperProps={{
    sx: { borderRadius: 2 },
    role: 'dialog',
    'aria-labelledby': 'post-dialog-title',
    'aria-describedby': 'post-dialog-description',
  }}
>
  <DialogTitle id="post-dialog-title">
    {editingPost ? '投稿を編集' : '新規投稿'}
  </DialogTitle>
  <DialogContent id="post-dialog-description">
    <TextField
      autoFocus
      name="title"
      // ...
    />
  </DialogContent>
</Dialog>
```

### Solution 2: データ同期問題の修正

#### 2.1 fetchのキャッシュ無効化
```typescript
// src/app/board/page.tsx

const fetchPosts = async (page: number = 1) => {
  setLoading(true);
  setError('');
  
  try {
    // キャッシュを無効化
    const response = await fetch(`/api/posts?page=${page}&limit=10`, {
      cache: 'no-store', // キャッシュを使用しない
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
      },
    });
    
    const data = await response.json();
    console.log(`投稿取得: ${data.posts?.length || 0}件 (${new Date().toISOString()})`);
    
    // ... rest of the code
  } catch (err) {
    // ... error handling
  }
};

// 投稿作成後の即座の反映
const handleSave = async () => {
  try {
    const url = editingPost
      ? `/api/posts/${editingPost._id}`
      : '/api/posts';
    const method = editingPost ? 'PUT' : 'POST';

    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
      cache: 'no-store', // キャッシュ無効化
    });

    if (!response.ok) throw new Error('保存に失敗しました');
    
    const savedPost = await response.json();
    
    // リアルタイム更新
    if (editingPost) {
      setPosts(prevPosts => 
        prevPosts.map(post => 
          post._id === savedPost._id ? savedPost : post
        )
      );
    } else {
      // 新規投稿の場合、すぐに反映
      setPosts(prevPosts => [savedPost, ...prevPosts]);
      
      // さらに確実にするため、少し遅れて再取得
      setTimeout(() => {
        fetchPosts(1);
      }, 500);
    }

    handleCloseDialog();
  } catch (error) {
    console.error('保存エラー:', error);
    setError('保存に失敗しました');
  }
};
```

#### 2.2 ページ遷移時のデータ保持
```typescript
// src/app/board/page.tsx

// データをセッションストレージに保存
useEffect(() => {
  if (posts.length > 0) {
    sessionStorage.setItem('boardPosts', JSON.stringify({
      posts,
      timestamp: Date.now(),
    }));
  }
}, [posts]);

// 初回ロード時にセッションストレージから復元
useEffect(() => {
  const cached = sessionStorage.getItem('boardPosts');
  if (cached) {
    const { posts: cachedPosts, timestamp } = JSON.parse(cached);
    const age = Date.now() - timestamp;
    
    // 5分以内のキャッシュは使用
    if (age < 5 * 60 * 1000) {
      setPosts(cachedPosts);
      setLoading(false);
    }
  }
}, []);
```

### Solution 3: 包括的な改善実装

#### 3.1 改善されたQuickPostCard
```typescript
// src/components/QuickPostCard.tsx
'use client';

import { Card, CardContent, Box, Avatar, Typography, Button } from '@mui/material';
import CreateIcon from '@mui/icons-material/Create';
import { useSession } from 'next-auth/react';

interface QuickPostCardProps {
  onOpen: () => void;
}

export default function QuickPostCard({ onOpen }: QuickPostCardProps) {
  const { data: session } = useSession();
  
  if (!session?.user) return null;
  
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
    >
      <CardContent>
        <Box display="flex" gap={2} alignItems="center">
          <Avatar sx={{ bgcolor: 'primary.main' }}>
            {userInitial}
          </Avatar>
          <Box flex={1}>
            <Typography variant="body1" color="text.secondary">
              {userName}さん、何か共有しませんか？
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<CreateIcon />}
            onClick={onOpen}
            sx={{ minWidth: 120 }}
          >
            投稿する
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
}
```

#### 3.2 改善されたAPI呼び出し
```typescript
// src/lib/api/posts.ts (新規)
const API_BASE = '/api/posts';

export const postsAPI = {
  // 投稿一覧取得（キャッシュ無効化）
  async fetchPosts(page = 1, limit = 10) {
    const timestamp = Date.now();
    const response = await fetch(
      `${API_BASE}?page=${page}&limit=${limit}&t=${timestamp}`,
      {
        cache: 'no-store',
        next: { revalidate: 0 },
      }
    );
    
    if (!response.ok) {
      throw new Error(`Failed to fetch posts: ${response.status}`);
    }
    
    return response.json();
  },
  
  // 投稿作成
  async createPost(data: { title: string; content: string }) {
    const response = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      cache: 'no-store',
    });
    
    if (!response.ok) {
      throw new Error(`Failed to create post: ${response.status}`);
    }
    
    return response.json();
  },
};
```

## 🔍 検証テスト

### アクセシビリティテスト
```javascript
// tests/accessibility.test.js
describe('アクセシビリティテスト', () => {
  test('QuickPostCardクリック時にaria-hidden警告が出ない', async () => {
    // コンソール警告を監視
    const warnings = [];
    jest.spyOn(console, 'warn').mockImplementation((msg) => {
      warnings.push(msg);
    });
    
    // QuickPostCardをクリック
    const quickPostCard = screen.getByRole('button', { name: /新規投稿を作成/ });
    await userEvent.click(quickPostCard);
    
    // ダイアログが開く
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    
    // aria-hidden警告がないことを確認
    const ariaWarnings = warnings.filter(w => w.includes('aria-hidden'));
    expect(ariaWarnings).toHaveLength(0);
  });
  
  test('ダイアログ開閉でフォーカス管理が適切', async () => {
    // ダイアログを開く
    const openButton = screen.getByRole('button', { name: /投稿する/ });
    await userEvent.click(openButton);
    
    // タイトル入力にフォーカスがあることを確認
    const titleInput = screen.getByLabelText('タイトル');
    expect(titleInput).toHaveFocus();
    
    // ダイアログを閉じる
    const cancelButton = screen.getByRole('button', { name: /キャンセル/ });
    await userEvent.click(cancelButton);
    
    // フォーカスが適切に戻ることを確認
    expect(document.activeElement).not.toBe(titleInput);
  });
});
```

### データ同期テスト
```javascript
// tests/data-sync.test.js
describe('データ同期テスト', () => {
  test('新規投稿後、即座に一覧に表示される', async () => {
    // ログイン
    await login('test@example.com', 'password');
    
    // 掲示板ページへ
    await page.goto('/board');
    
    // 初期投稿数を確認
    const initialPosts = await page.$$('[data-testid="post-card"]');
    const initialCount = initialPosts.length;
    
    // 新規投稿作成
    await page.click('[data-testid="create-post-button"]');
    await page.fill('[name="title"]', 'テスト投稿');
    await page.fill('[name="content"]', 'テスト内容');
    await page.click('[data-testid="submit-button"]');
    
    // 投稿が追加されたことを確認
    await page.waitForSelector(`[data-testid="post-card"]:nth-child(${initialCount + 1})`);
    const newPosts = await page.$$('[data-testid="post-card"]');
    expect(newPosts.length).toBe(initialCount + 1);
  });
  
  test('ページ遷移後も投稿が保持される', async () => {
    // 投稿作成
    const postTitle = `Test ${Date.now()}`;
    await createPost(postTitle, 'Content');
    
    // トップページへ遷移
    await page.goto('/');
    await page.waitForTimeout(1000);
    
    // 掲示板に戻る
    await page.goto('/board');
    
    // 投稿が存在することを確認
    const postElement = await page.$(`text="${postTitle}"`);
    expect(postElement).not.toBeNull();
  });
});
```

### MongoDB整合性テスト
```javascript
// tests/mongodb-consistency.test.js
describe('MongoDB整合性テスト', () => {
  test('作成した投稿がDBに保存される', async () => {
    // API経由で投稿作成
    const response = await fetch('/api/posts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        title: 'DB Test',
        content: 'DB Test Content',
      }),
    });
    
    const created = await response.json();
    
    // 直接MongoDBから確認
    const post = await Post.findById(created._id);
    expect(post).not.toBeNull();
    expect(post.title).toBe('DB Test');
  });
});
```

## 📊 成功指標

### 必須要件
- [ ] aria-hidden警告が発生しない
- [ ] 新規投稿が即座に表示される
- [ ] ページ遷移後も投稿が保持される
- [ ] キーボードナビゲーションが正常動作

### パフォーマンス指標
- [ ] 投稿作成 → 表示まで < 1秒
- [ ] ページ遷移 → 復帰まで < 2秒
- [ ] アクセシビリティスコア > 95

## ⚠️ 注意事項

### やってはいけないこと
1. **inputにreadonly + フォーカス可能**: アクセシビリティ違反
2. **キャッシュ戦略なし**: データ不整合の原因
3. **フォーカス管理の無視**: UX低下

### ベストプラクティス
1. **明示的なフォーカス管理**
2. **適切なaria属性の使用**
3. **キャッシュ戦略の明確化**
4. **楽観的UI更新**

## 🚀 実装優先順位

### 緊急（30分以内）
1. QuickPostCardのフォーカス管理修正
2. fetchのキャッシュ無効化
3. 投稿作成後の即座の反映

### 重要（1時間以内）
1. Dialogのアクセシビリティ改善
2. セッションストレージの活用
3. エラーハンドリングの強化

### 推奨（2時間以内）
1. 包括的なテストスイート
2. パフォーマンス監視
3. ログ機能の充実

---
*このプロンプトを使用して、アクセシビリティとデータ同期の問題を完全に解決してください。*