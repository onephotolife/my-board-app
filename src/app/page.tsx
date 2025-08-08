'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { modern2025Styles } from '@/styles/modern-2025';

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [primaryButtonHovered, setPrimaryButtonHovered] = useState(false);
  const [secondaryButtonHovered, setSecondaryButtonHovered] = useState(false);

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

  const buttonContainerStyle: React.CSSProperties = {
    display: 'flex',
    gap: '20px',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginBottom: '60px',
  };

  const featureGridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '24px',
    marginTop: '40px',
  };

  const featureCardStyle: React.CSSProperties = {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: '16px',
    padding: '32px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.8)',
    transition: 'transform 0.3s, box-shadow 0.3s',
  };

  const featureIconStyle: React.CSSProperties = {
    fontSize: '40px',
    marginBottom: '16px',
  };

  const featureTitleStyle: React.CSSProperties = {
    fontSize: '18px',
    fontWeight: '600',
    marginBottom: '12px',
    color: modern2025Styles.colors.text.primary,
  };

  const featureDescStyle: React.CSSProperties = {
    fontSize: '14px',
    color: modern2025Styles.colors.text.secondary,
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

  if (!mounted) {
    return (
      <div style={containerStyle}>
        <div style={contentStyle}>
          <div style={heroStyle}>
            <h1 style={titleStyle}>会員制掲示板</h1>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
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

      <div style={containerStyle}>
        <div style={contentStyle}>
          <div style={{ ...heroStyle, animation: 'fadeIn 0.6s ease-out' }}>
            <h1 style={titleStyle}>
              会員制掲示板へようこそ
            </h1>
            <p style={subtitleStyle}>
              プライベートで安全なコミュニティで<br />
              メンバーと情報を共有しましょう
            </p>

            <div style={buttonContainerStyle}>
              <Link
                href="/auth/signin"
                style={{
                  ...modern2025Styles.button.primary,
                  ...(primaryButtonHovered ? modern2025Styles.button.primaryHover : {}),
                  minWidth: '160px',
                  textDecoration: 'none',
                  display: 'inline-block',
                }}
                onMouseEnter={() => setPrimaryButtonHovered(true)}
                onMouseLeave={() => setPrimaryButtonHovered(false)}
              >
                ログイン
              </Link>
              <Link
                href="/auth/signup"
                style={{
                  ...modern2025Styles.button.secondary,
                  ...(secondaryButtonHovered ? modern2025Styles.button.secondaryHover : {}),
                  minWidth: '160px',
                  textDecoration: 'none',
                  display: 'inline-block',
                }}
                onMouseEnter={() => setSecondaryButtonHovered(true)}
                onMouseLeave={() => setSecondaryButtonHovered(false)}
              >
                新規登録
              </Link>
            </div>
            
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

            <div style={featureGridStyle}>
              {features.map((feature, index) => (
                <div 
                  key={index}
                  className="feature-card"
                  style={{
                    ...featureCardStyle,
                    animation: `fadeIn 0.6s ease-out ${0.1 * index}s`,
                    animationFillMode: 'both',
                  }}
                >
                  <div style={featureIconStyle}>{feature.icon}</div>
                  <h3 style={featureTitleStyle}>{feature.title}</h3>
                  <p style={featureDescStyle}>{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}