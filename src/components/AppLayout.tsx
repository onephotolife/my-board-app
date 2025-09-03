'use client';

import { useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import {
  Box,
  Avatar,
  Typography,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemButton,
  Button,
  IconButton,
  Container,
  Drawer,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  PostAdd as PostAddIcon,
  Forum as ForumIcon,
  Person as PersonIcon,
  Logout as LogoutIcon,
  Home as HomeIcon,
  Menu as MenuIcon,
  Close as CloseIcon,
  AccountCircle as AccountCircleIcon,
  PrivacyTip as PrivacyTipIcon,
  Article as ArticleIcon,
  Timeline as TimelineIcon,
} from '@mui/icons-material';
import NotificationBell from './NotificationBell';

interface AppLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}

export default function AppLayout({ children, title, subtitle }: AppLayoutProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut({ redirect: false });
    router.push('/auth/signin');
  };

  const navigationItems = [
    {
      label: 'ホーム',
      icon: <HomeIcon />,
      path: '/',
      color: 'primary.light',
    },
    {
      label: 'ダッシュボード',
      icon: <DashboardIcon />,
      path: '/dashboard',
      color: 'primary.light',
    },
    {
      label: '掲示板',
      icon: <ForumIcon />,
      path: '/board',
      color: 'success.light',
    },
    {
      label: 'タイムライン',
      icon: <TimelineIcon />,
      path: '/timeline',
      color: 'info.light',
    },
    {
      label: '新規投稿',
      icon: <PostAddIcon />,
      path: '/posts/new',
      color: 'warning.light',
    },
    {
      label: '自分の投稿',
      icon: <ArticleIcon />,
      path: '/my-posts',
      color: 'info.light',
    },
    {
      label: 'プロフィール',
      icon: <PersonIcon />,
      path: '/profile',
      color: 'info.light',
    },
  ];

  const footerItems = [
    {
      label: 'プライバシーポリシー',
      icon: <PrivacyTipIcon />,
      path: '/privacy',
      color: 'grey.600',
    },
    {
      label: '利用規約',
      icon: <ArticleIcon />,
      path: '/terms',
      color: 'grey.600',
    },
  ];

  const sidebarContent = (
    <>
      <Box sx={{ mb: 4, textAlign: 'center' }}>
        <Avatar
          sx={{
            width: 100,
            height: 100,
            margin: '0 auto',
            mb: 2,
            bgcolor: 'primary.main',
            fontSize: '2rem',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          }}
        >
          {session?.user?.name?.[0] || session?.user?.email?.[0]?.toUpperCase() || <AccountCircleIcon />}
        </Avatar>
        <Typography variant="h6" gutterBottom>
          {session?.user?.name || 'ゲスト'}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {session?.user?.email}
        </Typography>
        {session && (
          <Chip
            label="メンバー"
            color="primary"
            size="small"
            sx={{ mt: 1 }}
          />
        )}
      </Box>

      <Divider sx={{ mb: 3 }} />

      <List>
        {navigationItems.map((item) => (
          <ListItem
            key={item.path}
            disablePadding
            sx={{ mb: 0.5 }}
          >
            <ListItemButton
              onClick={() => {
                router.push(item.path);
                setMobileMenuOpen(false);
              }}
              selected={pathname === item.path}
              sx={{
                borderRadius: '8px',
                '&.Mui-selected': {
                  backgroundColor: 'rgba(99, 102, 241, 0.08)',
                  '&:hover': {
                    backgroundColor: 'rgba(99, 102, 241, 0.12)',
                  },
                },
              }}
            >
              <ListItemAvatar>
                <Avatar 
                  sx={{ 
                    bgcolor: pathname === item.path ? 'primary.main' : item.color,
                    width: 36,
                    height: 36,
                  }}
                >
                  {item.icon}
                </Avatar>
              </ListItemAvatar>
              <ListItemText 
                primary={item.label}
                primaryTypographyProps={{
                  fontWeight: pathname === item.path ? 600 : 400,
                }}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      <Divider sx={{ my: 3 }} />

      <List dense>
        {footerItems.map((item) => (
          <ListItem
            key={item.path}
            disablePadding
            sx={{ mb: 0.5 }}
          >
            <ListItemButton
              onClick={() => {
                router.push(item.path);
                setMobileMenuOpen(false);
              }}
              sx={{
                borderRadius: '8px',
              }}
            >
              <ListItemAvatar>
                <Avatar 
                  sx={{ 
                    bgcolor: 'transparent',
                    color: item.color,
                    width: 32,
                    height: 32,
                  }}
                >
                  {item.icon}
                </Avatar>
              </ListItemAvatar>
              <ListItemText 
                primary={item.label}
                primaryTypographyProps={{
                  fontSize: '0.875rem',
                  color: 'text.secondary',
                }}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      {session ? (
        <Box sx={{ px: 2, mt: 2 }}>
          <Button
            fullWidth
            variant="outlined"
            startIcon={<LogoutIcon />}
            onClick={handleSignOut}
            sx={{
              borderColor: 'error.main',
              color: 'error.main',
              '&:hover': {
                borderColor: 'error.dark',
                bgcolor: 'rgba(211, 47, 47, 0.04)',
              },
            }}
          >
            ログアウト
          </Button>
        </Box>
      ) : (
        <Box sx={{ px: 2, mt: 2 }}>
          <Button
            fullWidth
            variant="contained"
            onClick={() => router.push('/auth/signin')}
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            }}
          >
            ログイン
          </Button>
        </Box>
      )}
    </>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#f5f5f5' }}>
      {/* デスクトップサイドバー */}
      <Box
        sx={{
          width: 280,
          bgcolor: 'white',
          borderRight: '1px solid #e0e0e0',
          p: 3,
          display: { xs: 'none', md: 'flex' },
          flexDirection: 'column',
        }}
      >
        {sidebarContent}
      </Box>

      {/* モバイルドロワー */}
      <Drawer
        anchor="left"
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': {
            width: 280,
            boxSizing: 'border-box',
          },
        }}
      >
        <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', height: '100%' }}>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            <IconButton onClick={() => setMobileMenuOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
          {sidebarContent}
        </Box>
      </Drawer>

      {/* メインコンテンツ */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {/* ヘッダー */}
        <Box
          sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            p: { xs: 2, sm: 3, md: 4 },
            mb: 4,
          }}
        >
          <Container maxWidth="lg">
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                {isMobile && (
                  <IconButton
                    sx={{ color: 'white', mr: 2 }}
                    onClick={() => setMobileMenuOpen(true)}
                  >
                    <MenuIcon />
                  </IconButton>
                )}
                <Box>
                  <Typography 
                    variant={isMobile ? 'h5' : 'h4'} 
                    gutterBottom 
                    sx={{ fontWeight: 700 }}
                  >
                    {title || '会員制掲示板'}
                  </Typography>
                  {subtitle && (
                    <Typography variant="body1">
                      {subtitle}
                    </Typography>
                  )}
                </Box>
              </Box>
              {/* 通知ベル */}
              {session && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <NotificationBell />
                </Box>
              )}
            </Box>
          </Container>
        </Box>

        {/* ページコンテンツ */}
        <Box sx={{ pb: 4 }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
}