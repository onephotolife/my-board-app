'use client';

import { useState } from 'react';

export default function CleanTestPage() {
  const [bio, setBio] = useState('');
  const [result, setResult] = useState('');

  const testUpdate = async () => {
    try {
      const response = await fetch('/api/profile-test', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'テストユーザー',
          bio: bio,
        }),
      });

      const data = await response.json();
      
      if (response.ok && data.debug) {
        setResult(`
          受信: "${data.debug.receivedBio}"
          保存: "${data.debug.savedBio}"
          更新: ${data.debug.updateResult?.modified ? '成功' : '失敗'}
        `);
      } else {
        setResult(`エラー: ${data.error || '不明'}`);
      }
    } catch (error) {
      setResult(`エラー: ${error.message}`);
    }
  };

  const clearAndReset = () => {
    setBio('');
    setResult('');
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <h1>クリーンなBioテスト</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <label htmlFor="bio-input">自己紹介:</label>
        <br />
        <textarea
          id="bio-input"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          style={{ 
            width: '100%', 
            height: '100px', 
            padding: '10px',
            fontSize: '16px',
            border: '1px solid #ccc'
          }}
          placeholder="ここに自己紹介を入力"
        />
      </div>
      
      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={testUpdate}
          style={{ 
            padding: '10px 20px', 
            marginRight: '10px',
            fontSize: '16px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          更新テスト
        </button>
        
        <button 
          onClick={clearAndReset}
          style={{ 
            padding: '10px 20px',
            fontSize: '16px',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          クリア
        </button>
      </div>
      
      {result && (
        <div style={{ 
          padding: '15px', 
          backgroundColor: '#f8f9fa',
          border: '1px solid #dee2e6',
          borderRadius: '4px',
          whiteSpace: 'pre-wrap'
        }}>
          <strong>結果:</strong>
          <br />
          {result}
        </div>
      )}
      
      <div style={{ 
        marginTop: '20px',
        padding: '10px',
        backgroundColor: '#e9ecef',
        borderRadius: '4px',
        fontSize: '14px'
      }}>
        <strong>現在の入力値:</strong> {bio.length}文字
        <br />
        "{bio}"
      </div>
    </div>
  );
}