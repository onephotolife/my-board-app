'use client';

import { AppBar, Toolbar, Typography, Button, Box } from '@mui/material';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function Header() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSignOut = async () => {
    await signOut({ redirect: false });
    router.push('/');
  };

  // Return minimal header during SSR to prevent hydration mismatch
  if (!mounted) {
    return (
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            <Link href="/" style={{ color: 'inherit', textDecoration: 'none' }}>
              会員制掲示板
            </Link>
          </Typography>
          <Box sx={{ width: 120, height: 36 }} />
        </Toolbar>
      </AppBar>
    );
  }

  return (
    <AppBar position="static">
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          <Link href="/" style={{ color: 'inherit', textDecoration: 'none' }}>
            会員制掲示板
          </Link>
        </Typography>
        <Box>
          {status === 'loading' ? (
            <Box sx={{ width: 120, height: 36 }} />
          ) : session ? (
            <>
              <Typography component="span" sx={{ mr: 2, color: 'inherit' }}>
                {session.user?.name}さん
              </Typography>
              <Button color="inherit" href="/board">
                掲示板
              </Button>
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