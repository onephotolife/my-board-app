'use client';

import { AppBar, Toolbar, Typography, Button, Box, Avatar, Menu, MenuItem, IconButton, Skeleton } from '@mui/material';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import PersonIcon from '@mui/icons-material/Person';

export default function ClientHeader() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleSignOut = async () => {
    await signOut({ redirect: false });
    router.push('/');
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleProfileClick = () => {
    router.push('/profile');
    handleMenuClose();
  };

  // アバターの頭文字を生成
  const getInitials = (name?: string | null) => {
    if (!name) return '?';
    const parts = name.split(' ');
    return parts.map(p => p[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <AppBar position="static">
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          <Link href="/" style={{ color: 'inherit', textDecoration: 'none' }}>
            会員制掲示板
          </Link>
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {status === 'loading' ? (
            <Skeleton variant="rectangular" width={120} height={36} sx={{ borderRadius: 1 }} />
          ) : session ? (
            <>
              <Button color="inherit" href="/board">
                掲示板
              </Button>
              <Box sx={{ display: 'flex', alignItems: 'center', ml: 2 }}>
                <Typography component="span" sx={{ mr: 1, color: 'inherit' }}>
                  {session.user?.name}さん
                </Typography>
                <IconButton
                  onClick={handleMenuOpen}
                  sx={{ p: 0 }}
                  aria-label="プロフィールメニュー"
                >
                  <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.main' }}>
                    {getInitials(session.user?.name)}
                  </Avatar>
                </IconButton>
                <Menu
                  anchorEl={anchorEl}
                  open={Boolean(anchorEl)}
                  onClose={handleMenuClose}
                  anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'right',
                  }}
                  transformOrigin={{
                    vertical: 'top',
                    horizontal: 'right',
                  }}
                >
                  <MenuItem onClick={handleProfileClick}>
                    <PersonIcon sx={{ mr: 1 }} />
                    プロフィール
                  </MenuItem>
                  <MenuItem onClick={handleSignOut}>
                    ログアウト
                  </MenuItem>
                </Menu>
              </Box>
            </>
          ) : (
            <>
              <Button color="inherit" href="/auth/signin">
                ログイン
              </Button>
            </>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
}