'use client';

import { useState, useEffect } from 'react';
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
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Button,
  IconButton,
  Badge,
  Container,
  Drawer,
  AppBar,
  Toolbar,
  useMediaQuery,
  useTheme,
  Fade,
  Grow,
  Zoom,
  Paper,
  Tooltip,
  alpha,
  CircularProgress,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  PostAdd as PostAddIcon,
  Forum as ForumIcon,
  Person as PersonIcon,
  Logout as LogoutIcon,
  Notifications as NotificationsIcon,
  Settings as SettingsIcon,
  Home as HomeIcon,
  Menu as MenuIcon,
  Close as CloseIcon,
  AccountCircle as AccountCircleIcon,
  PrivacyTip as PrivacyTipIcon,
  Article as ArticleIcon,
  ContactMail as ContactMailIcon,
  Brightness4 as DarkModeIcon,
  Brightness7 as LightModeIcon,
  KeyboardArrowUp as ScrollTopIcon,
} from '@mui/icons-material';

interface EnhancedAppLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}

const drawerWidth = 280;

export default function EnhancedAppLayout({ children, title, subtitle }: EnhancedAppLayoutProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isTablet = useMediaQuery(theme.breakpoints.down('lg'));
  
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState(3);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleSignOut = async () => {
    await signOut({ redirect: true, callbackUrl: '/auth/signin' });
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const menuItems = [
    { 
      text: 'ダッシュボード', 
      icon: <DashboardIcon />, 
      path: '/dashboard',
      color: theme.palette.primary.main,
    },
    { 
      text: '掲示板', 
      icon: <ForumIcon />, 
      path: '/board',
      color: theme.palette.info.main,
    },
    { 
      text: '新規投稿', 
      icon: <PostAddIcon />, 
      path: '/posts/new',
      color: theme.palette.success.main,
    },
    { 
      text: 'マイ投稿', 
      icon: <ArticleIcon />, 
      path: '/my-posts',
      color: theme.palette.warning.main,
    },
    { 
      text: 'プロフィール', 
      icon: <PersonIcon />, 
      path: '/profile',
      color: theme.palette.secondary.main,
    },
  ];

  const footerItems = [
    { text: 'プライバシーポリシー', icon: <PrivacyTipIcon />, path: '/privacy' },
    { text: '利用規約', icon: <ArticleIcon />, path: '/terms' },
    { text: 'お問い合わせ', icon: <ContactMailIcon />, path: '/contact' },
  ];

  const drawerContent = (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: theme.palette.mode === 'dark' 
          ? 'linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)'
          : 'linear-gradient(180deg, #ffffff 0%, #f5f7fa 100%)',
      }}
    >
      {/* ユーザー情報セクション */}
      <Box
        sx={{
          p: 3,
          background: theme.palette.mode === 'dark'
            ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
            : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: '#fff',
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'url("/pattern.svg")',
            opacity: 0.1,
          },
        }}
      >
        <Fade in timeout={600}>
          <Box sx={{ position: 'relative', zIndex: 1 }}>
            <Avatar
              sx={{
                width: 80,
                height: 80,
                mb: 2,
                border: '4px solid rgba(255,255,255,0.3)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
              }}
            >
              {session?.user?.name?.charAt(0) || 'U'}
            </Avatar>
            <Typography variant="h6" fontWeight="bold">
              {session?.user?.name || 'ゲストユーザー'}
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              {session?.user?.email}
            </Typography>
            {session?.user?.role && (
              <Chip
                label={session.user.role}
                size="small"
                sx={{
                  mt: 1,
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  color: '#fff',
                  fontWeight: 'bold',
                }}
              />
            )}
          </Box>
        </Fade>
      </Box>

      <Divider />

      {/* メニューアイテム */}
      <List sx={{ flexGrow: 1, px: 2, py: 2 }}>
        {menuItems.map((item, index) => (
          <Grow in timeout={300 + index * 100} key={item.path}>
            <ListItem disablePadding sx={{ mb: 1 }}>
              <ListItemButton
                selected={pathname === item.path}
                onClick={() => {
                  router.push(item.path);
                  if (isMobile) setMobileOpen(false);
                }}
                sx={{
                  borderRadius: 2,
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    backgroundColor: alpha(item.color, 0.1),
                    transform: 'translateX(4px)',
                  },
                  '&.Mui-selected': {
                    backgroundColor: alpha(item.color, 0.15),
                    borderLeft: `4px solid ${item.color}`,
                    '&:hover': {
                      backgroundColor: alpha(item.color, 0.2),
                    },
                  },
                }}
              >
                <ListItemIcon sx={{ color: item.color, minWidth: 40 }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText 
                  primary={item.text}
                  primaryTypographyProps={{
                    fontWeight: pathname === item.path ? 600 : 400,
                  }}
                />
              </ListItemButton>
            </ListItem>
          </Grow>
        ))}
      </List>

      <Divider />

      {/* フッターメニュー */}
      <List sx={{ px: 2, py: 1 }}>
        {footerItems.map((item) => (
          <ListItem key={item.path} disablePadding>
            <ListItemButton
              onClick={() => {
                router.push(item.path);
                if (isMobile) setMobileOpen(false);
              }}
              sx={{
                py: 1,
                borderRadius: 1,
                '&:hover': {
                  backgroundColor: alpha(theme.palette.primary.main, 0.08),
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 36, opacity: 0.7 }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText 
                primary={item.text}
                primaryTypographyProps={{
                  fontSize: '0.875rem',
                  opacity: 0.8,
                }}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      {/* ログアウトボタン */}
      {session && (
        <Box sx={{ p: 2 }}>
          <Button
            fullWidth
            variant="contained"
            startIcon={<LogoutIcon />}
            onClick={handleSignOut}
            sx={{
              background: 'linear-gradient(45deg, #FE6B8B 30%, #FF8E53 90%)',
              boxShadow: '0 3px 5px 2px rgba(255, 105, 135, .3)',
              '&:hover': {
                background: 'linear-gradient(45deg, #FE5B7B 30%, #FF7E43 90%)',
              },
            }}
          >
            ログアウト
          </Button>
        </Box>
      )}
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: theme.palette.background.default }}>
      {/* アプリバー */}
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
          backdropFilter: 'blur(20px)',
          backgroundColor: alpha(theme.palette.background.paper, 0.9),
          borderBottom: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <IconButton
              color="inherit"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2, display: { md: 'none' }, color: theme.palette.text.primary }}
            >
              <MenuIcon />
            </IconButton>
            
            <Box>
              <Typography 
                variant="h6" 
                noWrap 
                component="div"
                sx={{
                  fontWeight: 700,
                  background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                {title || 'メンバー専用掲示板'}
              </Typography>
              {subtitle && (
                <Typography variant="caption" color="text.secondary">
                  {subtitle}
                </Typography>
              )}
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {/* 通知アイコン */}
            <Tooltip title="通知">
              <IconButton color="inherit" sx={{ color: theme.palette.text.primary }}>
                <Badge badgeContent={notifications} color="error">
                  <NotificationsIcon />
                </Badge>
              </IconButton>
            </Tooltip>

            {/* ダークモード切り替え */}
            <Tooltip title="テーマ切り替え">
              <IconButton 
                onClick={() => setDarkMode(!darkMode)}
                sx={{ color: theme.palette.text.primary }}
              >
                {darkMode ? <LightModeIcon /> : <DarkModeIcon />}
              </IconButton>
            </Tooltip>

            {/* 設定アイコン */}
            <Tooltip title="設定">
              <IconButton color="inherit" sx={{ color: theme.palette.text.primary }}>
                <SettingsIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Toolbar>
      </AppBar>

      {/* サイドバー */}
      <Box
        component="nav"
        sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
              borderRight: 'none',
              boxShadow: '4px 0 24px rgba(0,0,0,0.12)',
            },
          }}
        >
          {drawerContent}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
              borderRight: 'none',
              boxShadow: '2px 0 12px rgba(0,0,0,0.08)',
              position: 'fixed',
              height: '100vh',
              zIndex: 1100,
            },
          }}
          open
        >
          {drawerContent}
        </Drawer>
      </Box>

      {/* メインコンテンツ */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, sm: 3, md: 4 },
          width: { xs: '100%', md: `calc(100% - ${drawerWidth}px)` },
          ml: { xs: 0, md: `${drawerWidth}px` },
          minHeight: '100vh',
          mt: { xs: 7, sm: 8, md: 9 },
        }}
      >
        <Container maxWidth="xl" sx={{ height: '100%' }}>
          <Fade in timeout={500}>
            <Box>{children}</Box>
          </Fade>
        </Container>
      </Box>

      {/* スクロールトップボタン */}
      <Zoom in={showScrollTop}>
        <Box
          onClick={scrollToTop}
          role="presentation"
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 1000,
          }}
        >
          <Tooltip title="トップへ戻る">
            <IconButton
              sx={{
                backgroundColor: theme.palette.primary.main,
                color: '#fff',
                boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
                '&:hover': {
                  backgroundColor: theme.palette.primary.dark,
                  transform: 'scale(1.1)',
                },
                transition: 'all 0.3s ease',
              }}
            >
              <ScrollTopIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Zoom>

      {/* ローディング表示 */}
      {status === 'loading' && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(255,255,255,0.9)',
            zIndex: 9999,
          }}
        >
          <CircularProgress size={60} />
        </Box>
      )}
    </Box>
  );
}