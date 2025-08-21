'use client';

import Link from 'next/link';

import { modern2025Styles } from '@/styles/modern-2025';

export default function PasswordResetLink() {
  return (
    <div style={{ textAlign: 'center', marginTop: '20px' }}>
      <Link
        href="/auth/reset-password"
        style={{
          color: modern2025Styles.colors.primary,
          textDecoration: 'none',
          fontSize: '14px',
          fontWeight: '500',
          transition: 'opacity 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.opacity = '0.8';
          e.currentTarget.style.textDecoration = 'underline';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.opacity = '1';
          e.currentTarget.style.textDecoration = 'none';
        }}
      >
        パスワードを忘れた方はこちら
      </Link>
    </div>
  );
}