'use client';

import { useState, useEffect } from 'react';
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

// 🔒 41人天才会議による修正: Socket.ioを条件付きで有効化
function ConditionalSocketProvider({ children }: { children: React.ReactNode }) {
  const isSocketEnabled = process.env.NEXT_PUBLIC_ENABLE_SOCKET !== 'false';
  
  if (isSocketEnabled) {
    return <SocketProvider>{children}</SocketProvider>;
  }
  
  return <>{children}</>;
}

// 内部コンポーネント: セッション情報を使用して初期データをフェッチ
function ProvidersWithData({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const [initialData, setInitialData] = useState<InitialData | null>(null);
  const [dataFetched, setDataFetched] = useState(false);

  useEffect(() => {
    // セッションがある場合、初期データを並列フェッチ
    if (session && !dataFetched) {
      console.warn('[PERF] Starting parallel initial data fetch');
      fetchInitialDataClient().then((data) => {
        if (data) {
          console.warn('[PERF] Initial data fetched successfully:', {
            fetchTime: data.fetchTime ? `${data.fetchTime.toFixed(2)}ms` : 'N/A'
          });
          setInitialData(data);
        }
        setDataFetched(true);
      });
    } else if (!session && status !== 'loading') {
      // セッションがない場合はデータフェッチをスキップ
      setDataFetched(true);
    }
  }, [session, status, dataFetched]);

  // デバッグログ
  if (initialData && process.env.NODE_ENV === 'development') {
    console.warn('[PERF] ProvidersWithData using initial data:', {
      hasUserProfile: !!initialData.userProfile,
      hasPermissions: !!initialData.permissions,
      hasCSRFToken: !!initialData.csrfToken,
      fetchTime: initialData.fetchTime ? `${initialData.fetchTime.toFixed(2)}ms` : 'N/A'
    });
  }

  return (
    <UserProvider initialData={initialData?.userProfile}>
      <PermissionProvider initialData={initialData?.permissions}>
        <CSRFProvider initialToken={initialData?.csrfToken}>
          <ConditionalSocketProvider>
            <QueryProvider>
              <SNSProvider>
                <ThemeProvider theme={theme}>
                  <CssBaseline />
                  {children}
                </ThemeProvider>
              </SNSProvider>
            </QueryProvider>
          </ConditionalSocketProvider>
        </CSRFProvider>
      </PermissionProvider>
    </UserProvider>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider refetchInterval={5 * 60} refetchOnWindowFocus={true}>
      <ProvidersWithData>{children}</ProvidersWithData>
    </SessionProvider>
  );
}