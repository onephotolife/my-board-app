'use client';

import { SessionProvider } from "next-auth/react";

export function NoMuiProviders({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      {children}
    </SessionProvider>
  );
}