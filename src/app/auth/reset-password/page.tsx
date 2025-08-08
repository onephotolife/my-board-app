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
        setEmail(''); // Clear form for security
      } else {
        // Error Handling Expert: Handle different error types
        switch (data.type) {
          case 'RATE_LIMIT_EXCEEDED':
            setError(data.error);
            break;
          case 'VALIDATION_ERROR':
            setError(data.error);
            break;
          default:
            setError(data.error || 'エラーが発生しました。もう一度お試しください。');
        }
      }
    } catch {
      setError('ネットワークエラーが発生しました。しばらく時間をおいて再試行してください。');
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
    fontSize: '28px',
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: '16px',
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

  if (!mounted) {
    return (
      <div style={containerStyle}>
        <div style={{ ...modern2025Styles.card, ...formContainerStyle }}>
          <h1 style={titleStyle}>パスワードリセット</h1>
          <p style={subtitleStyle}>読み込み中...</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <>
        <style jsx global>{`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
          }
        `}</style>
        
        <div style={containerStyle}>
          <div style={{ 
            ...modern2025Styles.card, 
            ...formContainerStyle, 
            animation: 'fadeIn 0.5s ease-out',
            textAlign: 'center'
          }}>
            {/* Success Icon */}
            <div style={{
              width: '64px',
              height: '64px',
              backgroundColor: '#10b981',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px',
              animation: 'pulse 2s infinite'
            }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" style={{ color: 'white' }}>
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={3}
                  stroke="currentColor"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>

            <h1 style={{
              ...titleStyle,
              color: modern2025Styles.colors.success,
              marginBottom: '16px'
            }}>
              メールを送信しました
            </h1>
            
            <p style={{
              ...subtitleStyle,
              marginBottom: '24px',
              color: modern2025Styles.colors.text.primary
            }}>
              パスワードリセットの手順を記載したメールを送信しました。
              <br />
              メールボックスをご確認ください。
            </p>

            <div style={{
              ...modern2025Styles.alert.success,
              marginBottom: '24px',
              textAlign: 'left'
            }}>
              <strong>ご確認ください：</strong>
              <ul style={{ margin: '8px 0 0 16px', padding: 0 }}>
                <li>メールが届かない場合は、迷惑メールフォルダもご確認ください</li>
                <li>リセットリンクは1時間で有効期限が切れます</li>
                <li>リンクは1回のみ使用可能です</li>
              </ul>
            </div>

            <Link
              href="/auth/signin"
              style={{
                ...modern2025Styles.button.primary,
                ...(buttonHovered ? modern2025Styles.button.primaryHover : {}),
                display: 'inline-block',
                textDecoration: 'none',
                marginBottom: '16px'
              }}
              onMouseEnter={() => setButtonHovered(true)}
              onMouseLeave={() => setButtonHovered(false)}
            >
              ログインページに戻る
            </Link>

            <div style={linkContainerStyle}>
              <button
                onClick={() => {
                  setSuccess(false);
                  setEmail('');
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  ...linkStyle,
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = modern2025Styles.colors.primaryDark;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = modern2025Styles.colors.primary;
                }}
              >
                別のメールアドレスでリセット
              </button>
            </div>
          </div>
        </div>
      </>
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
      `}</style>
      
      <div style={containerStyle}>
        <div style={{ 
          ...modern2025Styles.card, 
          ...formContainerStyle, 
          animation: 'fadeIn 0.5s ease-out' 
        }}>
          {/* Security Icon */}
          <div style={{
            width: '48px',
            height: '48px',
            backgroundColor: modern2025Styles.colors.primary,
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px'
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ color: 'white' }}>
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2}
                stroke="currentColor"
                d="M12 15v2m0 0v2m0-2h2m-2 0H10m2-5a2 2 0 100-4 2 2 0 000 4zm-7 9V8a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2H7a2 2 0 01-2-2z"
              />
            </svg>
          </div>

          <h1 style={titleStyle}>パスワードリセット</h1>
          <p style={subtitleStyle}>
            パスワードをお忘れですか？
            <br />
            メールアドレスを入力して、リセット手順をお受け取りください。
          </p>
          
          {error && (
            <div style={{ 
              ...modern2025Styles.alert.error, 
              animation: 'slideUp 0.3s ease-out',
              marginBottom: '20px'
            }}>
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
                autoFocus
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
              disabled={loading || !email}
            >
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ animation: 'spin 1s linear infinite' }}>
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" strokeOpacity="0.3"/>
                    <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                  </svg>
                  送信中...
                </span>
              ) : (
                'リセットメールを送信'
              )}
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

            <div style={{ textAlign: 'center', marginTop: '16px' }}>
              <Link 
                href="/auth/signup" 
                style={{
                  color: modern2025Styles.colors.text.secondary,
                  textDecoration: 'none',
                  fontSize: '14px',
                  fontWeight: '500',
                  transition: 'color 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = modern2025Styles.colors.primary;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = modern2025Styles.colors.text.secondary;
                }}
              >
                アカウントをお持ちでない方はこちら
              </Link>
            </div>
          </form>
        </div>
      </div>

      <style jsx global>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}

export default function PasswordResetRequestPage() {
  return (
    <Suspense fallback={
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      }}>
        <div style={{ color: 'white', fontSize: '18px' }}>Loading...</div>
      </div>
    }>
      <PasswordResetRequestForm />
    </Suspense>
  );
}