'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

import { modern2025Styles } from '@/styles/modern-2025';
import { getAuthErrorMessage } from '@/lib/auth-errors';
import { DebugClient } from './debug-client';

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [errorDetail, setErrorDetail] = useState('');
  const [errorAction, setErrorAction] = useState('');
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [hoveredField, setHoveredField] = useState<string | null>(null);
  const [buttonHovered, setButtonHovered] = useState(false);
  
  const verified = searchParams.get('verified') === 'true';
  const urlError = searchParams.get('error');
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';

  // 🔐 41人天才会議: 確実なリダイレクト処理（window.location.replace使用）
  useEffect(() => {
    console.log('🔍 [SignIn] セッション状態チェック:', {
      status,
      hasSession: !!session,
      emailVerified: session?.user?.emailVerified,
      pathname: window.location.pathname
    });

    // セッションローディング中は待機
    if (status === 'loading') {
      return;
    }

    // 一度でもリダイレクトフラグがあるかチェック
    const hasRedirectedFlag = sessionStorage.getItem('auth-redirected');
    if (hasRedirectedFlag) {
      console.log('🛡️ 既にリダイレクト実行済み、処理をスキップ');
      return;
    }

    // 認証済みかつメール確認済みの場合のみリダイレクト
    if (status === 'authenticated' && session?.user?.emailVerified) {
      console.log('✅ 認証済み・確認済みユーザー、window.location.replaceでリダイレクト');
      const finalUrl = callbackUrl.includes('/auth/') ? '/dashboard' : callbackUrl;
      
      // リダイレクトフラグを設定して無限ループを防止
      sessionStorage.setItem('auth-redirected', 'true');
      
      // 確実なリダイレクト実行
      window.location.replace(finalUrl);
      return;
    }

    // 認証済みだがメール未確認の場合
    if (status === 'authenticated' && !session?.user?.emailVerified) {
      console.log('⚠️ メール未確認ユーザー、確認ページへリダイレクト');
      sessionStorage.setItem('auth-redirected', 'true');
      window.location.replace('/auth/email-not-verified');
      return;
    }

    // その他の場合（未認証等）は何もしない
  }, [session, status, callbackUrl]);

  useEffect(() => {
    // URLパラメータからのエラー処理
    if (urlError) {
      const errorInfo = getAuthErrorMessage(urlError);
      setError(errorInfo.title);
      setErrorDetail(errorInfo.message);
      setErrorAction(errorInfo.action || '');
    }
  }, [urlError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setErrorDetail('');
    setErrorAction('');
    setLoading(true);

    console.log('🔐 ログイン試行開始:', { email, timestamp: new Date().toISOString() });

    try {
      const finalUrl = callbackUrl.includes('/auth/') ? '/dashboard' : callbackUrl;
      
      console.log('🎯 ログイン試行:', { email, callbackUrl: finalUrl });
      
      // NextAuth v4でのsignIn関数を使用
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
        callbackUrl: finalUrl,
      });

      console.log('📊 signIn結果:', {
        ok: result?.ok,
        error: result?.error,
        status: result?.status,
        url: result?.url
      });

      if (result?.error) {
        console.log('❌ ログインエラー:', result.error);
        
        if (result.error === 'EmailNotVerified') {
          const errorInfo = getAuthErrorMessage(result.error);
          setError(errorInfo.title);
          setErrorDetail(errorInfo.message);
          setErrorAction(errorInfo.action || '');
          
          // メール未確認ページへリダイレクト
          setTimeout(() => {
            router.replace('/auth/email-not-verified');
          }, 2000);
        } else {
          const errorInfo = getAuthErrorMessage(result.error);
          setError(errorInfo.title);
          setErrorDetail(errorInfo.message);
          setErrorAction(errorInfo.action || '');
        }
      } else if (result?.ok) {
        console.log('✅ ログイン成功、即座にリダイレクト実行');
        
        // 成功メッセージを表示
        setError('');
        setErrorDetail('ログインに成功しました。リダイレクトしています...');
        
        // 🔐 41人天才会議: handleSubmit内で確実なリダイレクト実行
        const finalUrl = callbackUrl.includes('/auth/') ? '/dashboard' : callbackUrl;
        console.log('🚀 handleSubmit内リダイレクト実行:', finalUrl);
        
        // 1. sessionStorageフラグを設定
        sessionStorage.setItem('auth-redirected', 'true');
        
        // 2. 複数の方法でリダイレクト実行（確実性向上）
        setTimeout(() => {
          console.log('🔄 window.location.replace実行:', finalUrl);
          window.location.replace(finalUrl);
        }, 100);
        
        // 3. フォールバック
        setTimeout(() => {
          if (window.location.pathname === '/auth/signin') {
            console.log('🔄 フォールバック window.location.href実行:', finalUrl);
            window.location.href = finalUrl;
          }
        }, 1000);
        
        // 4. useEffectでも検知される（二重保護）
      } else {
        console.log('⚠️ 予期しない結果:', result);
        setError('ログインに失敗しました');
        setErrorDetail('メールアドレスまたはパスワードが正しくありません。');
      }
    } catch (error) {
      console.error('💥 例外エラー:', error);
      setError('ログイン中にエラーが発生しました');
      setErrorDetail('しばらく時間をおいて再度お試しください。');
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
    fontSize: '14px',
    fontWeight: '400',
    textAlign: 'center',
    marginTop: '-24px',
    marginBottom: '32px',
    color: modern2025Styles.colors.text.secondary,
  };

  const formStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
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

  return (
    <>
      <DebugClient />
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
          <h1 style={titleStyle}>ログイン - Sign In</h1>
          <p style={subtitleStyle}>アカウントにログインして続ける</p>
          
          {verified && (
            <div style={{ ...modern2025Styles.alert.success, animation: 'slideUp 0.3s ease-out', marginBottom: '20px' }}>
              メールアドレスが確認されました。ログインしてください。
            </div>
          )}
          
          {error && (
            <div style={{ 
              ...modern2025Styles.alert.error, 
              animation: 'slideUp 0.3s ease-out',
              marginBottom: '20px',
              textAlign: 'left'
            }}
            >
              <div style={{ fontWeight: '600', marginBottom: errorDetail ? '8px' : '0' }}>
                {error}
              </div>
              {errorDetail && (
                <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: errorAction ? '8px' : '0' }}>
                  {errorDetail}
                </div>
              )}
              {errorAction && (
                <div style={{ fontSize: '13px', fontStyle: 'italic', opacity: 0.8 }}>
                  💡 {errorAction}
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} style={formStyle}>
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
                placeholder="example@gmail.com"
                autoComplete="email"
                autoFocus
                data-testid="email-input"
              />
            </div>

            <div>
              <label htmlFor="password" style={modern2025Styles.label}>
                パスワード
              </label>
              <input
                type="password"
                id="password"
                name="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                onMouseEnter={() => setHoveredField('password')}
                onMouseLeave={() => setHoveredField(null)}
                style={getFieldStyle('password')}
                placeholder="パスワードを入力"
                autoComplete="current-password"
                data-testid="password-input"
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
              data-testid="signin-button"
            >
              {loading ? 'ログイン中...' : 'ログイン'}
            </button>

            <div style={linkContainerStyle}>
              <span style={{ color: modern2025Styles.colors.text.secondary }}>
                アカウントをお持ちでない方は{' '}
              </span>
              <Link 
                href="/auth/signup" 
                style={linkStyle}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = modern2025Styles.colors.primaryDark;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = modern2025Styles.colors.primary;
                }}
              >
                新規登録
              </Link>
            </div>
            
            <div style={{ textAlign: 'center', marginTop: '16px' }}>
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
          </form>
        </div>
      </div>
    </>
  );
}

export default function SignInPage() {
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
      <SignInForm />
    </Suspense>
  );
}