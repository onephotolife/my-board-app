'use client';

import ModernHeader from '@/components/ModernHeader';

export default function BoardLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <ModernHeader />
      {children}
    </>
  );
}