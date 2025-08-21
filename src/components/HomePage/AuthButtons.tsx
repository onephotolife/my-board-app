'use client';

import Link from 'next/link';
import { useState } from 'react';

import { modern2025Styles } from '@/styles/modern-2025';

export default function AuthButtons() {
  const [primaryButtonHovered, setPrimaryButtonHovered] = useState(false);
  const [secondaryButtonHovered, setSecondaryButtonHovered] = useState(false);
  
  const buttonContainerStyle: React.CSSProperties = {
    display: 'flex',
    gap: '20px',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginBottom: '60px',
  };
  
  return (
    <div style={buttonContainerStyle}>
      <Link
        href="/auth/signin"
        style={{
          ...modern2025Styles.button.primary,
          ...(primaryButtonHovered ? modern2025Styles.button.primaryHover : {}),
          minWidth: '160px',
          textDecoration: 'none',
          display: 'inline-block',
        }}
        onMouseEnter={() => setPrimaryButtonHovered(true)}
        onMouseLeave={() => setPrimaryButtonHovered(false)}
      >
        ログイン
      </Link>
      <Link
        href="/auth/signup"
        style={{
          ...modern2025Styles.button.secondary,
          ...(secondaryButtonHovered ? modern2025Styles.button.secondaryHover : {}),
          minWidth: '160px',
          textDecoration: 'none',
          display: 'inline-block',
        }}
        onMouseEnter={() => setSecondaryButtonHovered(true)}
        onMouseLeave={() => setSecondaryButtonHovered(false)}
      >
        新規登録
      </Link>
    </div>
  );
}