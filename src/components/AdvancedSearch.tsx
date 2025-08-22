'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { debounce } from 'lodash';
import {
  Container,
  Typography,
  Box,
  TextField,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  Chip,
  Stack,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  FormGroup,
  Autocomplete,
  IconButton,
  Divider,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Badge,
  Slider,
  InputAdornment,
  Collapse,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import {
  Search as SearchIcon,
  Clear as ClearIcon,
  FilterList as FilterListIcon,
  CalendarToday as CalendarIcon,
  Category as CategoryIcon,
  LocalOffer as LocalOfferIcon,
  Person as PersonIcon,
  TrendingUp as TrendingUpIcon,
  Visibility as VisibilityIcon,
  Favorite as FavoriteIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  History as HistoryIcon,
  SavedSearch as SavedSearchIcon,
  Article as ArticleIcon,
  Group as GroupIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ja } from 'date-fns/locale';
import { format } from 'date-fns';

interface SearchResult {
  posts: any[];
  users: any[];
  total: number;
}

interface SearchSuggestion {
  type: 'post' | 'tag' | 'user';
  value: string;
  id?: string;
}

const CATEGORIES = [
  { value: 'all', label: 'すべて' },
  { value: 'general', label: '一般' },
  { value: 'tech', label: '技術' },
  { value: 'question', label: '質問' },
  { value: 'discussion', label: '議論' },
  { value: 'announcement', label: 'お知らせ' },
];

const SORT_OPTIONS = [
  { value: 'relevance', label: '関連度順' },
  { value: 'date', label: '新しい順' },
  { value: 'likes', label: 'いいね順' },
  { value: 'views', label: '閲覧数順' },
];

export default function AdvancedSearch() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  // 検索状態
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<'posts' | 'users' | 'all'>('posts');
  const [results, setResults] = useState<SearchResult>({ posts: [], users: [], total: 0 });
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // フィルター状態
  const [showFilters, setShowFilters] = useState(true);
  const [category, setCategory] = useState('all');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [dateFrom, setDateFrom] = useState<Date | null>(null);
  const [dateTo, setDateTo] = useState<Date | null>(null);
  const [sortBy, setSortBy] = useState('relevance');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // 検索履歴
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [savedSearches, setSavedSearches] = useState<any[]>([]);
  
  // 統計情報
  const [searchStats, setSearchStats] = useState<any>(null);
  
  // Refs
  const searchInputRef = useRef<HTMLInputElement>(null);

  // オートコンプリート用のdebounced関数
  const fetchSuggestions = useCallback(
    debounce(async (query: string) => {
      if (query.length < 2) {
        setSuggestions([]);
        return;
      }

      try {
        const response = await fetch('/api/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query, type: searchType }),
        });

        const data = await response.json();
        if (data.success) {
          setSuggestions(data.suggestions);
        }
      } catch (error) {
        console.error('オートコンプリートエラー:', error);
      }
    }, 300),
    [searchType]
  );

  // 検索実行
  const executeSearch = async () => {
    if (!searchQuery.trim() && selectedTags.length === 0) {
      setError('検索キーワードまたはタグを入力してください');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams({
        q: searchQuery,
        type: searchType,
        category,
        sortBy,
        page: page.toString(),
        limit: '20',
      });

      selectedTags.forEach(tag => params.append('tags', tag));
      
      if (dateFrom) {
        params.append('dateFrom', format(dateFrom, 'yyyy-MM-dd'));
      }
      if (dateTo) {
        params.append('dateTo', format(dateTo, 'yyyy-MM-dd'));
      }

      const response = await fetch(`/api/search?${params}`);
      const data = await response.json();

      if (data.success) {
        setResults(data.data);
        setTotalPages(data.pagination.totalPages);
        setSearchStats({
          totalResults: data.pagination.total,
          searchTime: data.searchTime,
          suggestions: data.suggestions,
        });
        
        // 検索履歴に追加
        if (searchQuery && !searchHistory.includes(searchQuery)) {
          setSearchHistory(prev => [searchQuery, ...prev.slice(0, 9)]);
        }
      } else {
        setError(data.error?.message || '検索に失敗しました');
      }
    } catch (err) {
      setError('ネットワークエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  // 検索クエリ変更時のオートコンプリート
  useEffect(() => {
    fetchSuggestions(searchQuery);
  }, [searchQuery, fetchSuggestions]);

  // キーボードショートカット
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === '/' && e.ctrlKey) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === 'Enter' && document.activeElement === searchInputRef.current) {
        executeSearch();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [searchQuery]);

  const handleClearFilters = () => {
    setCategory('all');
    setSelectedTags([]);
    setDateFrom(null);
    setDateTo(null);
    setSortBy('relevance');
  };

  const handleSaveSearch = () => {
    const savedSearch = {
      id: Date.now().toString(),
      query: searchQuery,
      filters: {
        category,
        tags: selectedTags,
        dateFrom,
        dateTo,
        sortBy,
      },
      savedAt: new Date(),
    };
    setSavedSearches(prev => [savedSearch, ...prev]);
  };

  const handleLoadSavedSearch = (search: any) => {
    setSearchQuery(search.query);
    setCategory(search.filters.category);
    setSelectedTags(search.filters.tags);
    setDateFrom(search.filters.dateFrom);
    setDateTo(search.filters.dateTo);
    setSortBy(search.filters.sortBy);
  };

  if (status === 'loading') {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (status === 'unauthenticated') {
    router.push('/auth/signin');
    return null;
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 3 }}>
          高度な検索
        </Typography>

        {/* 検索バー */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Stack spacing={2}>
            <Autocomplete
              freeSolo
              options={suggestions}
              getOptionLabel={(option) => 
                typeof option === 'string' ? option : option.value
              }
              renderOption={(props, option) => (
                <ListItem {...props}>
                  <ListItemAvatar>
                    <Avatar sx={{ width: 32, height: 32 }}>
                      {option.type === 'post' && <ArticleIcon />}
                      {option.type === 'tag' && <LocalOfferIcon />}
                      {option.type === 'user' && <PersonIcon />}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={option.value}
                    secondary={option.type === 'tag' ? 'タグ' : option.type === 'user' ? 'ユーザー' : '投稿'}
                  />
                </ListItem>
              )}
              renderInput={(params) => (
                <TextField
                  {...params}
                  inputRef={searchInputRef}
                  placeholder="キーワードを入力... (Ctrl+/ でフォーカス)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  InputProps={{
                    ...params.InputProps,
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <>
                        {loading && <CircularProgress size={20} />}
                        {searchQuery && (
                          <IconButton size="small" onClick={() => setSearchQuery('')}>
                            <ClearIcon />
                          </IconButton>
                        )}
                      </>
                    ),
                  }}
                />
              )}
              onInputChange={(_, value) => setSearchQuery(value)}
            />

            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <ToggleButtonGroup
                value={searchType}
                exclusive
                onChange={(_, value) => value && setSearchType(value)}
                size="small"
              >
                <ToggleButton value="posts">
                  <ArticleIcon sx={{ mr: 1 }} />
                  投稿
                </ToggleButton>
                <ToggleButton value="users">
                  <GroupIcon sx={{ mr: 1 }} />
                  ユーザー
                </ToggleButton>
                <ToggleButton value="all">
                  すべて
                </ToggleButton>
              </ToggleButtonGroup>

              <Button
                variant="contained"
                startIcon={<SearchIcon />}
                onClick={executeSearch}
                disabled={loading}
                sx={{
                  background: 'linear-gradient(45deg, #667eea 30%, #764ba2 90%)',
                }}
              >
                検索
              </Button>

              <Button
                variant="outlined"
                startIcon={showFilters ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                onClick={() => setShowFilters(!showFilters)}
              >
                フィルター
              </Button>

              <IconButton onClick={handleSaveSearch} title="検索を保存">
                <SavedSearchIcon />
              </IconButton>
            </Box>
          </Stack>
        </Paper>

        {/* フィルターパネル */}
        <Collapse in={showFilters}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={3}>
                <FormControl fullWidth>
                  <InputLabel>カテゴリー</InputLabel>
                  <Select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    label="カテゴリー"
                  >
                    {CATEGORIES.map(cat => (
                      <MenuItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={3}>
                <Autocomplete
                  multiple
                  freeSolo
                  options={[]}
                  value={selectedTags}
                  onChange={(_, value) => setSelectedTags(value)}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => (
                      <Chip
                        variant="outlined"
                        label={option}
                        size="small"
                        {...getTagProps({ index })}
                      />
                    ))
                  }
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="タグ"
                      placeholder="タグを入力..."
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12} md={3}>
                <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ja}>
                  <DatePicker
                    label="開始日"
                    value={dateFrom}
                    onChange={setDateFrom}
                    slotProps={{
                      textField: { fullWidth: true },
                    }}
                  />
                </LocalizationProvider>
              </Grid>

              <Grid item xs={12} md={3}>
                <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ja}>
                  <DatePicker
                    label="終了日"
                    value={dateTo}
                    onChange={setDateTo}
                    slotProps={{
                      textField: { fullWidth: true },
                    }}
                  />
                </LocalizationProvider>
              </Grid>

              <Grid item xs={12}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <FormControl sx={{ minWidth: 200 }}>
                    <InputLabel>並び順</InputLabel>
                    <Select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      label="並び順"
                    >
                      {SORT_OPTIONS.map(option => (
                        <MenuItem key={option.value} value={option.value}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <Button
                    variant="text"
                    startIcon={<ClearIcon />}
                    onClick={handleClearFilters}
                  >
                    フィルターをクリア
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </Collapse>

        {/* 検索履歴・保存済み検索 */}
        {(searchHistory.length > 0 || savedSearches.length > 0) && !loading && results.total === 0 && (
          <Grid container spacing={3} sx={{ mb: 3 }}>
            {searchHistory.length > 0 && (
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
                    <HistoryIcon sx={{ mr: 1 }} />
                    最近の検索
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    {searchHistory.map((query, index) => (
                      <Chip
                        key={index}
                        label={query}
                        onClick={() => {
                          setSearchQuery(query);
                          executeSearch();
                        }}
                        onDelete={() => setSearchHistory(prev => prev.filter((_, i) => i !== index))}
                        size="small"
                      />
                    ))}
                  </Stack>
                </Paper>
              </Grid>
            )}

            {savedSearches.length > 0 && (
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
                    <SavedSearchIcon sx={{ mr: 1 }} />
                    保存済み検索
                  </Typography>
                  <Stack spacing={1}>
                    {savedSearches.slice(0, 3).map((search) => (
                      <Chip
                        key={search.id}
                        label={`${search.query} (${format(new Date(search.savedAt), 'MM/dd')})`}
                        onClick={() => handleLoadSavedSearch(search)}
                        onDelete={() => setSavedSearches(prev => prev.filter(s => s.id !== search.id))}
                        size="small"
                      />
                    ))}
                  </Stack>
                </Paper>
              </Grid>
            )}
          </Grid>
        )}

        {/* エラー表示 */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {/* 検索統計 */}
        {searchStats && (
          <Alert severity="info" sx={{ mb: 3 }}>
            {searchStats.totalResults}件の結果が見つかりました
            {searchStats.searchTime && ` (${searchStats.searchTime}ms)`}
            {searchStats.suggestions && searchStats.suggestions.length > 0 && (
              <Box sx={{ mt: 1 }}>
                関連キーワード: {searchStats.suggestions.map((s: string) => (
                  <Chip
                    key={s}
                    label={s}
                    size="small"
                    sx={{ ml: 1 }}
                    onClick={() => {
                      setSelectedTags(prev => [...prev, s]);
                    }}
                  />
                ))}
              </Box>
            )}
          </Alert>
        )}

        {/* 検索結果 */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {/* 投稿結果 */}
            {results.posts.length > 0 && (
              <Box sx={{ mb: 4 }}>
                <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                  <ArticleIcon sx={{ mr: 1 }} />
                  投稿 ({results.posts.length}件)
                </Typography>
                <Grid container spacing={2}>
                  {results.posts.map((post) => (
                    <Grid item xs={12} key={post._id}>
                      <Card>
                        <CardContent>
                          <Typography variant="h6" gutterBottom>
                            {post.title}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            {post.content.substring(0, 200)}...
                          </Typography>
                          <Stack direction="row" spacing={2} alignItems="center">
                            <Chip
                              icon={<CategoryIcon />}
                              label={post.category}
                              size="small"
                              data-testid={`search-post-category-${post._id}`}
                            />
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <PersonIcon fontSize="small" />
                              <Typography variant="caption">{post.author.name}</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <VisibilityIcon fontSize="small" />
                              <Typography 
                                variant="caption"
                                data-testid={`search-post-views-${post._id}`}
                              >
                                {post.views}
                              </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <FavoriteIcon fontSize="small" />
                              <Typography variant="caption">{post.likes?.length || 0}</Typography>
                            </Box>
                          </Stack>
                        </CardContent>
                        <CardActions>
                          <Button size="small" onClick={() => router.push(`/posts/${post._id}`)}>
                            詳細を見る
                          </Button>
                        </CardActions>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            )}

            {/* ユーザー結果 */}
            {results.users.length > 0 && (
              <Box>
                <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                  <GroupIcon sx={{ mr: 1 }} />
                  ユーザー ({results.users.length}件)
                </Typography>
                <Grid container spacing={2}>
                  {results.users.map((user) => (
                    <Grid item xs={12} md={6} key={user._id}>
                      <Card>
                        <CardContent>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Avatar sx={{ width: 56, height: 56 }}>
                              {user.name[0]}
                            </Avatar>
                            <Box>
                              <Typography variant="h6">{user.name}</Typography>
                              <Typography variant="body2" color="text.secondary">
                                {user.email}
                              </Typography>
                            </Box>
                          </Box>
                        </CardContent>
                        <CardActions>
                          <Button size="small" onClick={() => router.push(`/users/${user._id}`)}>
                            プロフィールを見る
                          </Button>
                        </CardActions>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            )}

            {/* 結果なし */}
            {results.total === 0 && searchQuery && (
              <Paper sx={{ p: 4, textAlign: 'center' }}>
                <Typography variant="h6" color="text.secondary">
                  「{searchQuery}」に一致する結果が見つかりませんでした
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                  別のキーワードやフィルターをお試しください
                </Typography>
              </Paper>
            )}
          </>
        )}
      </Box>
    </Container>
  );
}