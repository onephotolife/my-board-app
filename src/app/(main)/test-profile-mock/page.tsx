'use client';

import React from 'react';
import { SessionProvider } from 'next-auth/react';
import { UserProvider } from '@/contexts/UserContext';
import dynamic from 'next/dynamic';

// ProfilePageを動的インポート
const ProfilePage = dynamic(
  () => import('../profile/page'),
  { 
    ssr: false,
    loading: () => <div>Loading Profile...</div>
  }
);

// モックセッション
const mockSession = {
  user: {
    id: 'test-id',
    email: 'test@example.com',
    name: 'Test User',
  },
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
};

export default function TestProfileMockPage() {
  return (
    <SessionProvider session={mockSession}>
      <UserProvider>
        <ProfilePage />
      </UserProvider>
    </SessionProvider>
  );
}