'use client';

import { AppBar, Toolbar, Typography, Button, Box } from '@mui/material';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function Header() {
  const { data: session } = useSession();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut({ redirect: false });
    router.push('/');
  };

  return (
    <AppBar position="static">
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          <Link href="/" style={{ color: 'inherit', textDecoration: 'none' }}>
            会員制掲示板
          </Link>
        </Typography>
        <Box>
          {session ? (
            <>
              <Typography component="span" sx={{ mr: 2 }}>
                {session.user?.name}さん
              </Typography>
              <Button color="inherit" href="/board">
                掲示板
              </Button>
              <Button color="inherit" onClick={handleSignOut}>
                ログアウト
              </Button>
            </>
          ) : (
            <>
              <Button color="inherit" href="/auth/signin">
                ログイン
              </Button>
              <Button color="inherit" href="/auth/signup">
                新規登録
              </Button>
            </>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
}