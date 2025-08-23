'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
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
  Button,
  Drawer,
  IconButton,
  AppBar,
  Toolbar
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  PostAdd as PostAddIcon,
  Forum as ForumIcon,
  Person as PersonIcon,
  Logout as LogoutIcon,
  Settings as SettingsIcon,
  Article as ArticleIcon,
  Menu as MenuIcon,
  Close as CloseIcon
} from '@mui/icons-material';

export default function Sidebar() {
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleSignOut = async () => {
    console.log('🚪 ログアウト処理開始');
    await signOut({ redirect: true, callbackUrl: '/auth/signin' });
  };

  const menuItems = [
    {
      path: '/dashboard',
      label: 'ダッシュボード',
      icon: <DashboardIcon />,
      bgcolor: 'primary.light'
    },
    {
      path: '/board',
      label: '掲示板',
      icon: <ForumIcon />,
      bgcolor: 'success.light'
    },
    {
      path: '/posts/new',
      label: '新規投稿',
      icon: <PostAddIcon />,
      bgcolor: 'warning.light'
    },
    {
      path: '/my-posts',
      label: '自分の投稿',
      icon: <ArticleIcon />,
      bgcolor: 'info.light'
    },
    {
      path: '/profile',
      label: 'プロフィール',
      icon: <PersonIcon />,
      bgcolor: 'info.light'
    },
    {
      path: '/settings',
      label: '設定',
      icon: <SettingsIcon />,
      bgcolor: 'secondary.light'
    }
  ];

  const sidebarContent = (
    <Box sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ mb: 4, textAlign: 'center' }}>
        <Avatar
          sx={{
            width: 100,
            height: 100,
            margin: '0 auto',
            mb: 2,
            bgcolor: 'primary.main',
            fontSize: '2rem'
          }}
        >
          {session?.user?.name?.[0] || session?.user?.email?.[0]?.toUpperCase()}
        </Avatar>
        <Typography variant="h6" gutterBottom>
          {session?.user?.name || 'ユーザー'}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {session?.user?.email}
        </Typography>
        <Chip
          label="メンバー"
          color="primary"
          size="small"
          sx={{ mt: 1 }}
        />
      </Box>

      <Divider sx={{ mb: 3 }} />

      <List>
        {menuItems.map((item) => (
          <ListItem 
            key={item.path}
            button 
            onClick={() => {
              router.push(item.path);
              setMobileOpen(false);
            }}
            selected={pathname === item.path}
            sx={{
              borderRadius: 1,
              mb: 0.5,
              '&.Mui-selected': {
                bgcolor: 'action.selected',
                '&:hover': {
                  bgcolor: 'action.selected'
                }
              }
            }}
          >
            <ListItemAvatar>
              <Avatar sx={{ bgcolor: item.bgcolor }}>
                {item.icon}
              </Avatar>
            </ListItemAvatar>
            <ListItemText primary={item.label} />
          </ListItem>
        ))}
      </List>

      <Box sx={{ flexGrow: 1 }} />

      <Divider sx={{ my: 3 }} />

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
            bgcolor: 'rgba(211, 47, 47, 0.04)'
          }
        }}
      >
        ログアウト
      </Button>
    </Box>
  );

  return (
    <>
      {/* モバイル用のAppBar */}
      <AppBar
        position="fixed"
        sx={{
          display: { xs: 'block', md: 'none' },
          bgcolor: 'white',
          color: 'text.primary',
          boxShadow: 1
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div">
            会員制掲示板
          </Typography>
        </Toolbar>
      </AppBar>

      {/* モバイル用のDrawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{
          keepMounted: true,
        }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': { 
            boxSizing: 'border-box', 
            width: 280,
            bgcolor: 'white'
          },
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 1 }}>
          <IconButton onClick={handleDrawerToggle}>
            <CloseIcon />
          </IconButton>
        </Box>
        {sidebarContent}
      </Drawer>

      {/* デスクトップ用のサイドバー */}
      <Box
        sx={{
          width: 280,
          bgcolor: 'white',
          borderRight: '1px solid #e0e0e0',
          display: { xs: 'none', md: 'block' },
          height: '100vh',
          position: 'sticky',
          top: 0,
          overflowY: 'auto'
        }}
      >
        {sidebarContent}
      </Box>
    </>
  );
}