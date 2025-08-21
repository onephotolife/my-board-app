/**
 * 天才14人会議による完璧なエラー表示コンポーネント
 * 
 * 専門家チーム統合:
 * - フロントエンド専門家: モダンなUI/UX設計
 * - アクセシビリティ専門家: スクリーンリーダー・キーボード対応
 * - モバイル専門家: レスポンシブデザイン
 * - UXライター: わかりやすいメッセージ
 * - デバッグ専門家: 詳細情報の適切な表示
 */

'use client';

import React, { useState, useEffect } from 'react';

import { ERROR_MESSAGES, ErrorType, ErrorDetails, DetailedError } from '@/lib/utils/errorMessages';
import { modern2025Styles } from '@/styles/modern-2025';

export interface ErrorDisplayProps {
  /** エラータイプ */
  errorType: ErrorType;
  /** 追加のエラー情報 */
  additionalInfo?: {
    message?: string;
    context?: Record<string, any>;
    timestamp?: string;
    errorId?: string;
  };
  /** エラーを閉じる時の処理 */
  onClose?: () => void;
  /** リトライボタンクリック時の処理 */
  onRetry?: () => void;
  /** カスタムアクション */
  customActions?: Array<{
    label: string;
    action: () => void;
    variant?: 'primary' | 'secondary';
  }>;
  /** 表示サイズ */
  size?: 'small' | 'medium' | 'large';
  /** インライン表示（コンパクト） */
  inline?: boolean;
  /** 自動非表示の無効化 */
  disableAutoHide?: boolean;
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  errorType,
  additionalInfo,
  onClose,
  onRetry,
  customActions = [],
  size = 'medium',
  inline = false,
  disableAutoHide = false
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [showDetails, setShowDetails] = useState(false);
  const [mounted, setMounted] = useState(false);

  const errorDetails = ERROR_MESSAGES[errorType] || ERROR_MESSAGES.UNKNOWN;

  useEffect(() => {
    setMounted(true);
    
    // アクセシビリティ専門家: スクリーンリーダーへのアナウンス
    if (errorDetails.accessibility.announceText) {
      const announcement = document.createElement('div');
      announcement.setAttribute('aria-live', 'assertive');
      announcement.setAttribute('aria-atomic', 'true');
      announcement.textContent = errorDetails.accessibility.announceText;
      announcement.style.position = 'absolute';
      announcement.style.left = '-10000px';
      announcement.style.width = '1px';
      announcement.style.height = '1px';
      announcement.style.overflow = 'hidden';
      
      document.body.appendChild(announcement);
      
      setTimeout(() => {
        document.body.removeChild(announcement);
      }, 1000);
    }
    
    // 自動非表示機能
    if (!disableAutoHide && errorDetails.ui.autoHide) {
      const timer = setTimeout(() => {
        handleClose();
      }, errorDetails.ui.autoHide);
      
      return () => clearTimeout(timer);
    }
  }, [errorType, disableAutoHide, errorDetails.ui.autoHide]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      onClose?.();
    }, 300); // アニメーション後に実行
  };

  const handleRetry = () => {
    onRetry?.();
  };

  if (!mounted || !isVisible) {
    return null;
  }

  // スタイル計算
  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          padding: '12px 16px',
          fontSize: '14px',
          borderRadius: '8px'
        };
      case 'large':
        return {
          padding: '24px 32px',
          fontSize: '16px',
          borderRadius: '16px'
        };
      default:
        return {
          padding: '16px 20px',
          fontSize: '15px',
          borderRadius: '12px'
        };
    }
  };

  const getColorStyles = () => {
    switch (errorDetails.ui.color) {
      case 'error':
        return {
          backgroundColor: '#fef2f2',
          borderColor: '#fca5a5',
          iconColor: '#dc2626',
          textColor: '#991b1b'
        };
      case 'warning':
        return {
          backgroundColor: '#fffbeb',
          borderColor: '#fcd34d',
          iconColor: '#d97706',
          textColor: '#92400e'
        };
      case 'info':
        return {
          backgroundColor: '#eff6ff',
          borderColor: '#93c5fd',
          iconColor: '#2563eb',
          textColor: '#1e40af'
        };
      default:
        return {
          backgroundColor: '#fef2f2',
          borderColor: '#fca5a5',
          iconColor: '#dc2626',
          textColor: '#991b1b'
        };
    }
  };

  const sizeStyles = getSizeStyles();
  const colorStyles = getColorStyles();

  const containerStyle: React.CSSProperties = {
    ...sizeStyles,
    backgroundColor: colorStyles.backgroundColor,
    border: `2px solid ${colorStyles.borderColor}`,
    color: colorStyles.textColor,
    fontWeight: '500',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
    animation: 'slideInFromTop 0.3s ease-out',
    position: 'relative',
    overflow: 'hidden',
    maxWidth: inline ? '100%' : '600px',
    margin: inline ? 0 : '0 auto',
  };

  const titleStyle: React.CSSProperties = {
    fontSize: size === 'small' ? '16px' : '18px',
    fontWeight: '700',
    marginBottom: '8px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: colorStyles.iconColor
  };

  const messageStyle: React.CSSProperties = {
    marginBottom: errorDetails.guidance.steps.length > 0 || customActions.length > 0 ? '16px' : '0',
    lineHeight: '1.5'
  };

  const actionsStyle: React.CSSProperties = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    marginTop: '16px',
    alignItems: 'center'
  };

  const buttonStyle: React.CSSProperties = {
    ...modern2025Styles.button.secondary,
    padding: size === 'small' ? '8px 12px' : '10px 16px',
    fontSize: size === 'small' ? '13px' : '14px',
    fontWeight: '600'
  };

  const primaryButtonStyle: React.CSSProperties = {
    ...modern2025Styles.button.primary,
    padding: size === 'small' ? '8px 12px' : '10px 16px',
    fontSize: size === 'small' ? '13px' : '14px'
  };

  return (
    <>
      <style jsx global>{`
        @keyframes slideInFromTop {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.05);
          }
        }
      `}
      </style>
      
      <div
        style={containerStyle}
        role={errorDetails.accessibility.role}
        aria-label={errorDetails.accessibility.ariaLabel}
        aria-live="polite"
      >
        {/* 閉じるボタン */}
        {onClose && (
          <button
            onClick={handleClose}
            style={{
              position: 'absolute',
              top: '8px',
              right: '8px',
              background: 'none',
              border: 'none',
              fontSize: '18px',
              cursor: 'pointer',
              color: colorStyles.iconColor,
              opacity: 0.6,
              transition: 'opacity 0.2s',
              padding: '4px',
              borderRadius: '4px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = '1';
              e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = '0.6';
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
            aria-label="エラーメッセージを閉じる"
          >
            ✕
          </button>
        )}

        {/* タイトルとアイコン */}
        {errorDetails.title && (
          <div style={titleStyle}>
            <span style={{ fontSize: size === 'small' ? '18px' : '20px' }}>
              {errorDetails.ui.icon}
            </span>
            {errorDetails.title}
          </div>
        )}

        {/* メインメッセージ */}
        <div style={messageStyle}>
          {additionalInfo?.message || errorDetails.message}
        </div>

        {/* ガイダンス手順 */}
        {errorDetails.guidance.steps.length > 0 && !inline && (
          <div style={{ marginBottom: '12px' }}>
            <div style={{ 
              fontWeight: '600', 
              marginBottom: '8px',
              color: colorStyles.iconColor
            }}
            >
              対処方法：
            </div>
            <ol style={{ 
              margin: '0', 
              paddingLeft: '20px',
              lineHeight: '1.6'
            }}
            >
              {errorDetails.guidance.steps.map((step, index) => (
                <li key={index} style={{ marginBottom: '4px' }}>
                  {step}
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* クイックフィックス */}
        {errorDetails.guidance.quickFix && !inline && (
          <div style={{
            backgroundColor: 'rgba(255, 255, 255, 0.7)',
            padding: '8px 12px',
            borderRadius: '8px',
            marginBottom: '12px',
            fontSize: '14px',
            fontWeight: '600',
            color: colorStyles.iconColor
          }}
          >
            💡 クイック解決: {errorDetails.guidance.quickFix}
          </div>
        )}

        {/* 詳細情報トグル */}
        {errorDetails.ui.showDetailsButton && !inline && (
          <button
            onClick={() => setShowDetails(!showDetails)}
            style={{
              background: 'none',
              border: 'none',
              color: colorStyles.iconColor,
              textDecoration: 'underline',
              cursor: 'pointer',
              fontSize: '14px',
              marginBottom: showDetails ? '12px' : '0',
              fontWeight: '500'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = '0.8';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = '1';
            }}
          >
            {showDetails ? '詳細を隠す ▲' : '詳細とトラブルシューティング ▼'}
          </button>
        )}

        {/* 詳細情報 */}
        {showDetails && !inline && (
          <div style={{
            backgroundColor: 'rgba(255, 255, 255, 0.5)',
            padding: '12px',
            borderRadius: '8px',
            marginBottom: '12px',
            fontSize: '14px',
            lineHeight: '1.5'
          }}
          >
            {/* トラブルシューティング */}
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontWeight: '600', marginBottom: '6px' }}>
                🔧 トラブルシューティング:
              </div>
              <ul style={{ margin: '0', paddingLeft: '18px' }}>
                {errorDetails.troubleshooting.checkpoints.map((checkpoint, index) => (
                  <li key={index} style={{ marginBottom: '2px' }}>
                    {checkpoint}
                  </li>
                ))}
              </ul>
            </div>

            {/* 予防策 */}
            {errorDetails.guidance.preventionTips && (
              <div>
                <div style={{ fontWeight: '600', marginBottom: '6px' }}>
                  🛡️ 今後の予防策:
                </div>
                <ul style={{ margin: '0', paddingLeft: '18px' }}>
                  {errorDetails.guidance.preventionTips.map((tip, index) => (
                    <li key={index} style={{ marginBottom: '2px' }}>
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* エラー情報 */}
            {(additionalInfo?.errorId || additionalInfo?.timestamp) && (
              <div style={{
                marginTop: '12px',
                padding: '8px',
                backgroundColor: 'rgba(0, 0, 0, 0.05)',
                borderRadius: '4px',
                fontSize: '12px',
                fontFamily: 'monospace'
              }}
              >
                {additionalInfo.errorId && (
                  <div>エラーID: {additionalInfo.errorId}</div>
                )}
                {additionalInfo.timestamp && (
                  <div>発生時刻: {new Date(additionalInfo.timestamp).toLocaleString('ja-JP')}</div>
                )}
              </div>
            )}
          </div>
        )}

        {/* アクションボタン群 */}
        <div style={actionsStyle}>
          {/* リトライボタン */}
          {errorDetails.ui.showRetryButton && onRetry && (
            <button
              onClick={handleRetry}
              style={primaryButtonStyle}
              onMouseEnter={(e) => {
                Object.assign(e.currentTarget.style, modern2025Styles.button.primaryHover);
              }}
              onMouseLeave={(e) => {
                Object.assign(e.currentTarget.style, primaryButtonStyle);
              }}
            >
              🔄 再試行
            </button>
          )}

          {/* カスタムアクション */}
          {customActions.map((action, index) => (
            <button
              key={index}
              onClick={action.action}
              style={action.variant === 'primary' ? primaryButtonStyle : buttonStyle}
              onMouseEnter={(e) => {
                if (action.variant === 'primary') {
                  Object.assign(e.currentTarget.style, modern2025Styles.button.primaryHover);
                } else {
                  Object.assign(e.currentTarget.style, modern2025Styles.button.secondaryHover);
                }
              }}
              onMouseLeave={(e) => {
                Object.assign(e.currentTarget.style, action.variant === 'primary' ? primaryButtonStyle : buttonStyle);
              }}
            >
              {action.label}
            </button>
          ))}

          {/* ヘルプリンク */}
          {errorDetails.support.helpUrl && !inline && (
            <a
              href={errorDetails.support.helpUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                ...buttonStyle,
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
              onMouseEnter={(e) => {
                Object.assign(e.currentTarget.style, modern2025Styles.button.secondaryHover);
              }}
              onMouseLeave={(e) => {
                Object.assign(e.currentTarget.style, buttonStyle);
              }}
            >
              📖 ヘルプを見る
            </a>
          )}

          {/* サポートチャット */}
          {errorDetails.support.chatAvailable && errorDetails.support.showContactInfo && (
            <button
              onClick={() => {
                // サポートチャット起動の処理
                console.log('サポートチャット起動');
              }}
              style={{
                ...buttonStyle,
                backgroundColor: '#10b981',
                color: 'white',
                borderColor: '#10b981'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#059669';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#10b981';
              }}
            >
              💬 サポートに相談
            </button>
          )}
        </div>
      </div>
    </>
  );
};

export default ErrorDisplay;

/**
 * 軽量版エラー表示コンポーネント（通知用）
 */
export const ErrorToast: React.FC<{
  errorType: ErrorType;
  message?: string;
  onClose: () => void;
  duration?: number;
}> = ({ errorType, message, onClose, duration = 5000 }) => {
  const errorDetails = ERROR_MESSAGES[errorType] || ERROR_MESSAGES.UNKNOWN;
  
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  const colorStyles = (() => {
    switch (errorDetails.ui.color) {
      case 'error':
        return { bg: '#fee2e2', border: '#fca5a5', text: '#991b1b' };
      case 'warning':
        return { bg: '#fef3c7', border: '#fcd34d', text: '#92400e' };
      case 'info':
        return { bg: '#dbeafe', border: '#93c5fd', text: '#1e40af' };
      default:
        return { bg: '#fee2e2', border: '#fca5a5', text: '#991b1b' };
    }
  })();

  return (
    <div
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        backgroundColor: colorStyles.bg,
        border: `1px solid ${colorStyles.border}`,
        color: colorStyles.text,
        padding: '12px 16px',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        zIndex: 1000,
        maxWidth: '400px',
        animation: 'slideInFromRight 0.3s ease-out',
        fontSize: '14px',
        fontWeight: '500'
      }}
      role="alert"
      aria-live="polite"
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
        <span style={{ fontSize: '16px' }}>{errorDetails.ui.icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: '600', marginBottom: '2px' }}>
            {errorDetails.title}
          </div>
          <div>{message || errorDetails.message}</div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '16px',
            opacity: 0.6,
            padding: '2px'
          }}
          onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
          onMouseLeave={(e) => e.currentTarget.style.opacity = '0.6'}
        >
          ✕
        </button>
      </div>
      
      <style jsx global>{`
        @keyframes slideInFromRight {
          from {
            opacity: 0;
            transform: translateX(100%);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}
      </style>
    </div>
  );
};