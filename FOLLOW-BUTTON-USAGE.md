# フォローボタンコンポーネント使用ガイド

## 作成日時
2025年8月26日

## 概要
フォロー機能を実装するReactコンポーネント群。Material UI (MUI)とTypeScriptで構築されており、フォロー/アンフォロー機能、ローディング表示、エラーハンドリングを完備。

## コンポーネント一覧

### 1. FollowButton
**パス**: `/src/components/FollowButton.tsx`

フォロー/アンフォローの切り替えが可能な単体ボタンコンポーネント。

#### 基本使用例
```tsx
import FollowButton from '@/components/FollowButton';

// シンプルな使用
<FollowButton userId="user-id-here" />

// 初期状態とコールバック付き
<FollowButton 
  userId="user-id-here"
  initialFollowing={true}
  onFollowChange={(isFollowing) => console.log('Follow state:', isFollowing)}
/>

// カスタマイズ例
<FollowButton
  userId="user-id-here"
  followText="Follow"
  followingText="Following"
  size="large"
  showIcon={false}
/>
```

#### Props
| プロパティ | 型 | デフォルト | 説明 |
|-----------|-----|------------|------|
| userId | string | 必須 | フォロー対象のユーザーID |
| initialFollowing | boolean | false | 初期のフォロー状態 |
| onFollowChange | (isFollowing: boolean) => void | - | フォロー状態変更時のコールバック |
| showIcon | boolean | true | アイコンの表示/非表示 |
| followText | string | 'フォロー' | フォロー前のボタンテキスト |
| followingText | string | 'フォロー中' | フォロー中のボタンテキスト |
| loadingText | string | '処理中...' | ローディング中のテキスト |
| compact | boolean | false | コンパクトモード |
| size | 'small' \| 'medium' \| 'large' | 'medium' | ボタンサイズ |

---

### 2. UserCard
**パス**: `/src/components/UserCard.tsx`

ユーザー情報とフォローボタンを含むカードコンポーネント。

#### 使用例
```tsx
import UserCard from '@/components/UserCard';

<UserCard
  userId="user-id"
  name="山田太郎"
  email="yamada@example.com"
  bio="フロントエンド開発者です。ReactとTypeScriptが得意です。"
  followersCount={150}
  followingCount={80}
  postsCount={42}
  isFollowing={false}
  showFollowButton={true}
  onFollowChange={(isFollowing) => console.log('Follow:', isFollowing)}
/>
```

#### Props
| プロパティ | 型 | デフォルト | 説明 |
|-----------|-----|------------|------|
| userId | string | 必須 | ユーザーID |
| name | string | 必須 | ユーザー名 |
| email | string | - | メールアドレス |
| bio | string | - | 自己紹介文 |
| avatar | string | - | アバター画像URL |
| followersCount | number | 0 | フォロワー数 |
| followingCount | number | 0 | フォロー中の数 |
| postsCount | number | 0 | 投稿数 |
| isFollowing | boolean | false | フォロー状態 |
| showFollowButton | boolean | true | フォローボタンの表示/非表示 |
| isCurrentUser | boolean | false | 現在のユーザー自身かどうか |

---

### 3. PostCardWithFollow
**パス**: `/src/components/PostCardWithFollow.tsx`

投稿カードにフォローボタンを統合したコンポーネント。

#### 使用例
```tsx
import PostCardWithFollow from '@/components/PostCardWithFollow';

<PostCardWithFollow
  postId="post-123"
  authorId="author-456"
  authorName="鈴木花子"
  authorAvatar="/avatars/suzuki.jpg"
  content="今日は素晴らしい天気ですね！"
  createdAt={new Date().toISOString()}
  likesCount={24}
  commentsCount={5}
  isLiked={false}
  isFollowing={false}
  onFollowChange={(isFollowing) => console.log('Follow:', isFollowing)}
  onLikeToggle={() => console.log('Like toggled')}
  onComment={() => console.log('Comment clicked')}
  onShare={() => console.log('Share clicked')}
/>
```

---

## API統合

### エンドポイント
フォローボタンは以下のAPIエンドポイントを使用します：

- **POST** `/api/follow/{userId}` - ユーザーをフォロー
- **DELETE** `/api/follow/{userId}` - ユーザーをアンフォロー

### エラーハンドリング
コンポーネントは以下のエラーを自動的に処理します：

- **401**: 未認証（ログインが必要）
- **400**: 自分自身をフォローしようとした
- **404**: ユーザーが見つからない
- **409**: 既にフォローしている
- **ネットワークエラー**: 接続の問題

エラーは自動的にSnackbarで表示されます。

---

## 実装例

### ユーザーリストページでの使用
```tsx
// app/users/page.tsx
import UserCard from '@/components/UserCard';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  
  useEffect(() => {
    // ユーザー一覧を取得
    fetchUsers().then(setUsers);
  }, []);

  return (
    <Grid container spacing={3}>
      {users.map(user => (
        <Grid item xs={12} md={6} lg={4} key={user.id}>
          <UserCard
            userId={user.id}
            name={user.name}
            email={user.email}
            bio={user.bio}
            followersCount={user.followersCount}
            followingCount={user.followingCount}
            isFollowing={user.isFollowing}
            onFollowChange={(isFollowing) => {
              // 状態を更新
              updateUserFollowState(user.id, isFollowing);
            }}
          />
        </Grid>
      ))}
    </Grid>
  );
}
```

### タイムラインでの使用
```tsx
// app/timeline/page.tsx
import PostCardWithFollow from '@/components/PostCardWithFollow';

export default function TimelinePage() {
  const [posts, setPosts] = useState([]);
  
  return (
    <Box sx={{ maxWidth: 600, mx: 'auto' }}>
      {posts.map(post => (
        <PostCardWithFollow
          key={post.id}
          postId={post.id}
          authorId={post.author.id}
          authorName={post.author.name}
          authorAvatar={post.author.avatar}
          content={post.content}
          createdAt={post.createdAt}
          likesCount={post.likesCount}
          isLiked={post.isLiked}
          isFollowing={post.author.isFollowing}
          onFollowChange={(isFollowing) => {
            // 投稿者のフォロー状態を更新
            updateAuthorFollowState(post.author.id, isFollowing);
          }}
        />
      ))}
    </Box>
  );
}
```

---

## パフォーマンス最適化

### 推奨事項
1. **初期状態の提供**: `initialFollowing`プロパティを使用して初期状態を設定し、不要なAPI呼び出しを避ける
2. **コールバックの最適化**: `useCallback`を使用してonFollowChangeハンドラをメモ化
3. **バッチ更新**: 複数のフォロー状態を一度に更新する場合は、状態管理ライブラリの使用を検討

### 例：React Contextでの状態管理
```tsx
// contexts/FollowContext.tsx
const FollowContext = createContext();

export function FollowProvider({ children }) {
  const [followStates, setFollowStates] = useState({});
  
  const updateFollowState = useCallback((userId, isFollowing) => {
    setFollowStates(prev => ({
      ...prev,
      [userId]: isFollowing
    }));
  }, []);
  
  return (
    <FollowContext.Provider value={{ followStates, updateFollowState }}>
      {children}
    </FollowContext.Provider>
  );
}
```

---

## テスト

### テストページ
開発環境でコンポーネントをテストする場合：

```bash
# 開発サーバーを起動
npm run dev

# ブラウザでアクセス
http://localhost:3000/test-follow
```

### ユニットテスト例
```tsx
// __tests__/FollowButton.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import FollowButton from '@/components/FollowButton';

test('フォローボタンの切り替え', async () => {
  const mockOnChange = jest.fn();
  
  render(
    <FollowButton 
      userId="test-user"
      onFollowChange={mockOnChange}
    />
  );
  
  const button = screen.getByRole('button');
  expect(button).toHaveTextContent('フォロー');
  
  fireEvent.click(button);
  
  await waitFor(() => {
    expect(mockOnChange).toHaveBeenCalledWith(true);
  });
});
```

---

## トラブルシューティング

### よくある問題と解決策

#### 1. 認証エラー (401)
**問題**: ボタンクリック時に「ログインが必要です」エラー
**解決**: NextAuth.jsのセッションが有効か確認

#### 2. CSRF保護エラー
**問題**: POST/DELETEリクエストが403エラー
**解決**: CSRFトークンが正しく設定されているか確認

#### 3. フォロー状態の同期
**問題**: 複数箇所のフォローボタンが同期しない
**解決**: グローバル状態管理（Context APIやZustand）を実装

---

## まとめ
フォローボタンコンポーネントは、以下の特徴を持つ再利用可能なUIコンポーネント群です：

- ✅ TypeScriptによる型安全性
- ✅ Material UIによる統一されたデザイン
- ✅ エラーハンドリングとローディング状態
- ✅ カスタマイズ可能なテキストとスタイル
- ✅ APIとの完全な統合

開発中のアプリケーションに簡単に組み込むことができ、SNS機能の基盤となります。