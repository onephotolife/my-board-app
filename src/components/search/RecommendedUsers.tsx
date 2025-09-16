'use client';

import * as React from 'react';
import { Avatar, Box, Skeleton, Stack, Typography } from '@mui/material';

import { UsersApi } from '@/lib/api/client/users';
import type { ApiError, RecoItem, RecoResponse } from '@/types/api/users';

type Props = {
  limit?: number;
};

type RecommendationsResult = RecoResponse | ApiError;

function isApiError(value: RecommendationsResult): value is ApiError {
  return value.ok === false;
}

export function RecommendedUsers({ limit = 6 }: Props) {
  const [items, setItems] = React.useState<RecoItem[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const response = await UsersApi.recommendations(limit);
        if (!active) {
          return;
        }
        if (isApiError(response)) {
          setItems([]);
        } else {
          setItems(response.items ?? []);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [limit]);

  if (loading) {
    return (
      <Stack spacing={1} aria-label="おすすめユーザーローディング">
        {Array.from({ length: Math.max(3, limit) }).map((_, index) => (
          <Skeleton key={index} variant="rounded" height={52} />
        ))}
      </Stack>
    );
  }

  if (items.length === 0) {
    return null;
  }

  return (
    <Stack spacing={1} aria-label="おすすめユーザー">
      <Typography variant="subtitle2" component="div">
        おすすめユーザー
      </Typography>
      {items.map((user) => (
        <Stack key={user.id} direction="row" spacing={1} alignItems="center">
          <Avatar src={user.avatarUrl ?? undefined} alt={user.displayName} />
          <Box>
            <Typography variant="body2">{user.displayName}</Typography>
            {typeof user.followerCount === 'number' && (
              <Typography variant="caption" color="text.secondary">
                followers: {user.followerCount}
              </Typography>
            )}
          </Box>
        </Stack>
      ))}
    </Stack>
  );
}
