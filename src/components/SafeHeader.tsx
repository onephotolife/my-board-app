'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

const DynamicHeader = dynamic(
  () => import('./ClientHeader'),
  { 
    ssr: false,
    loading: () => <div style={{ height: '64px', backgroundColor: '#1976d2' }} />
  }
);

export default function SafeHeader() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return <div style={{ height: '64px', backgroundColor: '#1976d2' }} />;
  }

  return <DynamicHeader />;
}