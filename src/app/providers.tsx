'use client';

import { createTheme, ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { SessionProvider } from 'next-auth/react';

import { UserProvider } from '@/contexts/UserContext';
import { PermissionProvider } from '@/contexts/PermissionContext';
import { CSRFProvider } from '@/components/CSRFProvider';
import { SocketProvider } from '@/lib/socket/client';

// CSP準拠のテーマ設定
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
  zIndex: {
    mobileStepper: 1000,
    fab: 1050,
    speedDial: 1050,
    appBar: 1100,
    drawer: 1200,
    modal: 9999,
    snackbar: 10000,
    tooltip: 10001,
  },
  components: {
    MuiDialog: {
      defaultProps: {
        disablePortal: false,
      },
      styleOverrides: {
        root: {
          zIndex: '99999 !important',
          '& .MuiBackdrop-root': {
            zIndex: '99998 !important',
            position: 'fixed !important',
          },
          '& .MuiDialog-container': {
            zIndex: '99999 !important',
            position: 'fixed !important',
            '& .MuiPaper-root': {
              zIndex: '99999 !important',
              position: 'fixed !important',
            },
          },
        },
      },
    },
    MuiBackdrop: {
      styleOverrides: {
        root: {
          position: 'fixed !important',
          zIndex: '99998 !important',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
        },
      },
    },
    MuiModal: {
      styleOverrides: {
        root: {
          zIndex: '99999 !important',
        },
      },
    },
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          '& .MuiDialog-root': {
            zIndex: '99999 !important',
          },
          '& .MuiBackdrop-root': {
            zIndex: '99998 !important',
          },
        },
      },
    },
  },
});

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
              <ThemeProvider theme={theme}>
                <CssBaseline />
                {children}
              </ThemeProvider>
            </ConditionalSocketProvider>
          </CSRFProvider>
        </PermissionProvider>
      </UserProvider>
    </SessionProvider>
  );
}