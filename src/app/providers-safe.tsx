'use client';

import { ThemeProvider, createTheme, StyledEngineProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { SessionProvider } from "next-auth/react";
import { useMemo } from 'react';

export function SafeProviders({ children }: { children: React.ReactNode }) {
  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: 'light',
          primary: {
            main: '#1976d2',
          },
        },
      }),
    []
  );

  return (
    <SessionProvider>
      <StyledEngineProvider injectFirst>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          {children}
        </ThemeProvider>
      </StyledEngineProvider>
    </SessionProvider>
  );
}