'use client';

import { useSession, signIn, signOut } from 'next-auth/react';
import { useState, useEffect } from 'react';

export default function PureHeader() {
  const [mounted, setMounted] = useState(false);
  const { data: session, status } = useSession();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSignIn = () => {
    signIn();
  };

  const handleSignOut = () => {
    signOut();
  };

  const headerStyle: React.CSSProperties = {
    height: '64px',
    backgroundColor: '#1976d2',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 24px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '20px',
    fontWeight: 500,
    margin: 0,
  };

  const buttonStyle: React.CSSProperties = {
    backgroundColor: 'transparent',
    color: 'white',
    border: '1px solid rgba(255,255,255,0.5)',
    borderRadius: '4px',
    padding: '6px 16px',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  };

  const userInfoStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  };

  if (!mounted) {
    return (
      <header style={headerStyle}>
        <h1 style={titleStyle}>会員制掲示板</h1>
        <div />
      </header>
    );
  }

  return (
    <header style={headerStyle}>
      <h1 style={titleStyle}>会員制掲示板</h1>
      <div style={userInfoStyle}>
        {status === 'loading' ? (
          <span>読み込み中...</span>
        ) : session ? (
          <>
            <span>{session.user?.name || session.user?.email}</span>
          </>
        ) : (
          <button 
            style={buttonStyle}
            onClick={handleSignIn}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            ログイン
          </button>
        )}
      </div>
    </header>
  );
}