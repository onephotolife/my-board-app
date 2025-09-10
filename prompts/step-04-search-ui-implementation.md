# STEP 04 — 検索UI `/search` の設計・実装（MUI v7）（Codex 実行用）

**目的:** ブラウザで検索体験を確認可能にする（IME抑制・リアルタイムサジェスト・履歴・おすすめ・結果）  
**完了条件:** `/search` が表示され、要件を満たす操作が可能

---

## 実行指示

### 1) フックの追加

**ファイル:** `src/hooks/useDebouncedValue.ts`

```ts
'use client';
import { useEffect, useState } from 'react';
export function useDebouncedValue<T>(value: T, delay = 150) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}
```

**ファイル:** `src/hooks/useAbortableFetch.ts`

```ts
'use client';
import { useEffect, useRef, useState } from 'react';
export function useAbortableFetch<T>(url: string | null, deps: any[] = []) {
  const ctrl = useRef<AbortController | null>(null);
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  useEffect(() => {
    if (!url) {
      setData(null);
      return;
    }
    ctrl.current?.abort();
    const c = new AbortController();
    ctrl.current = c;
    setLoading(true);
    setError(null);
    fetch(url, { signal: c.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(setData)
      .catch((e) => {
        if (e.name !== 'AbortError') setError(e as Error);
      })
      .finally(() => setLoading(false));
    return () => c.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return { data, loading, error };
}
```

### 2) コンポーネントの追加

**ファイル:** `src/components/search/SearchBar.tsx`

```tsx
'use client';
import { useEffect, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Popper from '@mui/material/Popper';
import Paper from '@mui/material/Paper';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import CircularProgress from '@mui/material/CircularProgress';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useRouter, useSearchParams } from 'next/navigation';

type SuggestItem = { type: 'user'; userId: string; name: string; highlight?: { prefix: string } };

function highlightPrefix(name: string, prefix: string): JSX.Element {
  if (!prefix) return <>{name}</>;
  const i = name.indexOf(prefix);
  if (i < 0) return <>{name}</>;
  return (
    <>
      {name.slice(0, i)}
      <strong>{name.slice(i, i + prefix.length)}</strong>
      {name.slice(i + prefix.length)}
    </>
  );
}

export default function SearchBar() {
  const router = useRouter();
  const params = useSearchParams();
  const defaultQ = params.get('q') ?? '';
  const [value, setValue] = useState(defaultQ);
  const [isComposing, setIsComposing] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<number>(-1);
  const anchorRef = useRef<HTMLInputElement | null>(null);

  const debounced = useDebouncedValue(value, 150);
  const [items, setItems] = useState<SuggestItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isComposing || debounced.trim().length === 0) {
      setItems([]);
      setOpen(false);
      return;
    }
    let aborted = false;
    const ctrl = new AbortController();
    setLoading(true);
    fetch(`/api/suggest?q=${encodeURIComponent(debounced)}&limit=10`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((d) => {
        if (!aborted) {
          setItems(d.items ?? []);
          setOpen(true);
          setActive(-1);
        }
      })
      .catch((e) => {
        if (e.name !== 'AbortError') console.error(e);
      })
      .finally(() => setLoading(false));
    return () => {
      aborted = true;
      ctrl.abort();
    };
  }, [debounced, isComposing]);

  function submitSearch(q: string) {
    const url = `/search?q=${encodeURIComponent(q)}`;
    router.push(url);
    setOpen(false);
  }

  return (
    <Box sx={{ position: 'relative' }}>
      <TextField
        inputRef={anchorRef}
        data-testid="search-input"
        fullWidth
        label="ユーザー検索"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onFocus={() => {
          if (items.length > 0) setOpen(true);
        }}
        onKeyDown={(e) => {
          if (!open) return;
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActive((a) => Math.min(a + 1, items.length - 1));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
          } else if (e.key === 'Enter') {
            e.preventDefault();
            if (active >= 0 && active < items.length) submitSearch(items[active].name);
            else submitSearch(value);
          } else if (e.key === 'Escape') {
            setOpen(false);
          }
        }}
        onCompositionStart={() => setIsComposing(true)}
        onCompositionEnd={() => setIsComposing(false)}
        placeholder="例: 田中 / たなか / タナカ"
      />
      <Popper
        open={open}
        anchorEl={anchorRef.current}
        placement="bottom-start"
        style={{ zIndex: 1300 }}
      >
        <Paper sx={{ width: anchorRef.current?.offsetWidth, maxHeight: 360, overflow: 'auto' }}>
          {loading && (
            <Box sx={{ p: 2, display: 'flex', justifyContent: 'center' }}>
              <CircularProgress size={20} />
            </Box>
          )}
          <List data-testid="suggest-list" dense>
            {items.map((it, idx) => (
              <ListItemButton
                key={it.userId}
                selected={idx === active}
                onClick={() => submitSearch(it.name)}
              >
                <ListItemText
                  primary={highlightPrefix(it.name, it.highlight?.prefix ?? '')}
                  secondary="ユーザー"
                />
              </ListItemButton>
            ))}
            {!loading && items.length === 0 && (
              <Box sx={{ p: 2, color: 'text.secondary' }}>候補がありません</Box>
            )}
          </List>
        </Paper>
      </Popper>
    </Box>
  );
}
```

**ファイル:** `src/components/search/ResultList.tsx`

```tsx
'use client';
import Grid2 from '@mui/material/Unstable_Grid2';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';

type Result = { userId: string; name: string; bio?: string };

export default function ResultList({ results }: { results: Result[] }) {
  if (!results?.length) return <Typography>該当するユーザーが見つかりませんでした</Typography>;
  return (
    <Grid2 container spacing={2} data-testid="result-list">
      {results.map((r) => (
        <Grid2 key={r.userId} xs={12} md={6}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6">{r.name}</Typography>
              {r.bio && (
                <Typography variant="body2" color="text.secondary">
                  {r.bio}
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid2>
      ))}
    </Grid2>
  );
}
```

**ファイル:** `src/components/search/HistoryChips.tsx`

```tsx
'use client';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';

export default function HistoryChips({
  items,
  onClick,
  onDelete,
}: {
  items: string[];
  onClick: (q: string) => void;
  onDelete: (q: string) => void;
}) {
  if (!items?.length) return null;
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }} data-testid="history-chips">
      {items.map((q) => (
        <Chip key={q} label={q} onClick={() => onClick(q)} onDelete={() => onDelete(q)} />
      ))}
    </Box>
  );
}
```

**ファイル:** `src/components/search/RecommendationsGrid.tsx`

```tsx
'use client';
import Grid2 from '@mui/material/Unstable_Grid2';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';

type Rec = { userId: string; name: string; reason: 'popular' | 'recent' | 'mutual' };

export default function RecommendationsGrid({ items }: { items: Rec[] }) {
  if (!items?.length) return null;
  return (
    <Grid2 container spacing={2} data-testid="reco-grid">
      {items.map((r) => (
        <Grid2 key={r.userId} xs={12} sm={6} md={4}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle1">{r.name}</Typography>
              <Typography variant="caption" color="text.secondary">
                {r.reason}
              </Typography>
            </CardContent>
          </Card>
        </Grid2>
      ))}
    </Grid2>
  );
}
```

### 3) `/search` ページ

**ファイル:** `src/app/search/page.tsx`

```tsx
'use client';
import { useEffect, useState } from 'react';
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import SearchBar from '@/components/search/SearchBar';
import ResultList from '@/components/search/ResultList';
import HistoryChips from '@/components/search/HistoryChips';
import RecommendationsGrid from '@/components/search/RecommendationsGrid';
import { useSearchParams, useRouter } from 'next/navigation';

type SearchRes = { results: { userId: string; name: string; bio?: string }[] };
type RecoRes = {
  items: { userId: string; name: string; reason: 'popular' | 'recent' | 'mutual' }[];
};

export default function SearchPage() {
  const params = useSearchParams();
  const router = useRouter();
  const q = params.get('q') ?? '';
  const [results, setResults] = useState<SearchRes['results']>([]);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [reco, setReco] = useState<RecoRes['items']>([]);

  // 初期: 履歴 + おすすめ
  useEffect(() => {
    if (q) return;
    (async () => {
      try {
        const [h, r] = await Promise.all([
          fetch('/api/history?limit=10').then((r) => (r.ok ? r.json() : { items: [] })),
          fetch('/api/recommendations?limit=9').then((r) => (r.ok ? r.json() : { items: [] })),
        ]);
        setHistory((h.items ?? []).map((x: any) => x.query_raw ?? x.query ?? '').filter(Boolean));
        setReco(r.items ?? []);
      } catch (e) {
        console.error(e);
      }
    })();
  }, [q]);

  // 検索
  useEffect(() => {
    if (!q) {
      setResults([]);
      return;
    }
    const ctrl = new AbortController();
    setLoading(true);
    fetch(`/api/search?q=${encodeURIComponent(q)}&limit=20`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((d: SearchRes) => setResults(d.results ?? []))
      .catch((e) => {
        if (e.name !== 'AbortError') console.error(e);
      })
      .finally(() => setLoading(false));
    return () => ctrl.abort();
  }, [q]);

  return (
    <Container sx={{ py: 4 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>
        ユーザー検索
      </Typography>
      <SearchBar />
      {!q && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>
            最近の検索
          </Typography>
          <HistoryChips
            items={history}
            onClick={(v) => router.push(`/search?q=${encodeURIComponent(v)}`)}
            onDelete={async (v) => {
              await fetch(`/api/history?query=${encodeURIComponent(v)}`, { method: 'DELETE' });
              setHistory((h) => h.filter((x) => x !== v));
            }}
          />
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>
              あなたへのおすすめ
            </Typography>
            <RecommendationsGrid items={reco} />
          </Box>
        </Box>
      )}
      {q && (
        <Box sx={{ mt: 3 }}>
          {loading ? <Typography>検索中...</Typography> : <ResultList results={results} />}
        </Box>
      )}
    </Container>
  );
}
```

### 4) コミット

```bash
git add -A
git commit -m "feat(ui/search): implement /search with MUI v7 (IME suppression, suggestions, history, recommendations)"
```

---

## 確認項目

- `/search` にアクセス → IME 中はサジェストが出ない → 確定後に候補表示
- 空入力では「最近の検索」「あなたへのおすすめ」が表示される（要 API 実装/認証）
