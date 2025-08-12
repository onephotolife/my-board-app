'use client';

import { createTheme, ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { SessionProvider } from 'next-auth/react';
import { UserProvider } from '@/contexts/UserContext';

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
    appBar: 1200,
    drawer: 2147483647, // JavaScript最大安全整数に近い値
    modal: 2147483645,
    snackbar: 1400,
    tooltip: 1500,
  },
  components: {
    MuiDrawer: {
      styleOverrides: {
        root: {
          position: 'fixed',
          zIndex: 2147483647,
        },
        paper: {
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100vw',
          height: '100vh',
          maxWidth: '100vw',
          maxHeight: '100vh',
          zIndex: 2147483647,
        },
      },
    },
    MuiBackdrop: {
      styleOverrides: {
        root: {
          position: 'fixed',
          zIndex: 2147483646,
        },
      },
    },
    MuiModal: {
      defaultProps: {
        disablePortal: false,
      },
    },
  },
});

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider refetchInterval={5 * 60} refetchOnWindowFocus={true}>
      <UserProvider>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          {children}
        </ThemeProvider>
      </UserProvider>
    </SessionProvider>
  );
}