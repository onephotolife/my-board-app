'use client';

import React from 'react';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Box,
  Avatar,
  Typography,
  Button,
  Divider,
  IconButton,
} from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import DashboardIcon from '@mui/icons-material/Dashboard';
import ForumIcon from '@mui/icons-material/Forum';
import PersonIcon from '@mui/icons-material/Person';
import LoginIcon from '@mui/icons-material/Login';
import CloseIcon from '@mui/icons-material/Close';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface MobileDrawerProps {
  open: boolean;
  onClose: () => void;
}

export default function MobileDrawer({ open, onClose }: MobileDrawerProps) {
  const { data: session } = useSession();
  const router = useRouter();

  const handleNavigate = (path: string) => {
    router.push(path);
    onClose();
  };

  const handleSignOut = async () => {
    await signOut({ redirect: false });
    router.push('/');
    onClose();
  };

  const getInitials = (name?: string | null) => {
    if (!name) return '?';
    const parts = name.split(' ');
    return parts.map(p => p[0]).join('').toUpperCase().slice(0, 2);
  };

  const drawerWidth = 280;

  return (
    <Drawer
      anchor="left"
      open={open}
      onClose={onClose}
      variant="temporary"
      PaperProps={{
        sx: {
          width: drawerWidth,
          backgroundColor: '#ffffff',
          boxShadow: '0 0 20px rgba(0, 0, 0, 0.1)',
        }
      }}
      sx={{
        '& .MuiDrawer-paper': {
          position: 'fixed',
          left: 0,
          width: drawerWidth,
          boxSizing: 'border-box',
        },
      }}
      // 重要: モーダルの背景を設定
      ModalProps={{
        keepMounted: true,
        BackdropProps: {
          sx: {
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
          }
        }
      }}
    >
      <Box
        sx={{
          width: drawerWidth,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* ヘッダー部分 */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            p: 2,
            borderBottom: '1px solid rgba(0, 0, 0, 0.12)',
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            メニュー
          </Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>

        {/* メニューリスト */}
        <Box sx={{ flex: 1, overflow: 'auto' }}>
          <List sx={{ pt: 1 }}>
            {/* ホーム */}
            <ListItem disablePadding>
              <ListItemButton onClick={() => handleNavigate('/')}>
                <ListItemIcon>
                  <HomeIcon />
                </ListItemIcon>
                <ListItemText primary="ホーム" />
              </ListItemButton>
            </ListItem>

            {session && (
              <>
                {/* ダッシュボード */}
                <ListItem disablePadding>
                  <ListItemButton onClick={() => handleNavigate('/dashboard')}>
                    <ListItemIcon>
                      <DashboardIcon />
                    </ListItemIcon>
                    <ListItemText primary="ダッシュボード" />
                  </ListItemButton>
                </ListItem>

                {/* 掲示板 */}
                <ListItem disablePadding>
                  <ListItemButton onClick={() => handleNavigate('/board')}>
                    <ListItemIcon>
                      <ForumIcon />
                    </ListItemIcon>
                    <ListItemText primary="掲示板" />
                  </ListItemButton>
                </ListItem>

                {/* プロフィール */}
                <ListItem disablePadding>
                  <ListItemButton onClick={() => handleNavigate('/profile')}>
                    <ListItemIcon>
                      <PersonIcon />
                    </ListItemIcon>
                    <ListItemText primary="プロフィール" />
                  </ListItemButton>
                </ListItem>
              </>
            )}
          </List>
        </Box>

        {/* ユーザー情報・ログアウト部分 */}
        <Box sx={{ borderTop: '1px solid rgba(0, 0, 0, 0.12)', p: 2 }}>
          {session ? (
            <>
              {/* ユーザー情報 */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  mb: 2,
                }}
              >
                <Avatar
                  sx={{
                    width: 40,
                    height: 40,
                    background: 'linear-gradient(135deg, #ec4899 0%, #f59e0b 100%)',
                    fontSize: '16px',
                    fontWeight: 600,
                  }}
                >
                  {getInitials(session.user?.name || session.user?.email)}
                </Avatar>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 600,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {session.user?.name || session.user?.email?.split('@')[0]}さん
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      color: 'text.secondary',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {session.user?.email}
                  </Typography>
                </Box>
              </Box>

              {/* ログアウトボタン */}
              <Button
                fullWidth
                variant="outlined"
                color="error"
                onClick={handleSignOut}
                sx={{
                  borderColor: '#ef4444',
                  color: '#ef4444',
                  '&:hover': {
                    borderColor: '#dc2626',
                    backgroundColor: 'rgba(239, 68, 68, 0.05)',
                  },
                }}
              >
                ログアウト
              </Button>
            </>
          ) : (
            /* ログインボタン */
            <ListItem disablePadding>
              <ListItemButton onClick={() => handleNavigate('/auth/signin')}>
                <ListItemIcon>
                  <LoginIcon />
                </ListItemIcon>
                <ListItemText primary="ログイン" />
              </ListItemButton>
            </ListItem>
          )}
        </Box>
      </Box>
    </Drawer>
  );
}