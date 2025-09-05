import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { debounce } from 'lodash';

interface HashtagSuggestion {
  key: string;
  display: string;
  count: number;
  lastUsedAt: string;
}

interface ApiTagResponse {
  key: string;
  display: string;
  countTotal?: number;
  lastUsedAt?: string;
}

interface UseHashtagSuggestionsOptions {
  minQueryLength?: number;
  maxSuggestions?: number;
  debounceMs?: number;
  maxRetries?: number;
  retryDelayMs?: number;
  cacheMaxSize?: number;
}

interface UseHashtagSuggestionsReturn {
  suggestions: HashtagSuggestion[];
  loading: boolean;
  error: string | null;
  searchSuggestions: (query: string) => void;
  clearSuggestions: () => void;
  retry: () => void;
  hasCache: boolean;
  clearCache: () => void;
}

/**
 * Hook for hashtag suggestions with optimized API calls and caching
 * Implements STRICT120 protocol requirements for hashtag feature with enhanced operations support
 */
export function useHashtagSuggestions(
  options: UseHashtagSuggestionsOptions = {}
): UseHashtagSuggestionsReturn {
  const {
    minQueryLength = 1,
    maxSuggestions = 10,
    debounceMs = 300,
    maxRetries = 3,
    retryDelayMs = 1000,
    cacheMaxSize = 100,
  } = options;

  const [suggestions, setSuggestions] = useState<HashtagSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cache for suggestions to avoid repeated API calls
  const [cache, setCache] = useState<Map<string, HashtagSuggestion[]>>(new Map());

  // Track retry attempts and last query for retry functionality
  const retryCountRef = useRef(0);
  const lastQueryRef = useRef<string>('');
  const abortControllerRef = useRef<AbortController | null>(null);

  // Enhanced search with retry logic and abort support
  const searchSuggestions = useCallback(
    async (query: string, retryCount = 0) => {
      // Cancel previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      if (!query || query.length < minQueryLength) {
        setSuggestions([]);
        setError(null);
        return;
      }

      // Remove # prefix if present
      const cleanQuery = query.replace(/^#/, '');

      if (!cleanQuery) {
        setSuggestions([]);
        setError(null);
        return;
      }

      // Store for retry functionality
      lastQueryRef.current = cleanQuery;
      retryCountRef.current = retryCount;

      // Check cache first
      const cacheKey = cleanQuery.toLowerCase();
      if (cache.has(cacheKey)) {
        setSuggestions(cache.get(cacheKey) || []);
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);

      // Create new abort controller for this request
      abortControllerRef.current = new AbortController();

      try {
        const response = await fetch(
          `/api/tags/search?q=${encodeURIComponent(cleanQuery)}&limit=${maxSuggestions}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            signal: abortControllerRef.current.signal,
          }
        );

        if (!response.ok) {
          if (response.status === 429 && retryCount < maxRetries) {
            // Rate limited - wait and retry
            setTimeout(
              () => {
                searchSuggestions(query, retryCount + 1);
              },
              retryDelayMs * (retryCount + 1)
            );
            return;
          }
          throw new Error(`Search failed: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        if (!data.success || !Array.isArray(data.data)) {
          throw new Error('Invalid response format');
        }

        const results = data.data.map((tag: ApiTagResponse) => ({
          key: tag.key,
          display: tag.display,
          count: tag.countTotal || 0,
          lastUsedAt: tag.lastUsedAt || new Date().toISOString(),
        }));

        // Cache management with size limit
        setCache((prev) => {
          const newCache = new Map(prev);

          // Remove oldest entries if cache is full
          if (newCache.size >= cacheMaxSize) {
            const firstKey = newCache.keys().next().value;
            if (firstKey) newCache.delete(firstKey);
          }

          return newCache.set(cacheKey, results);
        });

        setSuggestions(results);
        retryCountRef.current = 0; // Reset retry count on success
      } catch (err) {
        // Don't show error if request was aborted
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }

        // Retry on network errors
        if (
          err instanceof Error &&
          err.message.includes('Failed to fetch') &&
          retryCount < maxRetries
        ) {
          setTimeout(
            () => {
              searchSuggestions(query, retryCount + 1);
            },
            retryDelayMs * (retryCount + 1)
          );
          return;
        }

        const errorMessage = err instanceof Error ? err.message : 'Failed to load suggestions';
        console.error('[Hashtag Suggestions] Error:', errorMessage, { retryCount, query });
        setError(errorMessage);
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    },
    [minQueryLength, maxSuggestions, cache, maxRetries, retryDelayMs, cacheMaxSize]
  );

  // Debounced version of search
  const debouncedSearch = useMemo(
    () => debounce(searchSuggestions, debounceMs),
    [searchSuggestions, debounceMs]
  );

  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
    setError(null);
    setLoading(false);
    retryCountRef.current = 0;
    lastQueryRef.current = '';

    // Cancel any pending requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  // Retry last failed request
  const retry = useCallback(() => {
    if (lastQueryRef.current) {
      searchSuggestions(lastQueryRef.current, 0);
    }
  }, [searchSuggestions]);

  // Cache management functions
  const clearCache = useCallback(() => {
    setCache(new Map());
  }, []);

  const hasCache = cache.size > 0;

  // Enhanced cleanup on unmount
  useEffect(() => {
    return () => {
      debouncedSearch.cancel();

      // Cancel any pending requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [debouncedSearch]);

  return {
    suggestions,
    loading,
    error,
    searchSuggestions: debouncedSearch,
    clearSuggestions,
    retry,
    hasCache,
    clearCache,
  };
}
