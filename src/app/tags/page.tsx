'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Container,
  Typography,
  TextField,
  ToggleButtonGroup,
  ToggleButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Button,
  CircularProgress,
  Paper,
  InputAdornment,
  Alert,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import TagIcon from '@mui/icons-material/Tag';

import TrendingTagsBar from '@/components/TrendingTagsBar';

interface Tag {
  key: string;
  display: string;
  countTotal: number;
  lastUsedAt: string;
}

interface TagsResponse {
  success: boolean;
  data: Tag[];
  pagination: {
    page: number;
    limit: number;
    hasNext: boolean;
  };
}

export default function TagsPage() {
  const router = useRouter();
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'popular' | 'recent'>('popular');
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);

  const fetchTags = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Remove # from search query if present
      const cleanQuery = searchQuery.replace(/^#/, '');

      const params = new URLSearchParams({
        q: cleanQuery,
        sort: sortBy,
        page: page.toString(),
        limit: '20',
      });

      const response = await fetch(`/api/tags/index?${params}`);

      if (response.status === 429) {
        setError('レート制限に達しました。しばらくお待ちください。');
        setTimeout(() => fetchTags(), 1000);
        return;
      }

      if (!response.ok) {
        throw new Error('タグの取得に失敗しました');
      }

      const data: TagsResponse = await response.json();

      if (!data.success) {
        throw new Error('タグの取得に失敗しました');
      }

      setTags(data.data || []);
      setHasNext(data.pagination?.hasNext || false);
    } catch (err) {
      console.error('[TAGS-PAGE-ERROR]', err);
      setError('タグの読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, sortBy, page]);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();
    setPage(1);
    fetchTags();
  };

  const handleSortChange = (
    _: React.MouseEvent<HTMLElement>,
    newSort: 'popular' | 'recent' | null
  ) => {
    if (newSort !== null) {
      setSortBy(newSort);
      setPage(1);
    }
  };

  const handleTagClick = (tagKey: string) => {
    router.push(`/tags/${encodeURIComponent(tagKey)}`);
  };

  const handleNextPage = () => {
    setPage((prev) => prev + 1);
  };

  const handlePrevPage = () => {
    setPage((prev) => Math.max(1, prev - 1));
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          タグ一覧
        </Typography>
        <Typography variant="body1" color="text.secondary">
          人気のタグや最近使用されたタグを探索
        </Typography>
      </Box>

      {/* 使用頻度ベースの人気タグ（期間トグル付き） */}
      <TrendingTagsBar days={30} limit={20} title="人気タグ（よく使われるタグ）" />

      <Paper sx={{ p: 3, mb: 3 }}>
        <form onSubmit={handleSearch} style={{ marginBottom: 24 }}>
          <TextField
            fullWidth
            label="タグを検索"
            placeholder="検索キーワードを入力"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            data-testid="tags-search-input"
          />
        </form>

        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
          <ToggleButtonGroup
            value={sortBy}
            exclusive
            onChange={handleSortChange}
            aria-label="sort tags"
            data-testid="tags-sort-toggle"
          >
            <ToggleButton value="popular" aria-label="popular tags">
              <TrendingUpIcon sx={{ mr: 1 }} />
              人気順
            </ToggleButton>
            <ToggleButton value="recent" aria-label="recent tags">
              <AccessTimeIcon sx={{ mr: 1 }} />
              最近使用
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} data-testid="tags-error-alert">
          {error}
        </Alert>
      )}

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {!loading && tags.length === 0 && (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="body1" color="text.secondary">
            タグが見つかりません
          </Typography>
        </Paper>
      )}

      {!loading && tags.length > 0 && (
        <Paper>
          <List data-testid="tags-list">
            {tags.map((tag) => (
              <ListItem key={tag.key} disablePadding>
                <ListItemButton
                  onClick={() => handleTagClick(tag.key)}
                  data-testid={`tag-item-${tag.key}`}
                >
                  <TagIcon sx={{ mr: 2, color: 'primary.main' }} />
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Typography variant="h6" component="span">
                          #{tag.display}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {tag.countTotal} 件の投稿
                        </Typography>
                      </Box>
                    }
                    secondary={
                      <Typography variant="caption" color="text.secondary">
                        最終使用: {new Date(tag.lastUsedAt).toLocaleDateString('ja-JP')}
                      </Typography>
                    }
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Paper>
      )}

      {!loading && (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
          <Button
            variant="outlined"
            onClick={handlePrevPage}
            disabled={page === 1}
            data-testid="tags-prev-button"
          >
            前のページ
          </Button>
          <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center' }}>
            ページ {page}
          </Typography>
          <Button
            variant="outlined"
            onClick={handleNextPage}
            disabled={!hasNext}
            data-testid="tags-next-button"
          >
            次のページ
          </Button>
        </Box>
      )}
    </Container>
  );
}
