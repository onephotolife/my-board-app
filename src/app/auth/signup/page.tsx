'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { modern2025Styles } from '@/styles/modern-2025';

export default function SignUpPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [hoveredField, setHoveredField] = useState<string | null>(null);
  const [buttonHovered, setButtonHovered] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError('パスワードが一致しません');
      return;
    }

    if (formData.password.length < 8) {
      setError('パスワードは8文字以上である必要があります');
      return;
    }

    if (!/[A-Z]/.test(formData.password)) {
      setError('パスワードには大文字を含める必要があります');
      return;
    }

    if (!/[a-z]/.test(formData.password)) {
      setError('パスワードには小文字を含める必要があります');
      return;
    }

    if (!/[0-9]/.test(formData.password)) {
      setError('パスワードには数字を含める必要があります');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || '登録に失敗しました');
      } else {
        setSuccess(data.message || '登録が完了しました！');
        setTimeout(() => {
          router.push('/auth/signin');
        }, 3000);
      }
    } catch {
      setError('登録中にエラーが発生しました');
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

  if (!mounted) {
    return (
      <div style={containerStyle}>
        <div style={{ ...modern2025Styles.card, ...formContainerStyle }}>
          <h1 style={titleStyle}>アカウント作成</h1>
          <p style={subtitleStyle}>新しいアカウントを作成して始めましょう</p>
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
      `}</style>
      
      <div style={containerStyle}>
        <div style={{ ...modern2025Styles.card, ...formContainerStyle, animation: 'fadeIn 0.5s ease-out' }}>
          <h1 style={titleStyle}>アカウント作成</h1>
          <p style={subtitleStyle}>新しいアカウントを作成して始めましょう</p>

          {error && (
            <div style={{ ...modern2025Styles.alert.error, animation: 'slideUp 0.3s ease-out' }}>
              {error}
            </div>
          )}

          {success && (
            <div style={{ ...modern2025Styles.alert.success, animation: 'slideUp 0.3s ease-out' }}>
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} style={formStyle}>
            <div>
              <label htmlFor="name" style={modern2025Styles.label}>
                お名前
              </label>
              <input
                type="text"
                id="name"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                onFocus={() => setFocusedField('name')}
                onBlur={() => setFocusedField(null)}
                onMouseEnter={() => setHoveredField('name')}
                onMouseLeave={() => setHoveredField(null)}
                style={getFieldStyle('name')}
                placeholder="山田 太郎"
                autoComplete="name"
                autoFocus
              />
            </div>

            <div>
              <label htmlFor="email" style={modern2025Styles.label}>
                メールアドレス
              </label>
              <input
                type="email"
                id="email"
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
                onMouseEnter={() => setHoveredField('email')}
                onMouseLeave={() => setHoveredField(null)}
                style={getFieldStyle('email')}
                placeholder="example@gmail.com"
                autoComplete="email"
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
                value={formData.password}
                onChange={handleChange}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                onMouseEnter={() => setHoveredField('password')}
                onMouseLeave={() => setHoveredField(null)}
                style={getFieldStyle('password')}
                placeholder="8文字以上（大文字・小文字・数字を含む）"
                autoComplete="new-password"
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" style={modern2025Styles.label}>
                パスワード（確認）
              </label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                required
                value={formData.confirmPassword}
                onChange={handleChange}
                onFocus={() => setFocusedField('confirmPassword')}
                onBlur={() => setFocusedField(null)}
                onMouseEnter={() => setHoveredField('confirmPassword')}
                onMouseLeave={() => setHoveredField(null)}
                style={getFieldStyle('confirmPassword')}
                placeholder="パスワードを再入力"
              />
            </div>

            <button
              type="submit"
              style={{
                ...modern2025Styles.button.primary,
                ...(buttonHovered ? modern2025Styles.button.primaryHover : {}),
                opacity: loading || !!success ? 0.7 : 1,
                cursor: loading || !!success ? 'not-allowed' : 'pointer',
                marginTop: '8px',
              }}
              onMouseEnter={() => !loading && !success && setButtonHovered(true)}
              onMouseLeave={() => setButtonHovered(false)}
              disabled={loading || !!success}
            >
              {loading ? '登録中...' : '登録する'}
            </button>

            <div style={linkContainerStyle}>
              <span style={{ color: modern2025Styles.colors.text.secondary }}>
                既にアカウントをお持ちですか？{' '}
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
          </form>
        </div>
      </div>
    </>
  );
}