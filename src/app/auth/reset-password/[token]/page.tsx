'use client';

import { useState, useEffect, Suspense, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { modern2025Styles } from '@/styles/modern-2025';
import { 
  validatePasswordStrength, 
  validatePasswordMatch,
  getPasswordStrengthConfig,
  type PasswordStrengthResult 
} from '@/lib/utils/passwordValidation';
import { generateSecurePassword, generatePasswordSuggestions } from '@/lib/utils/passwordGenerator';
import { PasswordEducation } from '@/components/PasswordEducation';

interface TokenValidation {
  valid: boolean;
  email?: string;
  error?: string;
  loading: boolean;
}

function PasswordResetForm() {
  const params = useParams();
  const token = params.token as string;

  const [mounted, setMounted] = useState(false);
  const [tokenValidation, setTokenValidation] = useState<TokenValidation>({ valid: false, loading: true });
  
  // Form state
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [hoveredField, setHoveredField] = useState<string | null>(null);
  const [buttonHovered, setButtonHovered] = useState(false);
  
  // Password strength state
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrengthResult | null>(null);
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  
  // リアルタイムバリデーション用の状態
  const [previousAttempts, setPreviousAttempts] = useState<string[]>([]);
  const [reuseWarning, setReuseWarning] = useState<string | null>(null);
  const [showPasswordGenerator, setShowPasswordGenerator] = useState(false);
  const [passwordSuggestions, setPasswordSuggestions] = useState<{ memorable: string[], strong: string[] } | null>(null);
  const debounceTimer = useRef<NodeJS.Timeout>();

  // Validate token on component mount
  useEffect(() => {
    const validateToken = async () => {
      if (!token || typeof token !== 'string') {
        setTokenValidation({ valid: false, error: '無効なリセットリンクです', loading: false });
        return;
      }

      try {
        const response = await fetch(`/api/auth/reset-password?token=${encodeURIComponent(token)}`);
        const data = await response.json();
        
        setTokenValidation({
          valid: data.valid,
          email: data.email,
          error: data.error,
          loading: false
        });
      } catch {
        setTokenValidation({ 
          valid: false, 
          error: 'サーバーエラーが発生しました。もう一度お試しください。', 
          loading: false 
        });
      }
    };

    validateToken();
    setMounted(true);
  }, [token]);

  // Real-time password strength validation
  useEffect(() => {
    if (password) {
      const strength = validatePasswordStrength(password);
      setPasswordStrength(strength);
      
      // 過去の失敗試行との比較（クライアント側のみ）
      if (previousAttempts.includes(password)) {
        setReuseWarning('⚠️ このパスワードは先ほど拒否されました。別のパスワードを入力してください。');
      } else {
        setReuseWarning(null);
      }
    } else {
      setPasswordStrength(null);
      setReuseWarning(null);
    }
  }, [password, previousAttempts]);

  // Real-time password confirmation validation
  useEffect(() => {
    if (confirmPassword) {
      const validation = validatePasswordMatch(password, confirmPassword);
      setConfirmPasswordError(validation.error || '');
    } else {
      setConfirmPasswordError('');
    }
  }, [password, confirmPassword]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Frontend validation
    if (!passwordStrength?.isValid) {
      setError('パスワードの強度が不十分です。要件をすべて満たすパスワードを入力してください。');
      setLoading(false);
      return;
    }

    const confirmValidation = validatePasswordMatch(password, confirmPassword);
    if (!confirmValidation.isValid) {
      setError(confirmValidation.error!);
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          password,
          confirmPassword,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        // Clear sensitive data
        setPassword('');
        setConfirmPassword('');
      } else {
        // Error Handling Expert: Handle different error types
        switch (data.type) {
          case 'RATE_LIMIT_EXCEEDED':
            setError(data.error);
            break;
          case 'VALIDATION_ERROR':
            setError(data.error);
            break;
          case 'INVALID_TOKEN':
            setError('パスワードリセットトークンが無効または期限切れです。新しいリセットリンクを要求してください。');
            break;
          case 'WEAK_PASSWORD':
            setError(`パスワードの強度が不十分です: ${data.error}`);
            break;
          case 'PASSWORD_REUSED':
            // 失敗したパスワードを記憶（次回の入力時に警告表示用）
            if (!previousAttempts.includes(password)) {
              setPreviousAttempts(prev => [...prev, password]);
            }
            setError(
              <div style={{ marginTop: '10px' }}>
                <strong>⚠️ このパスワードは使用できません</strong>
                <p style={{ margin: '10px 0', fontSize: '14px' }}>
                  {data.message}
                </p>
                {data.details && (
                  <details style={{ marginTop: '10px', fontSize: '13px', color: '#666' }}>
                    <summary style={{ cursor: 'pointer', marginBottom: '5px' }}>詳細情報</summary>
                    <p style={{ marginTop: '5px' }}>{data.details.reason}</p>
                    <p style={{ marginTop: '5px' }}>{data.details.suggestion}</p>
                  </details>
                )}
                <button
                  onClick={() => {
                    setShowPasswordGenerator(true);
                    setPasswordSuggestions(generatePasswordSuggestions(3));
                  }}
                  style={{
                    marginTop: '10px',
                    padding: '8px 16px',
                    backgroundColor: '#4CAF50',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  パスワード生成ツールを使用
                </button>
              </div>
            );
            break;
          case 'USER_NOT_FOUND':
            setError('ユーザーが見つかりません。サポートにお問い合わせください。');
            break;
          default:
            setError(data.error || 'パスワードのリセットに失敗しました。もう一度お試しください。');
        }
      }
    } catch {
      setError('ネットワークエラーが発生しました。しばらく時間をおいて再試行してください。');
    } finally {
      setLoading(false);
    }
  };

  const getFieldStyle = useCallback((fieldName: string) => {
    const isFocused = focusedField === fieldName;
    const isHovered = hoveredField === fieldName;
    
    let style = { ...modern2025Styles.input.base };
    
    if (isFocused) {
      style = { ...style, ...modern2025Styles.input.focus };
    } else if (isHovered) {
      style = { ...style, ...modern2025Styles.input.hover };
    }
    
    return style;
  }, [focusedField, hoveredField]);

  const containerStyle: React.CSSProperties = {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
  };

  const formContainerStyle: React.CSSProperties = {
    maxWidth: '480px',
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

  if (!mounted || tokenValidation.loading) {
    return (
      <div style={containerStyle}>
        <div style={{ ...modern2025Styles.card, ...formContainerStyle }}>
          <h1 style={titleStyle}>パスワードリセット</h1>
          <p style={subtitleStyle}>トークンを検証中...</p>
          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <div style={{ 
              width: '40px', 
              height: '40px', 
              border: '4px solid #f3f4f6',
              borderTopColor: modern2025Styles.colors.primary,
              borderRadius: '50%',
              margin: '0 auto',
              animation: 'spin 1s linear infinite'
            }} />
          </div>
        </div>
      </div>
    );
  }

  if (!tokenValidation.valid) {
    return (
      <div style={containerStyle}>
        <div style={{ 
          ...modern2025Styles.card, 
          ...formContainerStyle,
          textAlign: 'center'
        }}>
          {/* Error Icon */}
          <div style={{
            width: '64px',
            height: '64px',
            backgroundColor: modern2025Styles.colors.error,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px'
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" style={{ color: 'white' }}>
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={3}
                stroke="currentColor"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>

          <h1 style={{
            ...titleStyle,
            color: modern2025Styles.colors.error,
            marginBottom: '16px'
          }}>
            無効なリンク
          </h1>
          
          <p style={{
            ...subtitleStyle,
            marginBottom: '24px',
            color: modern2025Styles.colors.text.primary
          }}>
            {tokenValidation.error || 'このパスワードリセットリンクは無効または期限切れです。'}
          </p>

          <Link
            href="/auth/reset-password"
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
            新しいリセットリンクを要求
          </Link>

          <div style={{ textAlign: 'center', marginTop: '16px' }}>
            <Link 
              href="/auth/signin"
              style={{
                color: modern2025Styles.colors.primary,
                textDecoration: 'none',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              ログインページに戻る
            </Link>
          </div>
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
              backgroundColor: modern2025Styles.colors.success,
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
              パスワードリセット完了
            </h1>
            
            <p style={{
              ...subtitleStyle,
              marginBottom: '24px',
              color: modern2025Styles.colors.text.primary
            }}>
              パスワードが正常にリセットされました。
              <br />
              新しいパスワードでログインしてください。
            </p>

            <Link
              href="/auth/signin"
              style={{
                ...modern2025Styles.button.primary,
                ...(buttonHovered ? modern2025Styles.button.primaryHover : {}),
                display: 'inline-block',
                textDecoration: 'none',
              }}
              onMouseEnter={() => setButtonHovered(true)}
              onMouseLeave={() => setButtonHovered(false)}
            >
              ログインページへ
            </Link>
          </div>
        </div>
      </>
    );
  }

  const strengthConfig = passwordStrength ? getPasswordStrengthConfig(passwordStrength) : null;

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
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
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
          {/* Lock Icon */}
          <div style={{
            width: '48px',
            height: '48px',
            backgroundColor: modern2025Styles.colors.success,
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
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>

          <h1 style={titleStyle}>新しいパスワード</h1>
          <p style={subtitleStyle}>
            {tokenValidation.email && `${tokenValidation.email} の`}新しいパスワードを設定してください
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
            {/* Password Field */}
            <div>
              <label htmlFor="password" style={modern2025Styles.label}>
                新しいパスワード
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  onMouseEnter={() => setHoveredField('password')}
                  onMouseLeave={() => setHoveredField(null)}
                  style={{
                    ...getFieldStyle('password'),
                    paddingRight: '48px'
                  }}
                  placeholder="強力なパスワードを入力"
                  autoComplete="new-password"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: modern2025Styles.colors.text.secondary,
                    padding: '4px'
                  }}
                  tabIndex={-1}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2}
                      stroke="currentColor"
                      d={showPassword ? "M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" : "M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"}
                    />
                  </svg>
                </button>
              </div>
              
              {/* Password Strength Indicator */}
              {passwordStrength && strengthConfig && (
                <div style={{ marginTop: '8px' }}>
                  <div style={{
                    width: '100%',
                    height: '4px',
                    backgroundColor: '#e5e7eb',
                    borderRadius: '2px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: `${strengthConfig.percentage}%`,
                      height: '100%',
                      backgroundColor: strengthConfig.color,
                      transition: 'all 0.3s ease'
                    }} />
                  </div>
                  <div style={{
                    marginTop: '4px',
                    fontSize: '12px',
                    color: strengthConfig.color,
                    fontWeight: '500'
                  }}>
                    {strengthConfig.label}
                  </div>
                  {passwordStrength.feedback.length > 0 && (
                    <div style={{
                      marginTop: '4px',
                      fontSize: '12px',
                      color: modern2025Styles.colors.text.secondary
                    }}>
                      {passwordStrength.feedback.filter(f => !f.startsWith('良好')).slice(0, 2).join('、')}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* リアルタイム警告メッセージ */}
            {reuseWarning && (
              <div style={{
                padding: '12px',
                backgroundColor: '#FFF3CD',
                border: '1px solid #FFC107',
                borderRadius: '8px',
                marginTop: '12px',
                animation: 'slideUp 0.3s ease-out'
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                  <span style={{ fontSize: '18px' }}>⚠️</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontSize: '14px', color: '#856404' }}>{reuseWarning}</p>
                    <button
                      type="button"
                      onClick={() => {
                        setShowPasswordGenerator(true);
                        setPasswordSuggestions(generatePasswordSuggestions(3));
                      }}
                      style={{
                        marginTop: '8px',
                        padding: '6px 12px',
                        backgroundColor: '#FFC107',
                        color: '#000',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: '500'
                      }}
                    >
                      パスワード生成ツールを使用
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* パスワード生成ツール */}
            {showPasswordGenerator && passwordSuggestions && (
              <div style={{
                padding: '16px',
                backgroundColor: '#F0F9FF',
                border: '1px solid #3B82F6',
                borderRadius: '8px',
                marginTop: '12px',
                animation: 'slideUp 0.3s ease-out'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h4 style={{ margin: 0, fontSize: '16px', color: '#1E40AF' }}>🔐 パスワード候補</h4>
                  <button
                    type="button"
                    onClick={() => setShowPasswordGenerator(false)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '20px',
                      color: '#6B7280'
                    }}
                  >
                    ×
                  </button>
                </div>
                
                <div style={{ marginBottom: '12px' }}>
                  <p style={{ fontSize: '13px', color: '#4B5563', marginBottom: '8px' }}>覚えやすいパスワード:</p>
                  {passwordSuggestions.memorable.map((pwd, idx) => (
                    <div key={`memorable-${idx}`} style={{ marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <code style={{
                        flex: 1,
                        padding: '8px',
                        backgroundColor: 'white',
                        border: '1px solid #D1D5DB',
                        borderRadius: '4px',
                        fontSize: '13px',
                        fontFamily: 'monospace'
                      }}>{pwd}</code>
                      <button
                        type="button"
                        onClick={() => {
                          setPassword(pwd);
                          setShowPasswordGenerator(false);
                        }}
                        style={{
                          padding: '6px 10px',
                          backgroundColor: '#3B82F6',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        使用
                      </button>
                    </div>
                  ))}
                </div>
                
                <div>
                  <p style={{ fontSize: '13px', color: '#4B5563', marginBottom: '8px' }}>強力なランダムパスワード:</p>
                  {passwordSuggestions.strong.map((pwd, idx) => (
                    <div key={`strong-${idx}`} style={{ marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <code style={{
                        flex: 1,
                        padding: '8px',
                        backgroundColor: 'white',
                        border: '1px solid #D1D5DB',
                        borderRadius: '4px',
                        fontSize: '13px',
                        fontFamily: 'monospace'
                      }}>{pwd}</code>
                      <button
                        type="button"
                        onClick={() => {
                          setPassword(pwd);
                          setShowPasswordGenerator(false);
                        }}
                        style={{
                          padding: '6px 10px',
                          backgroundColor: '#3B82F6',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        使用
                      </button>
                    </div>
                  ))}
                </div>
                
                <button
                  type="button"
                  onClick={() => setPasswordSuggestions(generatePasswordSuggestions(3))}
                  style={{
                    marginTop: '12px',
                    width: '100%',
                    padding: '8px',
                    backgroundColor: 'white',
                    color: '#3B82F6',
                    border: '1px solid #3B82F6',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: '500'
                  }}
                >
                  🔄 他の候補を生成
                </button>
              </div>
            )}

            {/* ユーザー教育コンポーネント */}
            <PasswordEducation />

            {/* Confirm Password Field */}
            <div>
              <label htmlFor="confirmPassword" style={modern2025Styles.label}>
                パスワード確認
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  id="confirmPassword"
                  name="confirmPassword"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onFocus={() => setFocusedField('confirmPassword')}
                  onBlur={() => setFocusedField(null)}
                  onMouseEnter={() => setHoveredField('confirmPassword')}
                  onMouseLeave={() => setHoveredField(null)}
                  style={{
                    ...getFieldStyle('confirmPassword'),
                    paddingRight: '48px',
                    borderColor: confirmPasswordError ? modern2025Styles.colors.error : undefined
                  }}
                  placeholder="パスワードを再入力"
                  autoComplete="new-password"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: modern2025Styles.colors.text.secondary,
                    padding: '4px'
                  }}
                  tabIndex={-1}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2}
                      stroke="currentColor"
                      d={showConfirmPassword ? "M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" : "M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"}
                    />
                  </svg>
                </button>
              </div>
              {confirmPasswordError && (
                <div style={{
                  marginTop: '4px',
                  fontSize: '12px',
                  color: modern2025Styles.colors.error
                }}>
                  {confirmPasswordError}
                </div>
              )}
            </div>

            <button
              type="submit"
              style={{
                ...modern2025Styles.button.primary,
                ...(buttonHovered ? modern2025Styles.button.primaryHover : {}),
                opacity: loading || !passwordStrength?.isValid || !!confirmPasswordError ? 0.7 : 1,
                cursor: loading || !passwordStrength?.isValid || !!confirmPasswordError ? 'not-allowed' : 'pointer',
                marginTop: '8px',
              }}
              onMouseEnter={() => !loading && passwordStrength?.isValid && !confirmPasswordError && setButtonHovered(true)}
              onMouseLeave={() => setButtonHovered(false)}
              disabled={loading || !passwordStrength?.isValid || !!confirmPasswordError}
            >
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ animation: 'spin 1s linear infinite' }}>
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" strokeOpacity="0.3"/>
                    <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                  </svg>
                  更新中...
                </span>
              ) : (
                'パスワードをリセット'
              )}
            </button>

            <div style={{ textAlign: 'center', marginTop: '16px' }}>
              <Link 
                href="/auth/signin"
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
                ログインページに戻る
              </Link>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

export default function PasswordResetPage() {
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
      <PasswordResetForm />
    </Suspense>
  );
}