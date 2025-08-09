'use client';

import { useState } from 'react';

export default function TestEmailPage() {
  const [email, setEmail] = useState('one.photolife@gmail.com');
  const [template, setTemplate] = useState('welcome');
  const [userName, setUserName] = useState('テストユーザー');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<any>(null);

  const sendTestEmail = async () => {
    setSending(true);
    setResult(null);

    try {
      const data: any = {
        userName,
      };

      // Add template-specific fields
      switch (template) {
        case 'verification':
          data.verificationUrl = 'http://localhost:3000/verify?token=test123';
          data.verificationCode = '123456';
          break;
        case 'password-reset':
          data.resetUrl = 'http://localhost:3000/reset?token=test123';
          data.resetCode = '987654';
          data.expiresIn = '1時間';
          break;
        case 'welcome':
          data.loginUrl = 'http://localhost:3000/login';
          data.features = [
            '✨ リアルタイムチャット',
            '📊 分析ダッシュボード',
            '🔒 セキュアな環境',
          ];
          break;
      }

      const response = await fetch('/api/email/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: email,
          template,
          data,
        }),
      });

      const result = await response.json();
      setResult(result);
    } catch (error) {
      setResult({ error: error.message });
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ padding: '40px', maxWidth: '600px', margin: '0 auto' }}>
      <h1>📧 メール送信テスト</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <label>
          <strong>送信先メールアドレス:</strong>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{
              width: '100%',
              padding: '8px',
              marginTop: '8px',
              border: '1px solid #ddd',
              borderRadius: '4px',
            }}
          />
        </label>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label>
          <strong>ユーザー名:</strong>
          <input
            type="text"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            style={{
              width: '100%',
              padding: '8px',
              marginTop: '8px',
              border: '1px solid #ddd',
              borderRadius: '4px',
            }}
          />
        </label>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label>
          <strong>テンプレート:</strong>
          <select
            value={template}
            onChange={(e) => setTemplate(e.target.value)}
            style={{
              width: '100%',
              padding: '8px',
              marginTop: '8px',
              border: '1px solid #ddd',
              borderRadius: '4px',
            }}
          >
            <option value="welcome">ウェルカムメール</option>
            <option value="verification">メール確認</option>
            <option value="password-reset">パスワードリセット</option>
          </select>
        </label>
      </div>

      <button
        onClick={sendTestEmail}
        disabled={sending || !email}
        style={{
          backgroundColor: sending ? '#ccc' : '#667eea',
          color: 'white',
          padding: '12px 24px',
          border: 'none',
          borderRadius: '4px',
          fontSize: '16px',
          cursor: sending ? 'not-allowed' : 'pointer',
          width: '100%',
        }}
      >
        {sending ? '送信中...' : 'テストメールを送信'}
      </button>

      {result && (
        <div
          style={{
            marginTop: '20px',
            padding: '16px',
            backgroundColor: result.success ? '#e6fffa' : '#fed7d7',
            border: `1px solid ${result.success ? '#38b2ac' : '#fc8181'}`,
            borderRadius: '4px',
          }}
        >
          <h3>{result.success ? '✅ 送信成功' : '❌ エラー'}</h3>
          <pre style={{ fontSize: '12px', overflow: 'auto' }}>
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}

      <div style={{ marginTop: '40px', padding: '20px', backgroundColor: '#f7fafc', borderRadius: '8px' }}>
        <h3>📝 注意事項</h3>
        <ul>
          <li>開発モードでは、実際のメールは送信されません（コンソールにログ出力）</li>
          <li>実際に送信するには、.env.localで <code>SEND_EMAILS=true</code> に設定してください</li>
          <li>現在の設定: <code>SEND_EMAILS={process.env.NEXT_PUBLIC_SEND_EMAILS || 'false'}</code></li>
        </ul>
      </div>
    </div>
  );
}