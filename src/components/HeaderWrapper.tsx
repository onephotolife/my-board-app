'use client';

import dynamic from 'next/dynamic';
import { AppBar, Toolbar, Typography, Box } from '@mui/material';
import Link from 'next/link';

const ClientHeader = dynamic(() => import('./ClientHeader'), {
  ssr: false,
  loading: () => (
    <AppBar position="static">
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          <Link href="/" style={{ color: 'inherit', textDecoration: 'none' }}>
            会員制掲示板
          </Link>
        </Typography>
        <Box sx={{ width: 200, height: 36 }} />
      </Toolbar>
    </AppBar>
  ),
});

export default function HeaderWrapper() {
  return <ClientHeader />;
}