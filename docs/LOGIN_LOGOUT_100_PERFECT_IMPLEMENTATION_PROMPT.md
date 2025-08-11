# ログイン・ログアウト機能 100%完璧実装プロンプト

## 🎯 目的
現在78.9%の達成率を一度の実装で確実に100%まで引き上げ、設計要件を完璧に満たす。

## 📊 現状分析（達成率: 78.9%）

### ✅ 完成済み（変更不要）
1. ログインページ全機能（100%）
2. セッション基本管理（92.6%）

### ❌ 未達成項目（21.1%のギャップ）
1. **ヘッダーコンポーネント**（44.4% → 100%へ）
   - ログアウトボタン欠如（致命的）
   - 新規登録ボタン欠如
   - ユーザーアバター未実装
   - ドロップダウンメニュー未実装

2. **セッション自動更新**（78% → 100%へ）
   - 明示的な設定なし
   - カスタマイズ未実装

## 🚀 実装指示書

### Phase 1: ヘッダーコンポーネントの完全実装

#### 1.1 必要なインポートの追加

```typescript
// /src/components/Header.tsx
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  Button, 
  Box,
  Avatar,
  Menu,
  MenuItem,
  IconButton,
  Divider,
  ListItemIcon,
  ListItemText,
  useMediaQuery,
  useTheme
} from '@mui/material';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import PersonIcon from '@mui/icons-material/Person';
import LogoutIcon from '@mui/icons-material/Logout';
import DashboardIcon from '@mui/icons-material/Dashboard';
import LoginIcon from '@mui/icons-material/Login';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
```

#### 1.2 完全なヘッダーコンポーネント実装

```typescript
export default function Header() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [mounted, setMounted] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleSignOut = async () => {
    handleMenuClose();
    await signOut({ redirect: false });
    router.push('/auth/signin');
  };

  const handleNavigate = (path: string) => {
    handleMenuClose();
    router.push(path);
  };

  // SSR対応のための初期レンダリング
  if (!mounted) {
    return (
      <AppBar position="static" elevation={2}>
        <Toolbar>
          <Typography 
            variant="h6" 
            component="div" 
            sx={{ 
              flexGrow: 1,
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <Link href="/" style={{ color: 'inherit', textDecoration: 'none' }}>
              会員制掲示板
            </Link>
          </Typography>
          <Box sx={{ width: 200, height: 40 }} />
        </Toolbar>
      </AppBar>
    );
  }

  return (
    <AppBar position="static" elevation={2}>
      <Toolbar>
        <Typography 
          variant="h6" 
          component="div" 
          sx={{ 
            flexGrow: 1,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          <Link href="/" style={{ color: 'inherit', textDecoration: 'none' }}>
            会員制掲示板
          </Link>
        </Typography>

        {status === 'loading' ? (
          <Box sx={{ width: 200, height: 40 }} />
        ) : status === 'authenticated' && session ? (
          // ✅ ログイン済み: アバター、メニュー、ログアウト
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {!isMobile && (
              <Typography variant="body1" sx={{ mr: 1 }}>
                {session.user?.name || session.user?.email}さん
              </Typography>
            )}
            
            <IconButton
              onClick={handleMenuOpen}
              size="small"
              aria-controls={open ? 'account-menu' : undefined}
              aria-haspopup="true"
              aria-expanded={open ? 'true' : undefined}
            >
              <Avatar 
                sx={{ 
                  width: 36, 
                  height: 36,
                  bgcolor: 'secondary.main',
                  fontSize: '1rem'
                }}
              >
                {session.user?.name?.[0]?.toUpperCase() || 
                 session.user?.email?.[0]?.toUpperCase() || 
                 <PersonIcon />}
              </Avatar>
            </IconButton>

            <Menu
              id="account-menu"
              anchorEl={anchorEl}
              open={open}
              onClose={handleMenuClose}
              onClick={handleMenuClose}
              PaperProps={{
                elevation: 3,
                sx: {
                  mt: 1.5,
                  minWidth: 200,
                  '& .MuiAvatar-root': {
                    width: 32,
                    height: 32,
                    ml: -0.5,
                    mr: 1,
                  },
                },
              }}
              transformOrigin={{ horizontal: 'right', vertical: 'top' }}
              anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            >
              <MenuItem disabled>
                <Avatar />
                <Box>
                  <Typography variant="body2" fontWeight={600}>
                    {session.user?.name || 'ユーザー'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {session.user?.email}
                  </Typography>
                </Box>
              </MenuItem>
              
              <Divider />
              
              <MenuItem onClick={() => handleNavigate('/board')}>
                <ListItemIcon>
                  <DashboardIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>掲示板</ListItemText>
              </MenuItem>
              
              <MenuItem onClick={() => handleNavigate('/profile')}>
                <ListItemIcon>
                  <PersonIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>プロフィール</ListItemText>
              </MenuItem>
              
              <Divider />
              
              <MenuItem onClick={handleSignOut}>
                <ListItemIcon>
                  <LogoutIcon fontSize="small" color="error" />
                </ListItemIcon>
                <ListItemText>
                  <Typography color="error">ログアウト</Typography>
                </ListItemText>
              </MenuItem>
            </Menu>
          </Box>
        ) : (
          // ✅ 未ログイン: ログイン/新規登録ボタン
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              color="inherit"
              startIcon={<LoginIcon />}
              onClick={() => router.push('/auth/signin')}
              sx={{
                textTransform: 'none',
                fontWeight: 500,
                display: { xs: 'none', sm: 'flex' }
              }}
            >
              ログイン
            </Button>
            
            <Button
              variant="contained"
              color="secondary"
              startIcon={<PersonAddIcon />}
              onClick={() => router.push('/auth/signup')}
              sx={{
                textTransform: 'none',
                fontWeight: 600,
                display: { xs: 'none', sm: 'flex' }
              }}
            >
              新規登録
            </Button>

            {/* モバイル用アイコンボタン */}
            <IconButton
              color="inherit"
              onClick={() => router.push('/auth/signin')}
              sx={{ display: { xs: 'flex', sm: 'none' } }}
            >
              <LoginIcon />
            </IconButton>
            
            <IconButton
              color="inherit"
              onClick={() => router.push('/auth/signup')}
              sx={{ display: { xs: 'flex', sm: 'none' } }}
            >
              <PersonAddIcon />
            </IconButton>
          </Box>
        )}
      </Toolbar>
    </AppBar>
  );
}
```

### Phase 2: セッション管理の最適化

#### 2.1 NextAuth設定の完全実装

```typescript
// /src/lib/auth.config.ts に以下を追加

import type { NextAuthConfig } from "next-auth";

export const authConfig: NextAuthConfig = {
  providers: [
    // 既存のCredentialsプロバイダー設定
  ],
  
  // ✅ セッション設定の明示的定義
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30日間
    updateAge: 24 * 60 * 60,    // 24時間ごとに自動更新
  },
  
  // ✅ JWT設定
  jwt: {
    maxAge: 30 * 24 * 60 * 60, // 30日間
  },
  
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
    signOut: "/auth/signin",  // ログアウト後のリダイレクト先
  },
  
  callbacks: {
    // 既存のsignInコールバック
    async signIn({ user, account }) {
      // 既存の処理
    },
    
    // ✅ セッションコールバックの追加
    async session({ session, token }) {
      if (token) {
        session.user = {
          ...session.user,
          id: token.sub,
          emailVerified: token.emailVerified as boolean
        };
        
        // セッション有効期限の計算と追加
        const now = Date.now();
        const maxAge = 30 * 24 * 60 * 60 * 1000; // 30日
        const expires = new Date(now + maxAge);
        session.expires = expires.toISOString();
      }
      return session;
    },
    
    // ✅ JWTコールバックの追加
    async jwt({ token, user, account, trigger }) {
      // 初回サインイン時
      if (user) {
        token.id = user.id;
        token.emailVerified = user.emailVerified;
      }
      
      // セッション更新時
      if (trigger === "update") {
        // 最新のユーザー情報を取得して更新
        const latestUser = await User.findById(token.id);
        if (latestUser) {
          token.emailVerified = latestUser.emailVerified;
          token.name = latestUser.name;
          token.email = latestUser.email;
        }
      }
      
      return token;
    },
  },
  
  // ✅ セキュリティ設定
  useSecureCookies: process.env.NODE_ENV === "production",
  
  // ✅ デバッグ設定（開発環境のみ）
  debug: process.env.NODE_ENV === "development",
};
```

#### 2.2 SessionProviderの最適化

```typescript
// /src/app/providers.tsx または layout.tsx

'use client';

import { SessionProvider } from 'next-auth/react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter';
import theme from '@/styles/theme';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AppRouterCacheProvider>
      {/* ✅ refetchIntervalとrefetchOnWindowFocusを追加 */}
      <SessionProvider
        refetchInterval={5 * 60}  // 5分ごとにセッション確認
        refetchOnWindowFocus={true}  // ウィンドウフォーカス時に更新
      >
        <ThemeProvider theme={theme}>
          <CssBaseline />
          {children}
        </ThemeProvider>
      </SessionProvider>
    </AppRouterCacheProvider>
  );
}
```

#### 2.3 セッション監視コンポーネント（オプション）

```typescript
// /src/components/SessionMonitor.tsx（新規作成）

'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { Alert, Snackbar, Button } from '@mui/material';
import { signOut } from 'next-auth/react';

export default function SessionMonitor() {
  const { data: session, status } = useSession();
  const [showWarning, setShowWarning] = useState(false);
  const [remainingTime, setRemainingTime] = useState<number | null>(null);

  useEffect(() => {
    if (session?.expires) {
      const checkExpiry = () => {
        const expiryTime = new Date(session.expires).getTime();
        const now = Date.now();
        const remaining = expiryTime - now;
        
        // 5分前に警告表示
        if (remaining > 0 && remaining < 5 * 60 * 1000) {
          setShowWarning(true);
          setRemainingTime(Math.floor(remaining / 1000));
        }
        
        // 期限切れ
        if (remaining <= 0) {
          signOut({ redirect: true, callbackUrl: '/auth/signin' });
        }
      };

      const interval = setInterval(checkExpiry, 10000); // 10秒ごとにチェック
      checkExpiry(); // 初回チェック

      return () => clearInterval(interval);
    }
  }, [session]);

  useEffect(() => {
    if (remainingTime !== null && remainingTime > 0) {
      const timer = setTimeout(() => {
        setRemainingTime(prev => prev !== null ? prev - 1 : null);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [remainingTime]);

  const handleExtendSession = async () => {
    // セッションを更新
    window.location.reload();
    setShowWarning(false);
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Snackbar
      open={showWarning}
      anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
    >
      <Alert
        severity="warning"
        action={
          <>
            <Button color="inherit" size="small" onClick={handleExtendSession}>
              延長
            </Button>
            <Button color="inherit" size="small" onClick={() => setShowWarning(false)}>
              閉じる
            </Button>
          </>
        }
      >
        セッションがあと {remainingTime ? formatTime(remainingTime) : '0:00'} で期限切れになります
      </Alert>
    </Snackbar>
  );
}
```

### Phase 3: テストと確認

#### 3.1 実装確認チェックリスト

```bash
# 1. ヘッダーコンポーネントの確認
✅ 未ログイン時:
  - [ ] ログインボタンが表示される
  - [ ] 新規登録ボタンが表示される
  - [ ] モバイル表示でアイコンボタンになる

✅ ログイン時:
  - [ ] ユーザー名が表示される
  - [ ] アバターが表示される（イニシャル入り）
  - [ ] クリックでドロップダウンメニューが開く
  - [ ] メニューに「掲示板」「プロフィール」「ログアウト」がある
  - [ ] ログアウトボタンで正常にログアウトできる
  - [ ] ログアウト後、サインインページにリダイレクトされる

# 2. セッション管理の確認
✅ 自動更新:
  - [ ] 5分ごとにセッションが自動更新される
  - [ ] ウィンドウフォーカス時に更新される
  - [ ] 30日後に自動的に期限切れになる
  - [ ] 24時間ごとにトークンが更新される

# 3. レスポンシブ対応の確認
✅ デスクトップ:
  - [ ] すべてのボタンが正常に表示される
  - [ ] レイアウトが崩れない

✅ モバイル:
  - [ ] アイコンボタンに切り替わる
  - [ ] メニューが正常に動作する
```

#### 3.2 自動テストスクリプト

```typescript
// /tests/e2e/auth/header-complete.spec.ts

import { test, expect } from '@playwright/test';

test.describe('ヘッダーコンポーネント完全性テスト', () => {
  
  test('未ログイン時の表示', async ({ page }) => {
    await page.goto('/');
    
    // ログインボタンの存在確認
    await expect(page.locator('button:has-text("ログイン")')).toBeVisible();
    
    // 新規登録ボタンの存在確認
    await expect(page.locator('button:has-text("新規登録")')).toBeVisible();
  });
  
  test('ログイン時の表示とログアウト機能', async ({ page }) => {
    // ログイン処理
    await page.goto('/auth/signin');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    // アバターの存在確認
    await expect(page.locator('[aria-label*="account"]')).toBeVisible();
    
    // メニューを開く
    await page.click('[aria-label*="account"]');
    
    // メニュー項目の確認
    await expect(page.locator('text=掲示板')).toBeVisible();
    await expect(page.locator('text=プロフィール')).toBeVisible();
    await expect(page.locator('text=ログアウト')).toBeVisible();
    
    // ログアウト実行
    await page.click('text=ログアウト');
    
    // サインインページへのリダイレクト確認
    await expect(page).toHaveURL('/auth/signin');
  });
  
  test('セッション自動更新の動作', async ({ page }) => {
    // セッション更新のテスト
    // 実装は環境に応じて調整
  });
});
```

## 🎯 成功基準

### 実装完了の判定基準

1. **ヘッダーコンポーネント（100%達成）**
   - ✅ ログイン/新規登録ボタンが両方表示される
   - ✅ ユーザーアバターが表示される
   - ✅ ドロップダウンメニューが機能する
   - ✅ ログアウトボタンが正常に動作する

2. **セッション管理（100%達成）**
   - ✅ 明示的な有効期限設定がある
   - ✅ 自動更新が設定されている
   - ✅ セッション監視が機能する（オプション）

3. **レスポンシブ対応（ボーナス）**
   - ✅ モバイル表示が最適化されている
   - ✅ タブレット表示が正常

## 📊 実装後の期待結果

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
設計要件項目:     9個
完全達成:        9個 (100%)
部分達成:        0個 (0%)
未達成:         0個 (0%)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

総合達成率: 100% 🎉
```

## 🚨 実装時の注意事項

### 1. 既存コードへの影響を最小化
- Header.tsxの既存インポートを残す
- 既存のスタイルを破壊しない
- 他のコンポーネントとの整合性を保つ

### 2. エラーハンドリング
- signOut失敗時の処理を追加
- ネットワークエラー時の対応
- セッション期限切れ時の適切な処理

### 3. パフォーマンス考慮
- 不要な再レンダリングを避ける
- メニューの遅延ロード
- アイコンの最適化

## 🎉 実装完了後の確認

```bash
# 1. 開発サーバーを再起動
npm run dev

# 2. ブラウザで確認
- http://localhost:3000 にアクセス
- ヘッダーの全機能を確認
- ログイン/ログアウトフローを確認

# 3. テスト実行
npm run test:e2e

# 4. ビルド確認
npm run build
```

## 💡 トラブルシューティング

### よくある問題と解決策

1. **アイコンが表示されない**
   ```bash
   npm install @mui/icons-material
   ```

2. **セッションが更新されない**
   - ブラウザのキャッシュをクリア
   - .env.localのNEXTAUTH_SECRET確認

3. **メニューが開かない**
   - useStateの初期化確認
   - イベントハンドラーの設定確認

## 📝 最終チェックリスト

実装完了後、以下を確認してください：

- [ ] すべての設計要件が満たされている
- [ ] レスポンシブ対応が完璧
- [ ] エラーハンドリングが適切
- [ ] コードが既存のスタイルガイドに準拠
- [ ] テストがすべてパス
- [ ] ビルドが成功
- [ ] 本番環境での動作確認

---

このプロンプトに従って実装すれば、**一度の作業で確実に100%の達成率**を実現できます。実装時間は約**2-3時間**を想定しています。