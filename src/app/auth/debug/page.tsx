'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AuthDebugPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [logs, setLogs] = useState<any[]>([]);
  const [cookies, setCookies] = useState<string>('');
  const [sessionData, setSessionData] = useState<any>(null);

  useEffect(() => {
    // ローカルストレージからログを取得
    const authLogs = JSON.parse(localStorage.getItem('auth-debug-logs') || '[]');
    const sessionDebug = JSON.parse(localStorage.getItem('auth-session-debug') || '{}');
    setLogs(authLogs);
    
    // クッキー情報を取得
    setCookies(document.cookie);
    
    // セッション情報を取得
    fetchSessionData();
  }, []);
  
  const fetchSessionData = async () => {
    try {
      const response = await fetch('/api/auth/session');
      const data = await response.json();
      setSessionData(data);
    } catch (error) {
      console.error('Session fetch error:', error);
    }
  };
  
  const clearDebugData = () => {
    localStorage.removeItem('auth-debug-logs');
    localStorage.removeItem('auth-session-debug');
    sessionStorage.removeItem('load-count');
    sessionStorage.removeItem('stop-redirect');
    setLogs([]);
    alert('デバッグデータをクリアしました');
  };
  
  const testLogin = () => {
    router.push('/auth/signin?callbackUrl=%2Fdashboard');
  };
  
  const testProtectedPage = () => {
    router.push('/dashboard');
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>🔍 認証デバッグページ</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <button onClick={clearDebugData} style={{ marginRight: '10px', padding: '10px' }}>
          デバッグデータクリア
        </button>
        <button onClick={testLogin} style={{ marginRight: '10px', padding: '10px' }}>
          ログインテスト
        </button>
        <button onClick={testProtectedPage} style={{ padding: '10px' }}>
          保護ページテスト
        </button>
        <button onClick={() => window.location.reload()} style={{ marginLeft: '10px', padding: '10px' }}>
          リロード
        </button>
      </div>
      
      <div style={{ background: '#f0f0f0', padding: '15px', marginBottom: '20px' }}>
        <h2>📊 現在のセッション状態</h2>
        <pre>{JSON.stringify({
          status,
          session,
          timestamp: new Date().toISOString()
        }, null, 2)}
        </pre>
      </div>
      
      <div style={{ background: '#f5f5f5', padding: '15px', marginBottom: '20px' }}>
        <h2>🔐 API セッションデータ</h2>
        <pre>{JSON.stringify(sessionData, null, 2)}</pre>
      </div>
      
      <div style={{ background: '#fff0f0', padding: '15px', marginBottom: '20px' }}>
        <h2>🍪 クッキー情報</h2>
        <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
          {cookies.split('; ').map(c => {
            if (c.includes('next-auth')) {
              return `✅ ${c}\n`;
            }
            return `  ${c}\n`;
          }).join('')}
        </pre>
      </div>
      
      <div style={{ background: '#f0fff0', padding: '15px', marginBottom: '20px' }}>
        <h2>📝 認証ログ履歴（最新20件）</h2>
        {logs.length === 0 ? (
          <p>ログがありません</p>
        ) : (
          <div style={{ maxHeight: '400px', overflow: 'auto' }}>
            {logs.map((log, index) => (
              <div key={index} style={{ 
                borderBottom: '1px solid #ddd', 
                padding: '10px',
                background: log.message?.includes('INFINITE LOOP') ? '#ffcccc' : 'white'
              }}
              >
                <div style={{ color: '#666', fontSize: '12px' }}>
                  {log.timestamp}
                </div>
                <div style={{ fontWeight: 'bold', margin: '5px 0' }}>
                  {log.message}
                </div>
                {log.data && (
                  <pre style={{ fontSize: '12px', margin: 0 }}>
                    {JSON.stringify(log.data, null, 2)}
                  </pre>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      
      <div style={{ background: '#fffef0', padding: '15px' }}>
        <h2>🔧 環境情報</h2>
        <pre>{JSON.stringify({
          url: typeof window !== 'undefined' ? window.location.href : '',
          hostname: typeof window !== 'undefined' ? window.location.hostname : '',
          protocol: typeof window !== 'undefined' ? window.location.protocol : '',
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
          nodeEnv: process.env.NODE_ENV
        }, null, 2)}
        </pre>
      </div>
    </div>
  );
}