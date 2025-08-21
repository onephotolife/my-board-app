'use client';

import { 
  AppBar, 
  Toolbar, 
  Typography, 
  Button, 
  Box, 
  Avatar, 
  IconButton, 
  Skeleton
} from '@mui/material';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import DashboardIcon from '@mui/icons-material/Dashboard';
import ForumIcon from '@mui/icons-material/Forum';
import MenuIcon from '@mui/icons-material/Menu';

import SlideDrawer from './SlideDrawer';

export default function ClientHeader() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut({ redirect: false });
    router.push('/');
  };


  // アバターの頭文字を生成
  const getInitials = (name?: string | null) => {
    if (!name) return '?';
    const parts = name.split(' ');
    return parts.map(p => p[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <>
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
              <IconButton
                color="inherit"
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
                href="/dashboard"
                startIcon={<DashboardIcon />}
                sx={{ display: { xs: 'none', md: 'flex' } }}
              >
                ダッシュボード
              </Button>
              <Box sx={{ display: 'flex', alignItems: 'center', ml: { xs: 1, sm: 2 }, maxWidth: { xs: 150, sm: 200, md: 250 } }}>
                <Typography 
                  component="span" 
                  sx={{ 
                    mr: 1, 
                    color: 'inherit',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: { xs: 100, sm: 150, md: 200 },
                    display: { xs: 'none', sm: 'inline' }
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
              <Button color="inherit" href="/auth/signin">
                ログイン
              </Button>
            </>
          )}
          <IconButton
            color="inherit"
            aria-label="メニューを開く"
            edge="end"
            onClick={() => setDrawerOpen(true)}
            sx={{ ml: 1 }}
          >
            <MenuIcon />
          </IconButton>
        </Box>
        </Toolbar>
      </AppBar>
    
    {/* SlideDrawerコンポーネントを使用 */}
    <SlideDrawer 
      open={drawerOpen} 
      onClose={() => setDrawerOpen(false)}
      onOpen={() => setDrawerOpen(true)} 
    />
    </>
  );
}