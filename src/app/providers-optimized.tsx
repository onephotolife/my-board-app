'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { SessionProvider, useSession } from 'next-auth/react';
import { UserProvider } from '@/contexts/UserContext';
import { PermissionProvider } from '@/contexts/PermissionContext';
import { CSRFProvider } from '@/components/CSRFProvider';
import { SocketProvider } from '@/lib/socket/client';
import { SNSProvider } from '@/contexts/SNSContext.v2';
import { QueryProvider } from '@/contexts/QueryProvider';
import theme from '@/styles/theme';
import { fetchInitialDataClient, type InitialData } from '@/lib/initial-data-fetcher';

// レスポンシブスタイルのインポート
import '@/styles/responsive.css';

// デバッグメトリクス収集
interface ProviderMetrics {
  mountCount: number;
  apiCalls: number;
  initTime: number;
  errors: string[];
}

// グローバルメトリクス（開発環境のみ）
const globalMetrics: Record<string, ProviderMetrics> = {};

if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).__PROVIDER_METRICS__ = globalMetrics;
}

// メトリクス収集フック
function useProviderMetrics(name: string) {
  const mountTimeRef = useRef<number>(Date.now());
  
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;
    
    if (!globalMetrics[name]) {
      globalMetrics[name] = {
        mountCount: 0,
        apiCalls: 0,
        initTime: 0,
        errors: []
      };
    }
    
    globalMetrics[name].mountCount++;
    const initTime = Date.now() - mountTimeRef.current;
    globalMetrics[name].initTime = initTime;
    
    console.log(`[METRICS] ${name} mounted (count: ${globalMetrics[name].mountCount}, time: ${initTime}ms)`);
    
    return () => {
      console.log(`[METRICS] ${name} unmounting`);
    };
  }, [name]);
  
  return globalMetrics[name];
}

// 最適化された統合Providerコンポーネント
function OptimizedProviders({ children }: { children: React.ReactNode }) {
  const [initialData, setInitialData] = useState<InitialData | null>(null);
  const [isDataReady, setIsDataReady] = useState(false);
  const dataFetchRef = useRef(false);
  
  // メトリクス収集
  useProviderMetrics('OptimizedProviders');
  
  // セッション状態の取得
  const { data: session, status } = useSession();
  
  // 初期データの並列フェッチ（1回のみ実行）
  useEffect(() => {
    if (dataFetchRef.current) return;
    
    if (session && status === 'authenticated') {
      dataFetchRef.current = true;
      
      console.log('[OPTIMIZED] Starting unified data fetch');
      const startTime = Date.now();
      
      // 全データを並列フェッチ
      fetchInitialDataClient()
        .then((data) => {
          const fetchTime = Date.now() - startTime;
          
          if (data) {
            console.log('[OPTIMIZED] All data fetched in', fetchTime, 'ms:', {
              userProfile: !!data.userProfile,
              permissions: !!data.permissions,
              csrfToken: !!data.csrfToken
            });
            
            setInitialData({
              ...data,
              fetchTime
            });
          }
          setIsDataReady(true);
        })
        .catch((error) => {
          console.error('[OPTIMIZED] Data fetch error:', error);
          if (globalMetrics['OptimizedProviders']) {
            globalMetrics['OptimizedProviders'].errors.push(error.message);
          }
          setIsDataReady(true);
        });
    } else if (status === 'unauthenticated') {
      setIsDataReady(true);
    }
  }, [session, status]);
  
  // Socket.ioの条件付き有効化
  const isSocketEnabled = process.env.NEXT_PUBLIC_ENABLE_SOCKET !== 'false';
  
  // メモ化されたProviderツリー
  const providerTree = useMemo(() => {
    if (!isDataReady && session) {
      return <div>Loading providers...</div>;
    }
    
    // 並列実行可能なProvider群
    const independentProviders = (
      <>
        <QueryProvider>
          <ThemeProvider theme={theme}>
            <CssBaseline />
          </ThemeProvider>
        </QueryProvider>
      </>
    );
    
    // データ依存Provider群（フラット化）
    return (
      <>
        <UserProvider initialData={initialData?.userProfile}>
          <PermissionProvider initialData={initialData?.permissions}>
            <CSRFProvider initialToken={initialData?.csrfToken}>
              <SNSProvider>
                {isSocketEnabled ? (
                  <SocketProvider>
                    {independentProviders}
                    {children}
                  </SocketProvider>
                ) : (
                  <>
                    {independentProviders}
                    {children}
                  </>
                )}
              </SNSProvider>
            </CSRFProvider>
          </PermissionProvider>
        </UserProvider>
      </>
    );
  }, [children, initialData, isDataReady, session, isSocketEnabled]);
  
  return providerTree;
}

// エクスポート用のProvidersコンポーネント
export function Providers({ children }: { children: React.ReactNode }) {
  useProviderMetrics('RootProviders');
  
  // パフォーマンス測定
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      const startTime = performance.now();
      
      return () => {
        const endTime = performance.now();
        console.log('[PERFORMANCE] Total Provider initialization time:', (endTime - startTime).toFixed(2), 'ms');
        
        // メトリクスサマリー出力
        console.log('[METRICS SUMMARY]', globalMetrics);
      };
    }
  }, []);
  
  return (
    <SessionProvider refetchInterval={5 * 60} refetchOnWindowFocus={true}>
      <OptimizedProviders>{children}</OptimizedProviders>
    </SessionProvider>
  );
}