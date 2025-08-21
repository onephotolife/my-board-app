'use client';

import React, { useState } from 'react';

export const PasswordEducation: React.FC = () => {
  const [showDetails, setShowDetails] = useState(false);
  
  return (
    <div style={{
      padding: '16px',
      backgroundColor: '#F3F4F6',
      borderRadius: '8px',
      marginTop: '16px',
      fontSize: '14px'
    }}
    >
      <h4 style={{
        margin: '0 0 12px 0',
        fontSize: '16px',
        fontWeight: '600',
        color: '#1F2937',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}
      >
        🔐 なぜ新しいパスワードが必要？
      </h4>
      
      <div style={{ color: '#4B5563' }}>
        <p style={{ margin: '0 0 8px 0' }}>
          パスワードの再利用は、以下のリスクがあります：
        </p>
        <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
          <li style={{ marginBottom: '6px' }}>
            <strong>⚠️ 過去に漏洩した可能性</strong>
            <br />
            <span style={{ fontSize: '12px', color: '#6B7280' }}>
              以前のパスワードが何らかの理由で流出している可能性があります
            </span>
          </li>
          <li style={{ marginBottom: '6px' }}>
            <strong>⚠️ 推測されやすくなる</strong>
            <br />
            <span style={{ fontSize: '12px', color: '#6B7280' }}>
              同じパスワードの繰り返し使用はパターンが読まれやすくなります
            </span>
          </li>
          <li style={{ marginBottom: '6px' }}>
            <strong>⚠️ セキュリティ基準違反</strong>
            <br />
            <span style={{ fontSize: '12px', color: '#6B7280' }}>
              多くのセキュリティ規格で禁止されている行為です
            </span>
          </li>
        </ul>
        
        <button
          onClick={() => setShowDetails(!showDetails)}
          style={{
            padding: '8px 16px',
            backgroundColor: 'transparent',
            color: '#3B82F6',
            border: '1px solid #3B82F6',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: '500',
            marginTop: '8px'
          }}
        >
          {showDetails ? '詳細を隠す' : 'もっと詳しく'}
        </button>
        
        {showDetails && (
          <div style={{
            marginTop: '12px',
            padding: '12px',
            backgroundColor: 'white',
            borderRadius: '6px',
            border: '1px solid #E5E7EB'
          }}
          >
            <h5 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: '600', color: '#1F2937' }}>
              セキュリティポリシーについて
            </h5>
            <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#4B5563' }}>
              当サービスでは、お客様のアカウントを保護するため、
              過去5回分のパスワードとは異なるものを設定していただく
              必要があります。これは以下の業界標準に準拠しています：
            </p>
            <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px', fontSize: '12px', color: '#6B7280' }}>
              <li>NIST SP 800-63B（米国標準技術研究所）</li>
              <li>PCI DSS（クレジットカード業界セキュリティ基準）</li>
              <li>ISO 27001（情報セキュリティマネジメント）</li>
            </ul>
            
            <div style={{
              marginTop: '12px',
              padding: '8px',
              backgroundColor: '#EFF6FF',
              borderRadius: '4px',
              border: '1px solid #BFDBFE'
            }}
            >
              <p style={{ margin: 0, fontSize: '12px', color: '#1E40AF' }}>
                💡 ヒント: パスワードマネージャーの使用を推奨します。
                複雑なパスワードを安全に管理でき、毎回異なる強力なパスワードを
                簡単に使用できます。
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};