/**
 * JavaScript無効時のフォールバックコンテンツ
 * プログレッシブエンハンスメント対応
 */
export function NoScriptFallback() {
  return (
    <noscript>
      <style dangerouslySetInnerHTML={{
        __html: `
          .no-js-content {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            line-height: 1.6;
            color: #333;
            background: #f5f5f5;
            min-height: 100vh;
          }
          .no-js-header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            margin: -20px -20px 40px -20px;
            border-radius: 0 0 10px 10px;
          }
          .no-js-nav {
            background: #fff;
            padding: 15px 20px;
            margin: 20px -20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          .no-js-nav a {
            color: #667eea;
            text-decoration: none;
            margin-right: 20px;
            font-weight: 500;
          }
          .no-js-nav a:hover {
            text-decoration: underline;
          }
          .no-js-card {
            background: white;
            padding: 20px;
            margin: 20px 0;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          .no-js-button {
            background: #667eea;
            color: white;
            padding: 12px 24px;
            border: none;
            border-radius: 6px;
            text-decoration: none;
            display: inline-block;
            font-weight: 500;
            margin: 10px 10px 10px 0;
          }
          .no-js-button:hover {
            background: #5a67d8;
          }
          .no-js-alert {
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            color: #856404;
            padding: 15px;
            border-radius: 6px;
            margin: 20px 0;
          }
          .no-js-footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            text-align: center;
            color: #666;
            font-size: 14px;
          }
        `
      }} />
      
      <div className="no-js-content">
        <header className="no-js-header">
          <h1>🗣️ 会員制掲示板</h1>
          <p>安全で快適なコミュニティ空間</p>
        </header>

        <div className="no-js-alert">
          <strong>⚠️ JavaScript が無効になっています</strong><br/>
          より良い体験のために、ブラウザでJavaScriptを有効にしてください。
        </div>

        <nav className="no-js-nav" role="navigation" aria-label="メインナビゲーション">
          <a href="/login">ログイン</a>
          <a href="/register">新規登録</a>
          <a href="/about">サービスについて</a>
          <a href="/contact">お問い合わせ</a>
          <a href="/help">ヘルプ</a>
        </nav>

        <main>
          <div className="no-js-card">
            <h2>📋 掲示板機能</h2>
            <p>
              会員制掲示板では、登録ユーザー同士が安全にコミュニケーションを取ることができます。
              投稿の作成、閲覧、編集、削除などの機能をご利用いただけます。
            </p>
            <a href="/posts" className="no-js-button">投稿を見る</a>
            <a href="/login" className="no-js-button">ログイン</a>
          </div>

          <div className="no-js-card">
            <h2>🔐 セキュリティ</h2>
            <ul>
              <li>会員制による安全なコミュニティ</li>
              <li>入力内容の自動サニタイゼーション</li>
              <li>HTTPS暗号化通信</li>
              <li>定期的なセキュリティ監査</li>
            </ul>
          </div>

          <div className="no-js-card">
            <h2>📱 対応環境</h2>
            <p>
              <strong>推奨ブラウザ:</strong><br/>
              • Chrome (最新版)<br/>
              • Firefox (最新版)<br/>
              • Safari (最新版)<br/>
              • Edge (最新版)
            </p>
            <p>
              <strong>モバイル対応:</strong><br/>
              スマートフォンやタブレットでもご利用いただけます。
            </p>
          </div>

          <div className="no-js-card">
            <h2>📞 サポート</h2>
            <p>
              ご不明な点がございましたら、お気軽にお問い合わせください。
            </p>
            <a href="/contact" className="no-js-button">お問い合わせ</a>
            <a href="/help" className="no-js-button">ヘルプページ</a>
          </div>
        </main>

        <footer className="no-js-footer">
          <nav aria-label="フッターナビゲーション">
            <a href="/privacy">プライバシーポリシー</a> |
            <a href="/terms">利用規約</a> |
            <a href="/contact">お問い合わせ</a>
          </nav>
          <p>© 2025 会員制掲示板. All rights reserved.</p>
        </footer>
      </div>
    </noscript>
  );
}