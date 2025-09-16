'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  List,
  ListItem,
  ListItemAvatar,
  Avatar,
  ListItemText,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';

import { UsersApi } from '@/lib/api/client/users';
import type { SuggestItem, SearchItem, HistoryItem } from '@/types/api/users';

export default function UserSearchClient() {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SuggestItem[]>([]);
  const [results, setResults] = useState<SearchItem[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const data = await UsersApi.historyGet();
        if ('ok' in data && data.ok) {
          setHistory(data.items);
        }
      } catch {
        console.warn('検索履歴の読み込みに失敗しました');
      }
    };
    loadHistory();
  }, []);

  useEffect(() => {
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const data = await UsersApi.suggest(query, 5, { signal: controller.signal });
        if ('ok' in data && data.ok) {
          setSuggestions(data.items);
        } else if (data && 'error' in data) {
          setError(data.error.message);
        }
      } catch (fetchError) {
        if (!(fetchError instanceof DOMException && fetchError.name === 'AbortError')) {
          console.warn('suggest fetch error', fetchError);
        }
      }
    }, 250);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [query]);

  const handleSearch = async (raw?: string) => {
    const target = raw ?? query;
    if (!target.trim()) {
      setError('検索キーワードを入力してください');
      return;
    }
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      const data = await UsersApi.search(target, 1, 20);
      if ('ok' in data && data.ok) {
        setResults(data.items || []);
        setInfo(`件数: ${(data.items || []).length}`);
        const historyRes = await UsersApi.historyAdd(target);
        if (historyRes && 'error' in historyRes) {
          console.warn('history add failed', historyRes.error);
        }
        setHistory((prev) => {
          const existing = prev.find((item) => item.q === target);
          if (existing) return prev;
          const newEntry: HistoryItem = {
            q: target,
            normalizedQ: '',
            count: 1,
            lastSearchedAt: new Date().toISOString(),
          };
          return [newEntry, ...prev].slice(0, 20);
        });
      } else if (data && 'error' in data) {
        setError(data.error.message || '検索に失敗しました');
      }
    } catch {
      setError('ネットワークエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const handleHistorySearch = (value: string) => {
    setQuery(value);
    void handleSearch(value);
  };

  const suggestionList = useMemo(() => {
    if (!suggestions.length) {
      return null;
    }
    return (
      <Box sx={{ mt: 2 }}>
        <Typography variant="subtitle2" color="text.secondary">
          サジェスト
        </Typography>
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', mt: 1 }}>
          {suggestions.map((item) => (
            <Chip
              key={item.id}
              label={item.displayName}
              color="primary"
              onClick={() => setQuery(item.displayName)}
              sx={{ mb: 1 }}
            />
          ))}
        </Stack>
      </Box>
    );
  }, [suggestions]);

  return (
    <Box sx={{ maxWidth: 720, mx: 'auto', textAlign: 'left' }}>
      <Typography
        variant="h4"
        sx={{ fontWeight: 700, mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}
      >
        <PeopleAltIcon /> ユーザー検索
      </Typography>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ユーザー名で検索"
          fullWidth
        />
        <Button variant="contained" onClick={() => void handleSearch()} disabled={loading}>
          検索
        </Button>
      </Stack>
      {loading && (
        <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <CircularProgress size={20} />
          <Typography variant="body2">検索中...</Typography>
        </Box>
      )}
      {error && (
        <Typography color="error" sx={{ mt: 2 }}>
          {error}
        </Typography>
      )}
      {info && (
        <Typography color="text.secondary" sx={{ mt: 2 }}>
          {info}
        </Typography>
      )}
      {suggestionList}
      <Divider sx={{ my: 3 }} />
      <Typography variant="subtitle1" sx={{ mb: 1 }}>
        検索結果
      </Typography>
      {results.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          ユーザーが見つかりませんでした
        </Typography>
      ) : (
        <List>
          {results.map((item) => (
            <ListItem key={item.id} alignItems="flex-start">
              <ListItemAvatar>
                <Avatar src={item.avatarUrl ?? undefined}>{item.displayName.slice(0, 1)}</Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={item.displayName}
                secondary={
                  <>
                    <Typography component="span" variant="body2" color="text.secondary">
                      {item.bio || 'プロフィール未設定'}
                    </Typography>
                    <Typography
                      component="span"
                      variant="body2"
                      sx={{ display: 'block' }}
                      color="text.secondary"
                    >
                      スコア: {item.score?.toFixed(2) ?? '0.00'} / フォロワー:{' '}
                      {item.followerCount ?? 0}
                    </Typography>
                  </>
                }
              />
            </ListItem>
          ))}
        </List>
      )}
      <Divider sx={{ my: 3 }} />
      <Typography variant="subtitle1" sx={{ mb: 1 }}>
        最近の検索
      </Typography>
      {history.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          検索履歴はまだありません
        </Typography>
      ) : (
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
          {history.map((item) => (
            <Chip
              key={`${item.q}-${item.normalizedQ}`}
              label={item.q}
              onClick={() => handleHistorySearch(item.q)}
              sx={{ mb: 1 }}
            />
          ))}
        </Stack>
      )}
    </Box>
  );
}
