'use client';

import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { SessionProvider } from 'next-auth/react';

import { UserProvider } from '@/contexts/UserContext';
import { PermissionProvider } from '@/contexts/PermissionContext';
import { CSRFProvider } from '@/components/CSRFProvider';
import { SocketProvider } from '@/lib/socket/client';
import { SNSProvider } from '@/contexts/SNSContext.v2';
import { QueryProvider } from '@/contexts/QueryProvider';
import theme from '@/styles/theme';

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

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider refetchInterval={5 * 60} refetchOnWindowFocus={true}>
      <UserProvider>
        <PermissionProvider>
          <CSRFProvider>
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
    </SessionProvider>
  );
}