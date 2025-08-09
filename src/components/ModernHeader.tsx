'use client';

import { useSession, signIn, signOut } from 'next-auth/react';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function ModernHeader() {
  const [mounted, setMounted] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { data: session, status } = useSession();
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
    
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSignIn = () => signIn();
  const handleSignOut = () => {
    // 現在のURLを取得してログアウト後にリダイレクト
    const currentUrl = window.location.origin;
    signOut({ callbackUrl: currentUrl });
  };

  // スタイル定義
  const headerStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    height: '72px',
    backgroundColor: scrolled ? 'rgba(255, 255, 255, 0.95)' : 'rgba(255, 255, 255, 0.98)',
    backdropFilter: 'blur(20px)',
    borderBottom: scrolled ? '1px solid rgba(99, 102, 241, 0.1)' : '1px solid rgba(229, 231, 235, 0.8)',
    boxShadow: scrolled ? '0 4px 30px rgba(0, 0, 0, 0.08)' : '0 1px 3px rgba(0, 0, 0, 0.05)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 32px',
    zIndex: 1000,
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  };

  const containerStyle: React.CSSProperties = {
    width: '100%',
    maxWidth: '1400px',
    margin: '0 auto',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  };

  const logoContainerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    textDecoration: 'none',
    transition: 'transform 0.2s',
  };

  const logoIconStyle: React.CSSProperties = {
    width: '42px',
    height: '42px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    borderRadius: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
    color: 'white',
    fontWeight: 'bold',
    boxShadow: '0 4px 12px rgba(99, 102, 241, 0.25)',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  };

  const logoTextStyle: React.CSSProperties = {
    fontSize: '20px',
    fontWeight: '700',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    letterSpacing: '-0.02em',
  };

  const navStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '32px',
  };

  const navLinkStyle: React.CSSProperties = {
    fontSize: '15px',
    fontWeight: '500',
    color: pathname === '/' ? '#6366f1' : '#475569',
    textDecoration: 'none',
    position: 'relative',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    padding: '8px 12px',
    borderRadius: '8px',
  };

  const userInfoStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
  };

  const avatarStyle: React.CSSProperties = {
    width: '38px',
    height: '38px',
    borderRadius: '12px',
    background: 'linear-gradient(135deg, #ec4899 0%, #f59e0b 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontSize: '16px',
    fontWeight: '600',
    boxShadow: '0 3px 10px rgba(236, 72, 153, 0.25)',
    border: '2px solid rgba(255, 255, 255, 0.9)',
    transition: 'all 0.3s',
  };

  const userNameStyle: React.CSSProperties = {
    fontSize: '14px',
    fontWeight: '600',
    color: '#0f172a',
    maxWidth: '150px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  };

  const buttonStyle: React.CSSProperties = {
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: '600',
    color: 'white',
    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3), 0 1px 3px rgba(0, 0, 0, 0.08)',
  };

  const outlineButtonStyle: React.CSSProperties = {
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: '600',
    color: '#6366f1',
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderWidth: '2px',
    borderStyle: 'solid',
    borderColor: '#e5e7eb',
    borderRadius: '10px',
    cursor: 'pointer',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.05)',
  };

  const mobileMenuButtonStyle: React.CSSProperties = {
    display: 'none',
    width: '40px',
    height: '40px',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '4px',
  };

  const hamburgerLineStyle: React.CSSProperties = {
    width: '24px',
    height: '2px',
    backgroundColor: '#475569',
    borderRadius: '2px',
    transition: 'all 0.3s',
  };

  const getInitials = (name?: string | null) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (!mounted) {
    return (
      <header style={headerStyle}>
        <div style={containerStyle}>
          <div style={logoContainerStyle}>
            <div style={logoIconStyle}>掲</div>
            <div style={logoTextStyle}>会員制掲示板</div>
          </div>
        </div>
      </header>
    );
  }

  return (
    <>
      <style jsx global>{`
        @keyframes slideDown {
          from { transform: translateY(-100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        .header-link::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          width: 0;
          height: 2px;
          background: linear-gradient(90deg, #6366f1, #8b5cf6);
          transition: width 0.3s;
        }
        .header-link:hover::after {
          width: 100%;
        }
        .header-link:hover {
          background: rgba(99, 102, 241, 0.05);
        }
        .logo-hover:hover {
          transform: scale(1.05);
        }
        .button-hover:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.35);
        }
        .outline-button-hover:hover {
          background-color: #f8fafc;
          border-color: #6366f1;
        }
        @media (max-width: 768px) {
          .mobile-menu-button {
            display: flex !important;
          }
          .desktop-nav {
            display: none !important;
          }
          .mobile-menu {
            display: ${menuOpen ? 'flex' : 'none'};
            position: fixed;
            top: 72px;
            left: 0;
            right: 0;
            background: rgba(255, 255, 255, 0.98);
            backdrop-filter: blur(20px);
            padding: 20px;
            flex-direction: column;
            gap: 16px;
            border-bottom: 1px solid rgba(229, 231, 235, 0.8);
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
            animation: slideDown 0.3s ease-out;
          }
        }
      `}</style>

      <header style={headerStyle}>
        <div style={containerStyle}>
          <Link 
            href="/"
            style={logoContainerStyle}
            className="logo-hover"
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            <div 
              style={logoIconStyle}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'rotate(5deg) scale(1.1)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(99, 102, 241, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'rotate(0) scale(1)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(99, 102, 241, 0.25)';
              }}
            >
              <span style={{ fontSize: '24px', transition: 'transform 0.3s' }}>📋</span>
            </div>
            <div style={logoTextStyle}>会員制掲示板</div>
          </Link>

          <nav style={navStyle} className="desktop-nav">
            
            {session && (
              <Link 
                href="/board"
                style={{
                  ...navLinkStyle,
                  color: pathname === '/board' ? '#6366f1' : '#475569',
                }}
                className="header-link"
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#6366f1';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = pathname === '/board' ? '#6366f1' : '#475569';
                }}
              >
                掲示板
              </Link>
            )}

            {status === 'loading' ? (
              <div style={{ fontSize: '14px', color: '#94a3b8' }}>
                読み込み中...
              </div>
            ) : session ? (
              <div style={userInfoStyle}>
                <div style={avatarStyle}>
                  {getInitials(session.user?.name)}
                </div>
                <span style={userNameStyle}>
                  {session.user?.name || session.user?.email}
                </span>
              </div>
            ) : null}
          </nav>

          <button
            style={mobileMenuButtonStyle}
            className="mobile-menu-button"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <span style={{
              ...hamburgerLineStyle,
              transform: menuOpen ? 'rotate(45deg) translateY(6px)' : 'none',
            }} />
            <span style={{
              ...hamburgerLineStyle,
              opacity: menuOpen ? 0 : 1,
            }} />
            <span style={{
              ...hamburgerLineStyle,
              transform: menuOpen ? 'rotate(-45deg) translateY(-6px)' : 'none',
            }} />
          </button>
        </div>
      </header>

      {/* モバイルメニュー */}
      <div className="mobile-menu">
        <Link href="/" style={{ ...navLinkStyle, padding: '12px' }}>
          ホーム
        </Link>
        {session && (
          <Link href="/board" style={{ ...navLinkStyle, padding: '12px' }}>
            掲示板
          </Link>
        )}
        {session ? (
          <>
            <div style={{ padding: '12px', borderTop: '1px solid #e5e7eb' }}>
              <div style={{ fontSize: '14px', color: '#475569', marginBottom: '8px' }}>
                {session.user?.name || session.user?.email}
              </div>
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '12px 0' }}>
            <Link href="/auth/signin" style={{ ...outlineButtonStyle, textAlign: 'center' }}>
              ログイン
            </Link>
          </div>
        )}
      </div>

      {/* ヘッダー分のスペース確保 */}
      <div style={{ height: '72px' }} />
    </>
  );
}