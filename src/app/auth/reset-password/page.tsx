'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';

import { modern2025Styles } from '@/styles/modern-2025';

function PasswordResetRequestForm() {
  const [mounted, setMounted] = useState(false);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [hoveredField, setHoveredField] = useState<string | null>(null);
  const [buttonHovered, setButtonHovered] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/request-reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        setEmail('');
      } else {
        // シンプルなエラー表示
        setError(data.error || 'エラーが発生しました。もう一度お試しください。');
      }
    } catch {
      // ネットワークエラー
      setError('サーバーとの通信に失敗しました。インターネット接続を確認してください。');
    } finally {
      setLoading(false);
    }
  };

  const containerStyle: React.CSSProperties = {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
  };

  const formContainerStyle: React.CSSProperties = {
    maxWidth: '440px',
    width: '100%',
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '32px',
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: '32px',
    color: modern2025Styles.colors.text.primary,
    letterSpacing: '-0.025em',
  };

  const subtitleStyle: React.CSSProperties = {
    fontSize: '15px',
    fontWeight: '400',
    textAlign: 'center',
    marginBottom: '32px',
    color: modern2025Styles.colors.text.secondary,
    lineHeight: '1.5',
  };

  const getFieldStyle = (fieldName: string) => {
    const isFocused = focusedField === fieldName;
    const isHovered = hoveredField === fieldName;
    
    let style = { ...modern2025Styles.input.base };
    
    if (isFocused) {
      style = { ...style, ...modern2025Styles.input.focus };
    } else if (isHovered) {
      style = { ...style, ...modern2025Styles.input.hover };
    }
    
    return style;
  };

  const linkContainerStyle: React.CSSProperties = {
    textAlign: 'center',
    marginTop: '24px',
    fontSize: '14px',
  };

  const linkStyle: React.CSSProperties = {
    color: modern2025Styles.colors.primary,
    textDecoration: 'none',
    fontWeight: '600',
    transition: 'color 0.2s',
  };

  const alertStyle: React.CSSProperties = {
    padding: '12px 16px',
    borderRadius: '8px',
    marginBottom: '20px',
    fontSize: '14px',
    fontWeight: '500',
    animation: 'slideUp 0.3s ease-out',
  };

  const errorAlertStyle: React.CSSProperties = {
    ...alertStyle,
    backgroundColor: '#fee2e2',
    color: '#991b1b',
    border: '1px solid #fecaca',
  };

  const successAlertStyle: React.CSSProperties = {
    ...alertStyle,
    backgroundColor: '#dcfce7',
    color: '#166534',
    border: '1px solid #bbf7d0',
  };

  if (!mounted) {
    return (
      <div style={containerStyle}>
        <div style={{ ...modern2025Styles.card, ...formContainerStyle }}>
          <h1 style={titleStyle}>パスワードリセット</h1>
        </div>
      </div>
    );
  }

  return (
    <>
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        input::placeholder {
          color: ${modern2025Styles.input.placeholder.color};
          font-weight: ${modern2025Styles.input.placeholder.fontWeight};
        }
      `}
      </style>

      <div style={containerStyle}>
        <div style={{ ...modern2025Styles.card, ...formContainerStyle, animation: 'fadeIn 0.5s ease-out' }}>
          <h1 style={titleStyle}>🔐 パスワードリセット</h1>
          
          {!success ? (
            <>
              <p style={subtitleStyle}>
                パスワードをお忘れですか？<br />
                メールアドレスを入力して、リセット手順をお受け取りください。
              </p>

              {error && (
                <div style={errorAlertStyle}>
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <label htmlFor="email" style={modern2025Styles.label}>
                    メールアドレス
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={() => setFocusedField('email')}
                    onBlur={() => setFocusedField(null)}
                    onMouseEnter={() => setHoveredField('email')}
                    onMouseLeave={() => setHoveredField(null)}
                    style={getFieldStyle('email')}
                    placeholder="登録されたメールアドレスを入力"
                    autoComplete="email"
                    disabled={loading}
                  />
                </div>

                <button
                  type="submit"
                  style={{
                    ...modern2025Styles.button.primary,
                    ...(buttonHovered ? modern2025Styles.button.primaryHover : {}),
                    opacity: loading ? 0.7 : 1,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    marginTop: '8px',
                  }}
                  onMouseEnter={() => !loading && setButtonHovered(true)}
                  onMouseLeave={() => setButtonHovered(false)}
                  disabled={loading}
                >
                  {loading ? 'メール送信中...' : 'リセットメールを送信'}
                </button>

                <div style={linkContainerStyle}>
                  <span style={{ color: modern2025Styles.colors.text.secondary }}>
                    パスワードを思い出しましたか？{' '}
                  </span>
                  <Link 
                    href="/auth/signin" 
                    style={linkStyle}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = modern2025Styles.colors.primaryDark;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = modern2025Styles.colors.primary;
                    }}
                  >
                    ログイン
                  </Link>
                </div>

                <div style={{ textAlign: 'center' }}>
                  <Link 
                    href="/" 
                    style={{ ...linkStyle, fontSize: '13px', color: modern2025Styles.colors.text.secondary }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.textDecoration = 'underline';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.textDecoration = 'none';
                    }}
                  >
                    ← ホームに戻る
                  </Link>
                </div>
              </form>
            </>
          ) : (
            <div style={{ textAlign: 'center', animation: 'fadeIn 0.5s ease-out' }}>
              <div style={{ fontSize: '48px', marginBottom: '24px' }}>📧</div>
              
              <h2 style={{ 
                fontSize: '24px', 
                fontWeight: '600', 
                marginBottom: '16px',
                color: modern2025Styles.colors.text.primary 
              }}
              >
                メールを送信しました
              </h2>
              
              <div style={successAlertStyle}>
                パスワードリセットの手順をメールで送信しました。<br />
                メールボックスをご確認ください。
              </div>
              
              <p style={{ 
                color: modern2025Styles.colors.text.secondary, 
                fontSize: '14px',
                marginTop: '24px',
                lineHeight: '1.6'
              }}
              >
                メールが届かない場合は、迷惑メールフォルダをご確認ください。<br />
                それでも見つからない場合は、数分後に再度お試しください。
              </p>
              
              <div style={{ marginTop: '32px' }}>
                <Link 
                  href="/auth/signin" 
                  style={{
                    ...modern2025Styles.button.primary,
                    textDecoration: 'none',
                    display: 'inline-block',
                    minWidth: '160px',
                  }}
                >
                  ログインページへ
                </Link>
              </div>
              
              <div style={{ marginTop: '16px' }}>
                <button
                  onClick={() => {
                    setSuccess(false);
                    setError('');
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: modern2025Styles.colors.primary,
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    textDecoration: 'underline',
                    padding: '8px',
                  }}
                >
                  別のメールアドレスで試す
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default function PasswordResetRequestPage() {
  return (
    <Suspense fallback={(
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      }}
      >
        <div style={{ color: 'white', fontSize: '18px' }}>Loading...</div>
      </div>
    )}
    >
      <PasswordResetRequestForm />
    </Suspense>
  );
}