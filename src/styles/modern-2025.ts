// 2025年最新デザインスタイル定義
export const modern2025Styles = {
  // カラーパレット - ニューモーフィズムとグラスモーフィズムの融合
  colors: {
    primary: '#6366f1', // Modern Indigo
    primaryDark: '#4f46e5',
    primaryLight: '#818cf8',
    secondary: '#ec4899', // Vibrant Pink
    background: '#f8fafc',
    surface: '#ffffff',
    text: {
      primary: '#0f172a', // 濃い黒に近い色（可読性最大）
      secondary: '#475569',
      disabled: '#94a3b8',
      input: '#000000', // 入力フィールドは純黒
    },
    border: '#e2e8f0',
    error: '#ef4444',
    success: '#10b981',
    warning: '#f59e0b',
    info: '#3b82f6',
  },

  // 入力フィールドスタイル - 2025年トレンド
  input: {
    base: {
      width: '100%',
      padding: '14px 16px',
      fontSize: '16px',
      fontWeight: '500',
      color: '#000000', // 黒色で可読性向上
      backgroundColor: '#ffffff',
      border: '2px solid transparent',
      borderRadius: '12px',
      outline: 'none',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05), inset 0 1px 2px rgba(0, 0, 0, 0.02)',
    },
    focus: {
      borderColor: '#6366f1',
      backgroundColor: '#ffffff',
      boxShadow: '0 0 0 4px rgba(99, 102, 241, 0.1), 0 1px 3px rgba(0, 0, 0, 0.05)',
      transform: 'translateY(-1px)',
    },
    hover: {
      borderColor: '#e2e8f0',
      backgroundColor: '#fafbfc',
    },
    placeholder: {
      color: '#94a3b8',
      fontWeight: '400',
    },
  },

  // ラベルスタイル
  label: {
    display: 'block',
    marginBottom: '6px',
    fontSize: '14px',
    fontWeight: '600',
    color: '#0f172a', // 濃い黒
    letterSpacing: '0.025em',
  },

  // ボタンスタイル - グラデーション＆シャドウ
  button: {
    primary: {
      padding: '14px 24px',
      fontSize: '16px',
      fontWeight: '600',
      color: '#ffffff',
      background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
      border: 'none',
      borderRadius: '12px',
      cursor: 'pointer',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      boxShadow: '0 4px 14px rgba(99, 102, 241, 0.25), 0 1px 3px rgba(0, 0, 0, 0.08)',
      letterSpacing: '0.025em',
    },
    primaryHover: {
      background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
      transform: 'translateY(-2px)',
      boxShadow: '0 6px 20px rgba(99, 102, 241, 0.35), 0 2px 4px rgba(0, 0, 0, 0.08)',
    },
    secondary: {
      padding: '14px 24px',
      fontSize: '16px',
      fontWeight: '600',
      color: '#6366f1',
      backgroundColor: '#ffffff',
      border: '2px solid #e2e8f0',
      borderRadius: '12px',
      cursor: 'pointer',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
    },
    secondaryHover: {
      backgroundColor: '#f8fafc',
      borderColor: '#6366f1',
      transform: 'translateY(-1px)',
      boxShadow: '0 4px 12px rgba(99, 102, 241, 0.15)',
    },
  },

  // カードスタイル - ソフトUI
  card: {
    backgroundColor: '#ffffff',
    borderRadius: '20px',
    padding: '40px',
    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.08), 0 2px 10px rgba(0, 0, 0, 0.04)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.7)',
  },

  // アラートスタイル
  alert: {
    success: {
      padding: '16px',
      borderRadius: '12px',
      backgroundColor: '#ecfdf5',
      color: '#065f46',
      border: '1px solid #86efac',
      fontSize: '15px',
      fontWeight: '500',
    },
    error: {
      padding: '16px',
      borderRadius: '12px',
      backgroundColor: '#fef2f2',
      color: '#991b1b',
      border: '1px solid #fca5a5',
      fontSize: '15px',
      fontWeight: '500',
    },
  },

  // アニメーション
  animations: {
    fadeIn: 'fadeIn 0.3s ease-in-out',
    slideUp: 'slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  },

  // レスポンシブブレークポイント
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
  },
};

// スタイル適用ヘルパー関数
export const getInputStyle = (isFocused: boolean = false, isHovered: boolean = false) => {
  const base = modern2025Styles.input.base;
  
  if (isFocused) {
    return {
      ...base,
      ...modern2025Styles.input.focus,
    };
  }
  
  if (isHovered) {
    return {
      ...base,
      ...modern2025Styles.input.hover,
    };
  }
  
  return base;
};

export const getButtonStyle = (variant: 'primary' | 'secondary' = 'primary', isHovered: boolean = false) => {
  if (variant === 'primary') {
    return isHovered 
      ? { ...modern2025Styles.button.primary, ...modern2025Styles.button.primaryHover }
      : modern2025Styles.button.primary;
  }
  
  return isHovered
    ? { ...modern2025Styles.button.secondary, ...modern2025Styles.button.secondaryHover }
    : modern2025Styles.button.secondary;
};