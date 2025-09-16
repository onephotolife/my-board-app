'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Box, Grid, Pagination, Skeleton, Stack, Typography } from '@mui/material';

import { UsersApi } from '@/lib/api/client/users';
import { SearchHistoryChips } from '@/components/search/SearchHistoryChips';
import { UserSearchBar } from '@/components/search/UserSearchBar';
import { UserResultCard } from '@/components/search/UserResultCard';
import { RecommendedUsers } from '@/components/search/RecommendedUsers';
import { mark, measure, report } from '@/lib/ux/metrics';
import type { ApiError, SearchItem, SearchResponse } from '@/types/api/users';

const isApiError = (value: SearchResponse | ApiError): value is ApiError => value.ok === false;

export default function UserSearchPageClient() {
  const router = useRouter();
  const params = useSearchParams();

  const initialQuery = params.get('q') || '';
  const initialPage = Number(params.get('page') || '1') || 1;

  const [query, setQuery] = React.useState(initialQuery);
  const [page, setPage] = React.useState(initialPage > 0 ? initialPage : 1);
  const [items, setItems] = React.useState<SearchItem[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [historyRefresh, setHistoryRefresh] = React.useState(0);
  const [syncedParams, setSyncedParams] = React.useState(() => params.toString());
  const limit = 12;
  const totalPage = 10;

  const syncUrl = React.useCallback(
    (nextQuery: string, nextPage: number) => {
      const url = new URL(window.location.href);
      if (nextQuery) {
        url.searchParams.set('q', nextQuery);
      } else {
        url.searchParams.delete('q');
      }
      if (nextPage > 1) {
        url.searchParams.set('page', String(nextPage));
      } else {
        url.searchParams.delete('page');
      }
      const nextSearch = url.searchParams.toString();
      router.replace(`${url.pathname}${nextSearch ? `?${nextSearch}` : ''}`);
      setSyncedParams(nextSearch);
    },
    [router]
  );

  const doSearch = React.useCallback(
    async (targetQuery: string, targetPage = 1) => {
      if (!targetQuery.trim()) {
        setItems([]);
        setErrorMessage(null);
        return;
      }

      setLoading(true);
      setErrorMessage(null);
      mark('search:fetch');
      try {
        const response = await UsersApi.search(targetQuery, targetPage, limit);
        const duration = measure('search:fetch');
        if (duration != null) {
          report({
            metric: 'search:fetch',
            ms: Math.round(duration),
            length: targetQuery.length,
            page: targetPage,
          });
        }

        if (isApiError(response)) {
          setItems([]);
          setErrorMessage(response.error.message || '検索に失敗しました');
          return;
        }

        setItems(response.items ?? []);
        void UsersApi.historyAdd(targetQuery);
        setHistoryRefresh((prev) => prev + 1);
      } catch (error) {
        setItems([]);
        setErrorMessage(error instanceof Error ? error.message : '検索に失敗しました');
      } finally {
        setLoading(false);
      }
    },
    [limit]
  );

  React.useEffect(() => {
    if (initialQuery) {
      void doSearch(initialQuery, page);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    const current = params.toString();
    if (current === syncedParams) {
      return;
    }
    setSyncedParams(current);
    const urlQuery = params.get('q') || '';
    const urlPage = Number(params.get('page') || '1') || 1;
    setQuery(urlQuery);
    setPage(urlPage > 0 ? urlPage : 1);
    if (urlQuery) {
      void doSearch(urlQuery, urlPage > 0 ? urlPage : 1);
    } else {
      setItems([]);
      setErrorMessage(null);
    }
  }, [params, syncedParams, doSearch]);

  React.useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    syncUrl(query, page);
  }, [query, page, syncUrl]);

  const handleSubmit = React.useCallback(
    (value: string) => {
      setQuery(value);
      setPage(1);
      void doSearch(value, 1);
    },
    [doSearch]
  );

  const handlePageChange = (_: React.ChangeEvent<unknown>, nextPage: number) => {
    setPage(nextPage);
    void doSearch(query, nextPage);
  };

  return (
    <Grid container spacing={3} aria-live="polite">
      <Grid item xs={12} md={8} lg={9}>
        <Stack spacing={2}>
          <UserSearchBar value={query} onChange={setQuery} onSubmit={handleSubmit} />
          <SearchHistoryChips onPick={handleSubmit} refreshToken={historyRefresh} />
          {errorMessage && (
            <Box role="alert">
              <Typography color="error">{errorMessage}</Typography>
            </Box>
          )}
          {loading ? (
            <Grid container spacing={2} aria-busy="true">
              {Array.from({ length: 6 }).map((_, index) => (
                <Grid key={index} item xs={12} sm={6} md={4}>
                  <Skeleton variant="rounded" height={140} />
                </Grid>
              ))}
            </Grid>
          ) : (
            <Grid container spacing={2} aria-busy="false">
              {items.map((item) => (
                <Grid key={item.id} item xs={12} sm={6} md={4}>
                  <UserResultCard item={item} />
                </Grid>
              ))}
              {items.length === 0 && !errorMessage && (
                <Grid item xs={12}>
                  <Box sx={{ p: 2 }}>
                    <Typography color="text.secondary">検索結果がありません</Typography>
                  </Box>
                </Grid>
              )}
            </Grid>
          )}
          <Box>
            <Pagination
              page={page}
              count={totalPage}
              onChange={handlePageChange}
              disabled={!query.trim()}
            />
          </Box>
        </Stack>
      </Grid>
      <Grid item xs={12} md={4} lg={3}>
        <RecommendedUsers limit={6} />
      </Grid>
    </Grid>
  );
}
