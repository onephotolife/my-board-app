'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
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

// デバッグログ機能
const DEBUG = process.env.NODE_ENV === 'development';

interface ProviderMetrics {
  initStart: number;
  initEnd?: number;
  apiCalls: number;
  errors: string[];
}

// Provider Composer: 全Providerを単一階層で管理
export function ProviderComposer({ children }: { children: React.ReactNode }) {
  const [metrics] = useState<Record<string, ProviderMetrics>>(() => ({
    session: { initStart: Date.now(), apiCalls: 0, errors: [] },
    data: { initStart: 0, apiCalls: 0, errors: [] },
    user: { initStart: 0, apiCalls: 0, errors: [] },
    permission: { initStart: 0, apiCalls: 0, errors: [] },
    csrf: { initStart: 0, apiCalls: 0, errors: [] },
    socket: { initStart: 0, apiCalls: 0, errors: [] },
    sns: { initStart: 0, apiCalls: 0, errors: [] },
    query: { initStart: 0, apiCalls: 0, errors: [] },
    theme: { initStart: 0, apiCalls: 0, errors: [] }
  }));

  // デバッグログ出力
  const logMetric = useCallback((provider: string, event: string, data?: any) => {
    if (!DEBUG) return;
    
    const metric = metrics[provider];
    if (!metric) return;

    if (event === 'start') {
      metric.initStart = Date.now();
      console.log(`[PROVIDER-COMPOSER] ${provider} initialization started`);
    } else if (event === 'end') {
      metric.initEnd = Date.now();
      const duration = metric.initEnd - metric.initStart;
      console.log(`[PROVIDER-COMPOSER] ${provider} initialized in ${duration}ms`);
    } else if (event === 'api') {
      metric.apiCalls++;
      console.log(`[PROVIDER-COMPOSER] ${provider} API call #${metric.apiCalls}`, data);
    } else if (event === 'error') {
      metric.errors.push(data);
      console.error(`[PROVIDER-COMPOSER] ${provider} error:`, data);
    }
  }, [metrics]);

  // 各Providerの設定を定義
  const providers = useMemo(() => {
    const isSocketEnabled = process.env.NEXT_PUBLIC_ENABLE_SOCKET !== 'false';
    
    return [
      // 独立Provider（並列初期化可能）
      {
        name: 'query',
        Component: QueryProvider,
        props: {},
        independent: true
      },
      {
        name: 'theme',
        Component: ThemeProvider,
        props: { theme },
        independent: true,
        extraChildren: <CssBaseline />
      },
      // Session依存Provider
      {
        name: 'session',
        Component: SessionProvider,
        props: { refetchInterval: 5 * 60, refetchOnWindowFocus: true },
        independent: true
      },
      // データ依存Provider（SessionProviderの後に初期化）
      {
        name: 'user',
        Component: UserProvider,
        props: {},
        needsData: true
      },
      {
        name: 'permission',
        Component: PermissionProvider,
        props: {},
        needsData: true
      },
      {
        name: 'csrf',
        Component: CSRFProvider,
        props: {},
        needsData: true
      },
      {
        name: 'sns',
        Component: SNSProvider,
        props: {},
        needsData: true
      },
      // 条件付きProvider
      ...(isSocketEnabled ? [{
        name: 'socket',
        Component: SocketProvider,
        props: {},
        needsData: true
      }] : [])
    ];
  }, []);

  // Providerをコンポーズ
  const composedProviders = useMemo(() => {
    return providers.reduceRight((acc, provider) => {
      logMetric(provider.name, 'start');
      
      const ProviderComponent = provider.Component;
      const element = (
        <ProviderComponent {...provider.props} key={provider.name}>
          {provider.extraChildren}
          {acc}
        </ProviderComponent>
      );
      
      logMetric(provider.name, 'end');
      return element;
    }, children as React.ReactElement);
  }, [providers, children, logMetric]);

  return composedProviders;
}

// データフェッチを統合した新しいProvidersコンポーネント
export function ProvidersWithComposer({ children }: { children: React.ReactNode }) {
  const [initialData, setInitialData] = useState<InitialData | null>(null);
  const [isReady, setIsReady] = useState(false);

  // 初期データの並列フェッチ（SessionProvider内で実行）
  const DataFetcher = () => {
    const { data: session, status } = useSession();
    
    useEffect(() => {
      if (session && !initialData) {
        console.log('[PROVIDER-COMPOSER] Starting parallel data fetch');
        const startTime = Date.now();
        
        fetchInitialDataClient().then((data) => {
          const fetchTime = Date.now() - startTime;
          
          if (data) {
            console.log('[PROVIDER-COMPOSER] Initial data fetched:', {
              fetchTime: `${fetchTime}ms`,
              hasUserProfile: !!data.userProfile,
              hasPermissions: !!data.permissions,
              hasCSRFToken: !!data.csrfToken
            });
            
            // 各Providerに渡すデータを設定
            setInitialData({
              ...data,
              fetchTime
            });
          }
          setIsReady(true);
        }).catch((error) => {
          console.error('[PROVIDER-COMPOSER] Data fetch error:', error);
          setIsReady(true);
        });
      } else if (!session && status !== 'loading') {
        setIsReady(true);
      }
    }, [session, status]);

    return null;
  };

  return (
    <SessionProvider refetchInterval={5 * 60} refetchOnWindowFocus={true}>
      <DataFetcher />
      {isReady && (
        <UserProvider initialData={initialData?.userProfile}>
          <PermissionProvider initialData={initialData?.permissions}>
            <CSRFProvider initialToken={initialData?.csrfToken}>
              <QueryProvider>
                <SNSProvider>
                  <ThemeProvider theme={theme}>
                    <CssBaseline />
                    {process.env.NEXT_PUBLIC_ENABLE_SOCKET !== 'false' && (
                      <SocketProvider>{children}</SocketProvider>
                    )}
                    {process.env.NEXT_PUBLIC_ENABLE_SOCKET === 'false' && children}
                  </ThemeProvider>
                </SNSProvider>
              </QueryProvider>
            </CSRFProvider>
          </PermissionProvider>
        </UserProvider>
      )}
    </SessionProvider>
  );
}