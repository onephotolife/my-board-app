'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { modern2025Styles } from '@/styles/modern-2025';

// メイン検証コンポーネント
function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    // URLパラメータからトークンを取得
    const tokenParam = searchParams.get('token');
    setToken(tokenParam);

    if (!tokenParam) {
      setStatus('error');
      setMessage('無効なリンクです。メール内のリンクを正しくクリックしたか確認してください。');
      return;
    }

    // メール確認処理
    const verifyEmail = async () => {
      try {
        console.log('🔍 メール確認開始:', { token: tokenParam });
        
        const response = await fetch(`/api/auth/verify-email?token=${encodeURIComponent(tokenParam)}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        console.log('📡 レスポンスステータス:', response.status);
        
        const data = await response.json();
        console.log('📦 レスポンスデータ:', data);
        
        if (response.ok) {
          if (data.alreadyVerified) {
            setStatus('success');
            setMessage('メールアドレスは既に確認済みです。ログインページへ移動します。');
          } else {
            setStatus('success');
            setMessage('メールアドレスの確認が完了しました！');
          }
          
          // 3秒後にログインページへリダイレクト
          setTimeout(() => {
            router.push('/auth/signin?verified=true');
          }, 3000);
        } else {
          setStatus('error');
          setMessage(data.error || 'メール確認に失敗しました');
        }
      } catch (error) {
        console.error('❌ Verification error:', error);
        setStatus('error');
        setMessage('ネットワークエラーが発生しました。インターネット接続を確認してください。');
      }
    };

    verifyEmail();
  }, [searchParams, router]);

  const containerStyle: React.CSSProperties = {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
  };

  const cardStyle: React.CSSProperties = {
    backgroundColor: 'white',
    borderRadius: '20px',
    padding: '60px 40px',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
    maxWidth: '500px',
    width: '100%',
    textAlign: 'center',
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
    color: 'white',
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
    color: '#0f172a',
    letterSpacing: '-0.02em',
  };

  const messageStyle: React.CSSProperties = {
    fontSize: '16px',
    lineHeight: '1.6',
    marginBottom: '32px',
    color: '#475569',
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
    backgroundColor: '#6366f1',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    padding: '14px 28px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    textDecoration: 'none',
    display: 'inline-block',
    minWidth: '200px',
    transition: 'all 0.2s ease',
  };

  const suggestionStyle: React.CSSProperties = {
    fontSize: '14px',
    color: '#475569',
    marginTop: '24px',
    padding: '20px',
    backgroundColor: 'rgba(99, 102, 241, 0.05)',
    borderRadius: '12px',
    border: '1px solid rgba(99, 102, 241, 0.1)',
    textAlign: 'left',
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
                <strong>🔍 トラブルシューティング：</strong><br /><br />
                {!token ? (
                  <>
                    ✅ メール内のリンクを正しくクリックしたか確認してください<br />
                    ✅ リンクが切れている場合は、URL全体をコピー&ペーストしてください<br />
                    ✅ ブラウザのアドレスバーにトークンパラメータが含まれているか確認してください
                  </>
                ) : message.includes('期限切れ') || message.includes('無効') ? (
                  <>
                    ⏰ 確認リンクが無効または期限切れの可能性があります<br />
                    ✅ メール確認リンクは24時間有効です<br />
                    ✅ 新規登録からやり直してください
                  </>
                ) : message.includes('ネットワーク') ? (
                  <>
                    🌐 ネットワーク接続を確認してください<br />
                    ✅ インターネットに接続されているか確認<br />
                    ✅ ファイアウォールやプロキシの設定を確認<br />
                    ✅ しばらく待ってから再度お試しください
                  </>
                ) : (
                  <>
                    ⚠️ 予期しないエラーが発生しました<br />
                    ✅ ブラウザを更新してみてください<br />
                    ✅ 別のブラウザでお試しください<br />
                    ✅ 問題が解決しない場合は、新規登録からやり直してください
                  </>
                )}
              </div>
              
              <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginTop: '32px', flexWrap: 'wrap' }}>
                <Link href="/auth/signup" style={{ textDecoration: 'none' }}>
                  <span style={buttonStyle}>
                    新規登録へ
                  </span>
                </Link>
                <Link href="/auth/signin" style={{ textDecoration: 'none' }}>
                  <span style={{
                    ...buttonStyle,
                    background: 'transparent',
                    color: '#6366f1',
                    border: '2px solid #6366f1',
                  }}>
                    ログインへ
                  </span>
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

// ローディングコンポーネント
function LoadingFallback() {
  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center',
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    }}>
      <div style={{ 
        background: 'white',
        padding: '40px',
        borderRadius: '20px',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
        textAlign: 'center',
      }}>
        <div style={{
          width: '60px',
          height: '60px',
          border: '4px solid rgba(99, 102, 241, 0.3)',
          borderTop: '4px solid #6366f1',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto 20px',
        }}></div>
        <div style={{ color: '#475569', fontSize: '18px' }}>読み込み中...</div>
      </div>
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

// メインエクスポート（Suspenseで囲む）
export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <VerifyEmailContent />
    </Suspense>
  );
}