import type { ReactNode } from 'react';

import AppLayout from '@/components/AppLayout';

export default function TagsLayout({ children }: { children: ReactNode }) {
  return <AppLayout title="会員制掲示板">{children}</AppLayout>;
}
