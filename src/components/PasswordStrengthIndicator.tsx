'use client';

import React, { useEffect, useState } from 'react';

import { checkPasswordStrength, getStrengthLabel, getStrengthColor, PasswordStrength, PasswordStrengthResult } from '@/lib/utils/password-validation';

interface PasswordStrengthIndicatorProps {
  password: string;
  userInputs?: string[];
  showFeedback?: boolean;
  onStrengthChange?: (result: PasswordStrengthResult) => void;
}

export default function PasswordStrengthIndicator({
  password,
  userInputs = [],
  showFeedback = true,
  onStrengthChange,
}: PasswordStrengthIndicatorProps) {
  const [strengthResult, setStrengthResult] = useState<PasswordStrengthResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!password) {
      setStrengthResult(null);
      return;
    }

    const checkStrength = async () => {
      setLoading(true);
      try {
        const result = await checkPasswordStrength(password, userInputs);
        setStrengthResult(result);
        onStrengthChange?.(result);
      } catch (error) {
        console.error('Password strength check error:', error);
      } finally {
        setLoading(false);
      }
    };

    // デバウンス処理
    const timer = setTimeout(checkStrength, 300);
    return () => clearTimeout(timer);
  }, [password, userInputs, onStrengthChange]);

  if (!password || loading) {
    return null;
  }

  if (!strengthResult) {
    return null;
  }

  const { score, feedback, crackTime, errors } = strengthResult;
  const label = getStrengthLabel(score);
  const color = getStrengthColor(score);
  const percentage = ((score + 1) / 5) * 100;

  return (
    <div style={{ marginTop: '12px' }}>
      {/* 強度バー */}
      <div style={{ marginBottom: '8px' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '4px',
        }}
        >
          <span style={{ fontSize: '12px', color: '#64748b' }}>パスワード強度</span>
          <span style={{ fontSize: '12px', fontWeight: 'bold', color }}>
            {label}
          </span>
        </div>
        
        <div style={{
          height: '6px',
          backgroundColor: '#e2e8f0',
          borderRadius: '3px',
          overflow: 'hidden',
        }}
        >
          <div
            style={{
              height: '100%',
              width: `${percentage}%`,
              backgroundColor: color,
              transition: 'all 0.3s ease',
              borderRadius: '3px',
            }}
          />
        </div>

        {/* 強度インジケーター */}
        <div style={{
          display: 'flex',
          gap: '4px',
          marginTop: '4px',
        }}
        >
          {[0, 1, 2, 3, 4].map((level) => (
            <div
              key={level}
              style={{
                flex: 1,
                height: '4px',
                backgroundColor: level <= score ? color : '#e2e8f0',
                borderRadius: '2px',
                transition: 'all 0.3s ease',
              }}
            />
          ))}
        </div>
      </div>

      {/* 解読時間 */}
      {crackTime && (
        <div style={{
          fontSize: '11px',
          color: '#94a3b8',
          marginBottom: '8px',
        }}
        >
          推定解読時間: <strong>{crackTime}</strong>
        </div>
      )}

      {/* エラーメッセージ */}
      {errors.length > 0 && (
        <div style={{
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '6px',
          padding: '8px 12px',
          marginBottom: '8px',
        }}
        >
          {errors.map((error, index) => (
            <div key={index} style={{
              fontSize: '12px',
              color: '#dc2626',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '6px',
              marginBottom: index < errors.length - 1 ? '4px' : 0,
            }}
            >
              <span style={{ flexShrink: 0 }}>❌</span>
              <span>{error}</span>
            </div>
          ))}
        </div>
      )}

      {/* フィードバック */}
      {showFeedback && feedback && (
        <div style={{
          fontSize: '12px',
          color: '#64748b',
          lineHeight: '1.5',
        }}
        >
          {feedback.warning && (
            <div style={{
              backgroundColor: '#fef3c7',
              border: '1px solid #fcd34d',
              borderRadius: '6px',
              padding: '8px 12px',
              marginBottom: '8px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '6px',
            }}
            >
              <span style={{ flexShrink: 0 }}>⚠️</span>
              <span style={{ color: '#92400e' }}>{feedback.warning}</span>
            </div>
          )}
          
          {feedback.suggestions.length > 0 && (
            <div style={{
              backgroundColor: '#f0f9ff',
              border: '1px solid #bae6fd',
              borderRadius: '6px',
              padding: '8px 12px',
            }}
            >
              <div style={{ marginBottom: '4px', fontWeight: 'bold', color: '#0369a1' }}>
                💡 改善のヒント:
              </div>
              {feedback.suggestions.map((suggestion, index) => (
                <div key={index} style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '6px',
                  marginBottom: index < feedback.suggestions.length - 1 ? '4px' : 0,
                  color: '#0c4a6e',
                }}
                >
                  <span style={{ flexShrink: 0 }}>•</span>
                  <span>{suggestion}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* パスワード要件チェックリスト */}
      {password && (
        <div style={{
          marginTop: '12px',
          padding: '8px 12px',
          backgroundColor: '#f8fafc',
          borderRadius: '6px',
          fontSize: '11px',
        }}
        >
          <div style={{ marginBottom: '6px', fontWeight: 'bold', color: '#475569' }}>
            パスワード要件:
          </div>
          <div style={{ display: 'grid', gap: '4px' }}>
            <RequirementItem
              met={password.length >= 8}
              text="8文字以上"
            />
            <RequirementItem
              met={/[A-Z]/.test(password)}
              text="大文字を含む"
            />
            <RequirementItem
              met={/[a-z]/.test(password)}
              text="小文字を含む"
            />
            <RequirementItem
              met={/[0-9]/.test(password)}
              text="数字を含む"
            />
            <RequirementItem
              met={/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)}
              text="特殊文字を含む"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function RequirementItem({ met, text }: { met: boolean; text: string }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      color: met ? '#059669' : '#94a3b8',
    }}
    >
      <span style={{ fontSize: '14px' }}>
        {met ? '✅' : '⭕'}
      </span>
      <span style={{ textDecoration: met ? 'line-through' : 'none' }}>
        {text}
      </span>
    </div>
  );
}