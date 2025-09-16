'use client';

import * as React from 'react';
import { Box, CircularProgress, IconButton, InputAdornment, TextField } from '@mui/material';
import ClearIcon from '@mui/icons-material/Clear';
import SearchIcon from '@mui/icons-material/Search';

import { UsersApi } from '@/lib/api/client/users';
import type { ApiError, SuggestItem, SuggestResponse } from '@/types/api/users';
import { SuggestList } from '@/components/search/SuggestList';
import { debounce } from '@/lib/ui/debounce';
import { isComposingEvent } from '@/lib/ui/ime';
import { Lru } from '@/lib/ui/cache/lru';
import { mark, measure, report } from '@/lib/ux/metrics';

const cache = new Lru<string, SuggestItem[]>(100);

const isApiError = (value: SuggestResponse | ApiError): value is ApiError => value.ok === false;

type Props = {
  value: string;
  onChange: (query: string) => void;
  onSubmit: (query: string) => void;
  inputId?: string;
};

export function UserSearchBar({ value, onChange, onSubmit, inputId = 'user-search' }: Props) {
  const [loading, setLoading] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const [items, setItems] = React.useState<SuggestItem[]>([]);
  const [highlighted, setHighlighted] = React.useState(-1);
  const [anchorWidth, setAnchorWidth] = React.useState<number>();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const latestQueryRef = React.useRef(value);
  const listboxId = `${inputId}-listbox`;

  React.useEffect(() => {
    latestQueryRef.current = value;
  }, [value]);

  React.useEffect(() => {
    if (inputRef.current) {
      setAnchorWidth(inputRef.current.getBoundingClientRect().width);
    }
  }, []);

  const fetchSuggest = React.useMemo(
    () =>
      debounce(async (raw: string) => {
        const query = raw.trim();
        if (!query) {
          setItems([]);
          setOpen(false);
          setLoading(false);
          return;
        }

        const cachedItems = cache.get(query);
        if (cachedItems) {
          setItems(cachedItems);
          setOpen(true);
          setLoading(false);
          return;
        }

        setLoading(true);
        mark('suggest:fetch');
        try {
          const response = await UsersApi.suggest(query);
          const duration = measure('suggest:fetch');
          const itemCount = isApiError(response) ? 0 : (response.items?.length ?? 0);
          if (duration != null) {
            report({
              metric: 'suggest:fetch',
              ms: Math.round(duration),
              length: query.length,
              items: itemCount,
            });
          }

          if (latestQueryRef.current.trim() !== query) {
            return;
          }

          if (isApiError(response)) {
            setItems([]);
            setOpen(false);
            return;
          }

          cache.set(query, response.items ?? []);
          setItems(response.items ?? []);
          setOpen(true);
          setHighlighted(-1);
        } finally {
          setLoading(false);
        }
      }, 120),
    []
  );

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const next = event.target.value;
    latestQueryRef.current = next;
    onChange(next);
    if (isComposingEvent(event)) {
      return;
    }
    setHighlighted(-1);
    void fetchSuggest(next);
  };

  const handleSubmit = (query: string) => {
    if (!query.trim()) {
      return;
    }
    const normalized = query.trim();
    latestQueryRef.current = normalized;
    onSubmit(normalized);
    setOpen(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (isComposingEvent(event)) {
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlighted((prev) => Math.min(prev + 1, items.length - 1));
      setOpen(true);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlighted((prev) => Math.max(prev - 1, 0));
      setOpen(true);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (highlighted >= 0 && items[highlighted]) {
        handleSubmit(items[highlighted].displayName);
      } else {
        handleSubmit(value);
      }
    } else if (event.key === 'Escape') {
      setOpen(false);
    } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      inputRef.current?.focus();
      setOpen(true);
    }
  };

  const handleSelect = (index: number) => {
    const item = items[index];
    if (!item) {
      return;
    }
    onChange(item.displayName);
    latestQueryRef.current = item.displayName;
    handleSubmit(item.displayName);
  };

  const hasValue = value.length > 0;

  return (
    <Box sx={{ position: 'relative' }}>
      <TextField
        fullWidth
        inputRef={inputRef}
        id={inputId}
        label="ユーザーを検索"
        variant="outlined"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (items.length > 0) {
            setOpen(true);
          }
        }}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        aria-autocomplete="list"
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon aria-hidden="true" />
            </InputAdornment>
          ),
          endAdornment: (
            <InputAdornment position="end">
              {loading ? (
                <CircularProgress size={18} />
              ) : (
                <IconButton
                  aria-label="クリア"
                  size="small"
                  onClick={() => {
                    onChange('');
                    setItems([]);
                    setOpen(false);
                    setHighlighted(-1);
                    inputRef.current?.focus();
                  }}
                  disabled={!hasValue}
                >
                  <ClearIcon fontSize="small" />
                </IconButton>
              )}
            </InputAdornment>
          ),
        }}
      />
      {open && (
        <SuggestList
          id={listboxId}
          items={items}
          highlighted={highlighted}
          onHover={setHighlighted}
          onSelect={handleSelect}
          onClose={() => setOpen(false)}
          anchorWidth={anchorWidth}
        />
      )}
    </Box>
  );
}
