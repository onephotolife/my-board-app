'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { modern2025Styles } from '@/styles/modern-2025';
import WelcomeSection from '@/components/WelcomeSection';
import AuthButtons from '@/components/HomePage/AuthButtons';
import PasswordResetLink from '@/components/HomePage/PasswordResetLink';
import FeatureGrid from '@/components/HomePage/FeatureGrid';
import { Container, CircularProgress, Box } from '@mui/material';

export default function Home() {
  const { data: session, status } = useSession();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const containerStyle: React.CSSProperties = {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
  };

  const contentStyle: React.CSSProperties = {
    maxWidth: '1200px',
    width: '100%',
    textAlign: 'center',
  };

  const heroStyle: React.CSSProperties = {
    ...modern2025Styles.card,
    padding: '80px 40px',
    marginBottom: '40px',
    position: 'relative',
    overflow: 'hidden',
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '48px',
    fontWeight: '800',
    marginBottom: '24px',
    color: modern2025Styles.colors.text.primary,
    letterSpacing: '-0.03em',
    lineHeight: '1.2',
  };

  const subtitleStyle: React.CSSProperties = {
    fontSize: '20px',
    color: modern2025Styles.colors.text.secondary,
    marginBottom: '48px',
    fontWeight: '400',
    lineHeight: '1.6',
  };



  const features = [
    { icon: '🔐', title: 'セキュアな認証', desc: 'メールアドレス認証による安全な会員登録' },
    { icon: '💬', title: '会員限定掲示板', desc: '会員のみが投稿・閲覧可能な掲示板' },
    { icon: '✏️', title: '投稿管理', desc: '自分の投稿の編集・削除機能' },
    { icon: '🔑', title: 'パスワード管理', desc: 'セキュアなパスワードリセット機能' },
    { icon: '🛡️', title: 'セッション管理', desc: '安全なセッション管理システム' },
    { icon: '📱', title: 'レスポンシブ', desc: 'どんなデバイスでも快適に利用可能' },
  ];

  if (!mounted || status === 'loading') {
    return (
      <div style={containerStyle}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
          <CircularProgress size={60} />
        </Box>
      </div>
    );
  }

  return (
    <main style={{ position: 'relative', zIndex: 1, isolation: 'isolate' }}>
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        .feature-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
        }
      `}</style>

      <div style={status === 'authenticated' ? { minHeight: '100vh', background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)', padding: '40px 20px' } : containerStyle}>
        {status === 'authenticated' ? (
          <Container maxWidth="lg">
            <WelcomeSection session={session} />
            
            <div style={{ ...heroStyle, animation: 'fadeIn 0.6s ease-out' }}>
              <h2 style={{ ...titleStyle, fontSize: '36px', marginBottom: '32px' }}>
                会員専用機能
              </h2>
              
              <FeatureGrid features={features} />
            </div>
          </Container>
        ) : (
          <div style={contentStyle}>
            <div style={{ ...heroStyle, animation: 'fadeIn 0.6s ease-out' }}>
              <h1 style={titleStyle}>
                会員制掲示板へようこそ
              </h1>
              <p style={subtitleStyle}>
                プライベートで安全なコミュニティで<br />
                メンバーと情報を共有しましょう
              </p>

              <AuthButtons />
              <PasswordResetLink />

              <FeatureGrid features={features} />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}