'use client';

import * as React from 'react';
import { Avatar, Card, CardContent, CardHeader, Typography } from '@mui/material';

import type { SearchItem } from '@/types/api/users';

export function UserResultCard({ item }: { item: SearchItem }) {
  const scoreText = typeof item.score === 'number' ? item.score.toFixed(2) : '0.00';
  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardHeader
        avatar={<Avatar src={item.avatarUrl ?? undefined} alt={item.displayName} />}
        title={item.displayName}
        subheader={`followers: ${item.followerCount} / score: ${scoreText}`}
      />
      {item.bio && (
        <CardContent>
          <Typography variant="body2" color="text.secondary">
            {item.bio}
          </Typography>
        </CardContent>
      )}
    </Card>
  );
}
