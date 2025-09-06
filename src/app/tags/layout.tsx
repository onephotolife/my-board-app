import type { ReactNode } from 'react';

import EnhancedAppLayout from '@/components/EnhancedAppLayout';

export default function TagsLayout({ children }: { children: ReactNode }) {
  return (
    <EnhancedAppLayout title="タグ" subtitle="ハッシュタグの一覧と詳細">
      <div id="tag-page-root">
        {process.env.NEXT_PUBLIC_TAG_DEBUG === 'true' && (
          <div
            data-testid="tag-layout-ssr"
            style={{
              padding: '6px 10px',
              margin: '6px 0',
              border: '1px dashed #b39ddb',
              background: '#ede7f6',
              color: '#4527a0',
              fontSize: 12,
            }}
          >
            TAGS LAYOUT RENDERED (SSR)
          </div>
        )}
        {children}
      </div>
    </EnhancedAppLayout>
  );
}
