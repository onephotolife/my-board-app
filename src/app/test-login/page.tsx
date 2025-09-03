'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useSession } from 'next-auth/react';

export default function TestLoginPage() {
  const { data: session, status } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    console.warn('🧪 テストログイン開始');
    
    const res = await signIn('credentials', {
      email,
      password,
      redirect: false,
    });
    
    console.warn('📊 ログイン結果:', res);
    setResult(res);
    setLoading(false);
    
    // セッション確認
    setTimeout(async () => {
      const sessionRes = await fetch('/api/debug/session');
      const sessionData = await sessionRes.json();
      console.warn('🔍 セッション状態:', sessionData);
    }, 1000);
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <h1>テストログインページ</h1>
      
      <div style={{ marginBottom: '20px', padding: '10px', backgroundColor: '#f0f0f0' }}>
        <h3>現在のセッション状態</h3>
        <pre>{JSON.stringify({ status, session }, null, 2)}</pre>
      </div>
      
      <div style={{ marginBottom: '20px' }}>
        <input
          type="email"
          placeholder="メールアドレス"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ width: '100%', padding: '10px', marginBottom: '10px' }}
        />
        <input
          type="password"
          placeholder="パスワード"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ width: '100%', padding: '10px', marginBottom: '10px' }}
        />
        <button
          onClick={handleLogin}
          disabled={loading}
          style={{
            width: '100%',
            padding: '10px',
            backgroundColor: loading ? '#ccc' : '#007bff',
            color: 'white',
            border: 'none',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? 'ログイン中...' : 'ログイン'}
        </button>
      </div>
      
      {result && (
        <div style={{ marginBottom: '20px', padding: '10px', backgroundColor: result.ok ? '#d4edda' : '#f8d7da' }}>
          <h3>ログイン結果</h3>
          <pre>{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
      
      <div style={{ marginTop: '20px' }}>
        <h3>デバッグリンク</h3>
        <ul>
          <li><a href="/api/debug/session" target="_blank">セッション状態確認</a></li>
          <li><a href="/dashboard">ダッシュボードへ</a></li>
          <li><a href="/auth/signin">通常のログインページへ</a></li>
        </ul>
      </div>
      
      <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#fff3cd' }}>
        <h3>テスト手順</h3>
        <ol>
          <li>メールアドレスとパスワードを入力</li>
          <li>ログインボタンをクリック</li>
          <li>コンソールログを確認（F12）</li>
          <li>セッション状態を確認</li>
          <li>ダッシュボードへアクセス可能か確認</li>
        </ol>
      </div>
    </div>
  );
}