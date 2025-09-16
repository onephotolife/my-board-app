'use client';

import * as React from 'react';
import { Box, Chip, IconButton, Stack, Tooltip } from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';

import { UsersApi } from '@/lib/api/client/users';
import type { ApiError, HistoryItem, HistoryResponse } from '@/types/api/users';

type Props = {
  onPick: (query: string) => void;
  refreshToken?: number;
};

function isApiError(value: HistoryResponse | ApiError): value is ApiError {
  return value.ok === false;
}

export function SearchHistoryChips({ onPick, refreshToken }: Props) {
  const [items, setItems] = React.useState<HistoryItem[]>([]);
  const [loading, setLoading] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const response = await UsersApi.historyGet();
      if (isApiError(response)) {
        setItems([]);
      } else {
        setItems(response.items ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load, refreshToken]);

  const clearAll = React.useCallback(async () => {
    setLoading(true);
    try {
      const response = await UsersApi.historyDelete();
      if (!isApiError(response)) {
        await load();
      }
    } finally {
      setLoading(false);
    }
  }, [load]);

  const removeOne = React.useCallback(
    async (query: string) => {
      setLoading(true);
      try {
        await UsersApi.historyDelete(query);
        // 再取得で最新状態に
        await load();
      } finally {
        setLoading(false);
      }
    },
    [load]
  );

  const hasItems = items.length > 0;

  return (
    <Box aria-label="最近の検索">
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
        <Box component="strong">最近の検索</Box>
        <Tooltip title="すべて削除">
          <span>
            <IconButton
              size="small"
              onClick={() => void clearAll()}
              disabled={loading || !hasItems}
              aria-label="すべて削除"
            >
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      </Stack>
      <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
        {hasItems ? (
          items.map((item) => (
            <Chip
              key={`${item.normalizedQ}-${item.lastSearchedAt}`}
              label={item.q}
              onClick={() => onPick(item.q)}
              onDelete={() => void removeOne(item.q)}
              size="small"
              variant="outlined"
            />
          ))
        ) : (
          <Chip label="（履歴なし）" size="small" disabled aria-disabled="true" />
        )}
      </Stack>
    </Box>
  );
}
