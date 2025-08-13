'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

// UserProviderとProfilePageを動的インポート
const ProfileContent = dynamic(
  () => import('../profile/page'),
  { ssr: false }
);

export default function TestProfileDialogPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // セッションをモック
    if (typeof window !== 'undefined') {
      // @ts-ignore
      window.__NEXT_AUTH_MOCK__ = {
        user: {
          id: '1',
          email: 'test@example.com',
          name: 'Test User',
        },
        status: 'authenticated',
      };
    }
  }, []);

  if (!mounted) {
    return <div>Loading...</div>;
  }

  return <ProfileContent />;
}