import type { ReactNode } from 'react';

import EnhancedAppLayout from '@/components/EnhancedAppLayout';

export default function TagsLayout({ children }: { children: ReactNode }) {
  return (
    <EnhancedAppLayout title="タグ" subtitle="ハッシュタグの一覧と詳細">
      {children}
    </EnhancedAppLayout>
  );
}
