'use client';

import { useState, useEffect, Suspense } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

import { modern2025Styles } from '@/styles/modern-2025';
import { getAuthErrorMessage } from '@/lib/auth-errors';

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

  // セッションがある場合は自動的にリダイレクト
  useEffect(() => {
    console.log('🔍 セッション状態変更:', { 
      status, 
      hasSession: !!session,
      user: session?.user?.email,
      emailVerified: session?.user?.emailVerified,
      timestamp: new Date().toISOString()
    });
    
    // 🔐 41人天才会議による修正: メール確認済みの場合のみリダイレクト
    if (status === 'authenticated' && session?.user?.emailVerified) {
      console.log('✅ 認証済み&メール確認済み、リダイレクト実行');
      const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';
      
      // 無限ループ防止: callbackUrlが認証ページの場合はダッシュボードへ
      if (callbackUrl.includes('/auth/')) {
        console.log('⚠️ callbackUrlが認証ページのため、ダッシュボードへリダイレクト');
        router.push('/dashboard');
      } else {
        router.push(callbackUrl);
      }
    } else if (status === 'authenticated' && session && !session.user?.emailVerified) {
      console.log('⚠️ 認証済みだがメール未確認、リダイレクトしない');
      // メール未確認の場合はリダイレクトしない（ログインフォームを表示）
    }
  }, [session, status, searchParams, router]);

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
      // セッションチェック（デバッグ用）
      const sessionCheckBefore = await fetch('/api/debug/session');
      const sessionDataBefore = await sessionCheckBefore.json();
      console.log('🔍 ログイン前のセッション:', sessionDataBefore);
      
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      console.log('📊 signIn結果:', {
        ok: result?.ok,
        error: result?.error,
        status: result?.status,
        url: result?.url,
        fullResult: JSON.stringify(result),
        timestamp: new Date().toISOString()
      });

      if (result?.error) {
        // エラータイプに応じたメッセージを表示
        console.log('❌ ログインエラー:', result.error);
        
        // 25人天才エンジニア会議による改善 - 適切なエラー分岐処理
        if (result.error === 'EmailNotVerified') {
          // メール未確認エラー: 専用ページへリダイレクト
          const errorInfo = getAuthErrorMessage(result.error);
          setError(errorInfo.title);
          setErrorDetail(errorInfo.message);
          setErrorAction(errorInfo.action || '');
          
          // 2秒後にメール未確認ページへリダイレクト
          setTimeout(() => {
            router.push('/auth/email-not-verified');
          }, 2000);
        } else if (result.error === 'InvalidPassword') {
          // パスワード間違いエラー: エラーメッセージ表示のみ（リダイレクトなし）
          const errorInfo = getAuthErrorMessage(result.error);
          setError(errorInfo.title);
          setErrorDetail(errorInfo.message);
          setErrorAction(errorInfo.action || '');
        } else if (result.error === 'UserNotFound') {
          // ユーザー不存在エラー: セキュリティ上、一般的なエラーメッセージ
          const errorInfo = getAuthErrorMessage(result.error);
          setError(errorInfo.title);
          setErrorDetail(errorInfo.message);
          setErrorAction(errorInfo.action || '');
        } else {
          // その他のエラー: 汎用エラーメッセージ
          const errorInfo = getAuthErrorMessage(result.error);
          setError(errorInfo.title);
          setErrorDetail(errorInfo.message);
          setErrorAction(errorInfo.action || '');
        }
      } else if (result?.ok) {
        // ログイン成功
        console.log('✅ ログイン成功');
        
        // callbackUrlがある場合はそこへ、なければダッシュボードへリダイレクト
        const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';
        console.log('🎯 リダイレクト先:', callbackUrl);
        
        // 🔐 41人天才会議による修正: セッション確立を待つ
        console.log('🚀 セッション確立待機後、リダイレクト実行...');
        // Next.jsのruoterを使用して安全にリダイレクト
        setTimeout(() => {
          router.push(callbackUrl);
        }, 500);
        
      } else {
        // 予期しないエラー
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