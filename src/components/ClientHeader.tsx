'use client';

import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  Avatar,
  IconButton,
  Skeleton,
  TextField,
  InputAdornment,
  Badge,
  Tooltip,
  useMediaQuery,
} from '@mui/material';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import DashboardIcon from '@mui/icons-material/Dashboard';
import ForumIcon from '@mui/icons-material/Forum';
import MenuIcon from '@mui/icons-material/Menu';
import TimelineIcon from '@mui/icons-material/Timeline';
import SearchIcon from '@mui/icons-material/Search';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import TranslateIcon from '@mui/icons-material/Translate';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';

import SlideDrawer from './SlideDrawer';

export default function ClientHeader() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [notifCount] = useState<number>(0); // TODO: 実データ連携
  const [messageCount] = useState<number>(0); // TODO: 実データ連携
  const isMdUp = useMediaQuery('(min-width:960px)');

  // 簡易ダークモードトグル（MUIテーマ切替は別途実装）
  const [isDark, setIsDark] = useState<boolean>(false);
  const themeToggleLabel = useMemo(() => (isDark ? 'ライトモード' : 'ダークモード'), [isDark]);

  const handleSearchSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    router.push(`/search?q=${encodeURIComponent(q)}`);
  };

  const toggleTheme = () => {
    setIsDark((v) => !v);
    try {
      const next = !isDark ? 'dark' : 'light';
      document.documentElement.setAttribute('data-color-scheme', next);
      localStorage.setItem('color-scheme', next);
    } catch {}
  };

  // アバターの頭文字を生成
  const getInitials = (name?: string | null) => {
    if (!name) return '?';
    const parts = name.split(' ');
    return parts
      .map((p) => p[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <>
      {/* スキップリンク（キーボード操作向け） */}
      <Box
        component="a"
        href="#main-content"
        sx={{
          position: 'absolute',
          left: -10000,
          top: 'auto',
          width: 1,
          height: 1,
          overflow: 'hidden',
          '&:focus': {
            left: 8,
            top: 8,
            width: 'auto',
            height: 'auto',
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
            p: 1,
            borderRadius: 1,
            zIndex: (t) => t.zIndex.appBar + 1,
          },
        }}
      >
        メインコンテンツへ移動
      </Box>
      <header role="banner" aria-label="Global Header" data-testid="global-banner">
        <AppBar position="static">
          <Toolbar>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              <Link href="/" style={{ color: 'inherit', textDecoration: 'none' }}>
                会員制掲示板
              </Link>
            </Typography>
            <Box
              component="nav"
              aria-label="グローバルナビゲーション"
              sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
            >
              {/* 検索（md以上でインライン） */}
              {status !== 'loading' &&
                (isMdUp ? (
                  <Box
                    component="form"
                    role="search"
                    aria-label="サイト内検索"
                    onSubmit={handleSearchSubmit}
                    sx={{ mr: 1, minWidth: 260 }}
                  >
                    <TextField
                      size="small"
                      placeholder="キーワードで検索"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <SearchIcon aria-hidden />
                          </InputAdornment>
                        ),
                        'aria-label': '検索クエリ',
                      }}
                    />
                  </Box>
                ) : (
                  <Tooltip title="検索">
                    <IconButton color="inherit" aria-label="検索" component={Link} href="/search">
                      <SearchIcon />
                    </IconButton>
                  </Tooltip>
                ))}
              {status === 'loading' ? (
                <Skeleton variant="rectangular" width={120} height={36} sx={{ borderRadius: 1 }} />
              ) : session ? (
                <>
                  <IconButton
                    color="inherit"
                    component={Link}
                    href="/dashboard"
                    sx={{ display: { xs: 'flex', sm: 'none' } }}
                    aria-label="ダッシュボード"
                  >
                    <DashboardIcon />
                  </IconButton>
                  <Button
                    color="inherit"
                    href="/board"
                    startIcon={<ForumIcon />}
                    sx={{ display: { xs: 'none', sm: 'flex' } }}
                  >
                    掲示板
                  </Button>
                  <Button
                    color="inherit"
                    href="/timeline"
                    startIcon={<TimelineIcon />}
                    sx={{ display: { xs: 'none', sm: 'flex' } }}
                  >
                    タイムライン
                  </Button>
                  <Button
                    color="inherit"
                    href="/dashboard"
                    startIcon={<DashboardIcon />}
                    sx={{ display: { xs: 'none', md: 'flex' } }}
                  >
                    ダッシュボード
                  </Button>

                  {/* 新規投稿（認証時のみ） */}
                  <Tooltip title="新規投稿">
                    <IconButton
                      color="inherit"
                      component={Link}
                      href="/posts/new"
                      aria-label="新規投稿"
                    >
                      <AddCircleOutlineIcon />
                    </IconButton>
                  </Tooltip>

                  {/* 通知・メッセージ */}
                  <Tooltip title="通知">
                    <IconButton
                      color="inherit"
                      component={Link}
                      href="/notifications"
                      aria-label="通知"
                    >
                      <Badge badgeContent={notifCount} color="error" max={9}>
                        <NotificationsNoneIcon />
                      </Badge>
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="メッセージ">
                    <IconButton
                      color="inherit"
                      component={Link}
                      href="/messages"
                      aria-label="メッセージ"
                    >
                      <Badge badgeContent={messageCount} color="error" max={9}>
                        <ChatBubbleOutlineIcon />
                      </Badge>
                    </IconButton>
                  </Tooltip>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      ml: { xs: 1, sm: 2 },
                      maxWidth: { xs: 150, sm: 200, md: 250 },
                    }}
                  >
                    <Typography
                      component="span"
                      sx={{
                        mr: 1,
                        color: 'inherit',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        maxWidth: { xs: 100, sm: 150, md: 200 },
                        display: { xs: 'none', sm: 'inline' },
                      }}
                      title={`${session.user?.name}さん`}
                    >
                      {session.user?.name}さん
                    </Typography>
                    <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.main' }}>
                      {getInitials(session.user?.name)}
                    </Avatar>
                  </Box>
                </>
              ) : (
                <>
                  {/* 未ログイン時はヘッダー内にログインボタンを置かない（Drawerに設置） */}
                  <Tooltip title="検索">
                    <IconButton color="inherit" aria-label="検索" component={Link} href="/search">
                      <SearchIcon />
                    </IconButton>
                  </Tooltip>
                </>
              )}

              {/* 言語切替（将来対応のプレースホルダ） */}
              <Tooltip title="言語切替">
                <IconButton
                  color="inherit"
                  aria-label="言語切替"
                  component={Link}
                  href="/settings/language"
                >
                  <TranslateIcon />
                </IconButton>
              </Tooltip>

              {/* 外観モード切替（簡易） */}
              <Tooltip title={themeToggleLabel}>
                <IconButton color="inherit" aria-label={themeToggleLabel} onClick={toggleTheme}>
                  {isDark ? <LightModeIcon /> : <DarkModeIcon />}
                </IconButton>
              </Tooltip>

              <IconButton
                color="inherit"
                aria-label="メニューを開く"
                edge="end"
                onClick={() => setDrawerOpen(true)}
                sx={{ ml: 1 }}
                data-testid="menu-button"
              >
                <MenuIcon />
              </IconButton>
            </Box>
          </Toolbar>
        </AppBar>
      </header>

      {/* SlideDrawerコンポーネントを使用 */}
      <SlideDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onOpen={() => setDrawerOpen(true)}
      />
    </>
  );
}
