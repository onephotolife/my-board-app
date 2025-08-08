'use client';

import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { SessionProvider } from "next-auth/react";
import { useState, useEffect } from 'react';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
  },
});

export function ClientProviders({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <SessionProvider>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <div style={{ opacity: mounted ? 1 : 0.99 }}>
          {children}
        </div>
      </ThemeProvider>
    </SessionProvider>
  );
}