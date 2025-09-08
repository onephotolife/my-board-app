'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Box,
  Chip,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';

export type TrendingItem = { key: string; count: number };

interface Props {
  days?: number; // 集計期間（日）
  limit?: number; // 表示件数
  title?: string; // 見出し文言
  dense?: boolean; // 余白を詰める
  initial?: TrendingItem[]; // SSR初期値
}

export default function TrendingTagsBar({
  days = 30,
  limit = 20,
  title = '人気タグ（よく使われるタグ）',
  dense = false,
  initial,
}: Props) {
  const [items, setItems] = useState<TrendingItem[]>(initial || []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<7 | 30 | 90>(
    [7, 30, 90].includes(days) ? (days as 7 | 30 | 90) : 30
  );

  useEffect(() => {
    let aborted = false;
    const fetchTrending = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/tags/trending?days=${range}&limit=${limit}`, {
          credentials: 'include',
          cache: 'no-store',
        });
        if (res.status === 429) {
          setError('レート制限に達しました。しばらく待ってから再試行してください。');
          return;
        }
        if (!res.ok) throw new Error('TRENDING_FETCH_ERROR');
        const json = await res.json();
        if (!aborted) setItems(Array.isArray(json?.data) ? json.data : []);
      } catch {
        // 初期値がある場合はUIを維持してエラーだけ通知
        if (!aborted) setError('人気タグの取得に失敗しました');
      } finally {
        if (!aborted) setLoading(false);
      }
    };
    fetchTrending();
    return () => {
      aborted = true;
    };
  }, [range, limit]);

  return (
    <Paper sx={{ p: dense ? 1.5 : 2, mb: dense ? 1.5 : 2 }} data-testid="trending-tags-bar">
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 1,
          flexWrap: 'wrap',
          mb: dense ? 1 : 1.5,
        }}
      >
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
          {title}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="caption" color="text.secondary" sx={{ mr: 0.5 }}>
            期間
          </Typography>
          <ToggleButtonGroup
            size="small"
            color="primary"
            exclusive
            value={range}
            onChange={(_, v: 7 | 30 | 90 | null) => {
              if (v) setRange(v);
            }}
            aria-label="trending range"
            data-testid="trending-range-toggle"
          >
            <ToggleButton value={7} aria-label="7 days">
              7日
            </ToggleButton>
            <ToggleButton value={30} aria-label="30 days">
              30日
            </ToggleButton>
            <ToggleButton value={90} aria-label="90 days">
              90日
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Box>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 1 }}>
          <CircularProgress size={20} />
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 1 }}>
          {error}
        </Alert>
      )}

      {!loading && !error && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
          {items.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              データがありません
            </Typography>
          ) : (
            items.map((t) => (
              <Chip
                key={t.key}
                label={`#${t.key} (${t.count})`}
                component={Link}
                href={`/tags/${encodeURIComponent(t.key)}`}
                clickable
                size="small"
                sx={{ textDecoration: 'none' }}
              />
            ))
          )}
        </Box>
      )}
    </Paper>
  );
}
