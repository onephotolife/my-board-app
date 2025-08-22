import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // クリーンアップページのHTMLを返す
  const html = `
    <!DOCTYPE html>
    <html lang="ja">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>認証データクリーンアップ</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          margin: 0;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        .container {
          background: white;
          padding: 2rem;
          border-radius: 12px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.1);
          max-width: 500px;
          text-align: center;
        }
        h1 {
          color: #333;
          margin-bottom: 1rem;
        }
        p {
          color: #666;
          margin-bottom: 2rem;
        }
        button {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 6px;
          font-size: 16px;
          cursor: pointer;
          transition: transform 0.2s;
        }
        button:hover {
          transform: scale(1.05);
        }
        .success {
          color: #10b981;
          margin-top: 1rem;
          display: none;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🔧 認証データクリーンアップ</h1>
        <p>リダイレクトの問題が発生している場合は、下のボタンをクリックしてブラウザの認証データをクリアしてください。</p>
        <button onclick="cleanup()">クリーンアップ実行</button>
        <div class="success" id="success">
          ✅ クリーンアップが完了しました！<br>
          3秒後にサインインページへリダイレクトします...
        </div>
      </div>
      
      <script>
        function cleanup() {
          // sessionStorageを完全にクリア
          sessionStorage.clear();
          
          // localStorageから認証関連のデータをクリア
          localStorage.removeItem('redirect-attempts');
          localStorage.removeItem('auth-session-debug');
          
          // 成功メッセージを表示
          document.getElementById('success').style.display = 'block';
          
          // 3秒後にサインインページへリダイレクト
          setTimeout(() => {
            window.location.href = '/auth/signin';
          }, 3000);
        }
      </script>
    </body>
    </html>
  `;
  
  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  });
}