'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { modern2025Styles } from '@/styles/modern-2025';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('無効なリンクです');
      return;
    }

    const verifyEmail = async () => {
      try {
        const response = await fetch(`/api/auth/verify-email?token=${token}`);
        
        if (response.ok) {
          setStatus('success');
          setMessage('メールアドレスの確認が完了しました');
          setTimeout(() => {
            router.push('/auth/signin?verified=true');
          }, 3000);
        } else {
          const data = await response.json();
          setStatus('error');
          setMessage(data.error || 'メール確認に失敗しました');
        }
      } catch (error) {
        setStatus('error');
        setMessage('ネットワークエラーが発生しました');
        console.error('Verification error:', error);
      }
    };

    verifyEmail();
  }, [token, router]);

  const containerStyle: React.CSSProperties = {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
  };

  const cardStyle: React.CSSProperties = {
    ...modern2025Styles.card,
    maxWidth: '500px',
    width: '100%',
    textAlign: 'center',
    padding: '60px 40px',
  };

  const iconContainerStyle: React.CSSProperties = {
    width: '120px',
    height: '120px',
    margin: '0 auto 32px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '60px',
    background: status === 'success' 
      ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
      : status === 'error'
      ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
      : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.15)',
    animation: status === 'loading' ? 'pulse 2s infinite' : 'fadeIn 0.5s ease-out',
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '28px',
    fontWeight: '700',
    marginBottom: '16px',
    color: modern2025Styles.colors.text.primary,
    letterSpacing: '-0.02em',
  };

  const messageStyle: React.CSSProperties = {
    fontSize: '16px',
    lineHeight: '1.6',
    marginBottom: '32px',
    color: modern2025Styles.colors.text.secondary,
  };

  const loadingSpinnerStyle: React.CSSProperties = {
    width: '60px',
    height: '60px',
    border: '4px solid rgba(255, 255, 255, 0.3)',
    borderTop: '4px solid white',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  };

  const buttonStyle: React.CSSProperties = {
    ...modern2025Styles.button.primary,
    minWidth: '200px',
    fontSize: '16px',
    padding: '14px 28px',
  };

  const suggestionStyle: React.CSSProperties = {
    fontSize: '14px',
    color: modern2025Styles.colors.text.secondary,
    marginTop: '24px',
    padding: '20px',
    backgroundColor: 'rgba(99, 102, 241, 0.05)',
    borderRadius: '12px',
    border: '1px solid rgba(99, 102, 241, 0.1)',
  };

  const progressBarStyle: React.CSSProperties = {
    width: '100%',
    height: '4px',
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderRadius: '2px',
    overflow: 'hidden',
    marginTop: '24px',
  };

  const progressFillStyle: React.CSSProperties = {
    height: '100%',
    background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
    animation: status === 'success' ? 'progress 3s linear' : 'none',
  };

  return (
    <>
      <style jsx global>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.05); opacity: 0.8; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes progress {
          from { width: 0%; }
          to { width: 100%; }
        }
      `}</style>
      
      <div style={containerStyle}>
        <div style={cardStyle}>
          <div style={iconContainerStyle}>
            {status === 'loading' && (
              <div style={loadingSpinnerStyle}></div>
            )}
            {status === 'success' && '✓'}
            {status === 'error' && '✕'}
          </div>
          
          <h1 style={titleStyle}>
            {status === 'loading' && 'メールアドレスを確認中...'}
            {status === 'success' && '確認完了！'}
            {status === 'error' && 'エラーが発生しました'}
          </h1>
          
          <div style={messageStyle}>
            {status === 'loading' && (
              'しばらくお待ちください...'
            )}
            {status === 'success' && (
              <>
                {message}
                <br />
                まもなくログインページへ移動します
              </>
            )}
            {status === 'error' && message}
          </div>
          
          {status === 'success' && (
            <div style={progressBarStyle}>
              <div style={progressFillStyle}></div>
            </div>
          )}
          
          {status === 'error' && (
            <>
              <div style={suggestionStyle}>
                <strong>次のステップ：</strong><br />
                {!token ? (
                  <>
                    メール内のリンクを正しくクリックしたか確認してください。<br />
                    リンクが切れている場合は、コピー&ペーストしてお試しください。
                  </>
                ) : message.includes('期限切れ') || message.includes('無効') ? (
                  <>
                    確認リンクが無効または期限切れの可能性があります。<br />
                    新規登録からやり直してください。<br />
                    ※メール確認リンクは24時間有効です。
                  </>
                ) : message.includes('ネットワーク') ? (
                  <>
                    ネットワーク接続を確認してください。<br />
                    問題が続く場合は、しばらく待ってから再度お試しください。
                  </>
                ) : (
                  <>
                    問題が解決しない場合は、新規登録からやり直すか、<br />
                    既にアカウントをお持ちの場合はログインしてください。
                  </>
                )}
              </div>
              
              <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginTop: '32px' }}>
                <Link href="/auth/signup" style={{ textDecoration: 'none' }}>
                  <button style={buttonStyle}>
                    新規登録へ
                  </button>
                </Link>
                <Link href="/auth/signin" style={{ textDecoration: 'none' }}>
                  <button style={{
                    ...buttonStyle,
                    background: 'transparent',
                    color: modern2025Styles.colors.primary,
                    border: `2px solid ${modern2025Styles.colors.primary}`,
                  }}>
                    ログインへ
                  </button>
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

export default function VerifyEmailPage() {
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
      <VerifyEmailContent />
    </Suspense>
  );
}