import * as React from 'react';
import { Suspense } from 'react';
import { Box, Container, Typography } from '@mui/material';

import UserSearchPageClient from './UserSearchPageClient';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export default function SearchPage() {
  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Box sx={{ mb: 2 }}>
        <Typography variant="h5" component="h1">
          ユーザー検索
        </Typography>
      </Box>
      <Suspense>
        <UserSearchPageClient />
      </Suspense>
    </Container>
  );
}
