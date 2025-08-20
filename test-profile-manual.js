// プロフィール機能の手動確認手順

console.log(`
========================================
プロフィール機能の動作確認手順
========================================

1. ブラウザで http://localhost:3000/profile にアクセス

2. 以下の点を確認:
   
   ✅ エラーメッセージが表示されない
      - "useUser must be used within a UserProvider" エラーが出ない
      - 500エラーが発生しない
   
   ✅ ログインしていない場合
      - サインインページにリダイレクトされる
   
   ✅ ログインしている場合
      - プロフィールページが正常に表示される
      - アバターが表示される（イニシャル付き）
      - 名前フィールドが表示される
      - メールアドレスフィールドが表示される（読み取り専用）
      - 自己紹介フィールドが表示される
      - 編集ボタンが表示される

3. 編集機能の確認:
   
   ✅ 編集ボタンをクリック
      - フォームが編集可能になる
      - 保存ボタンとキャンセルボタンが表示される
   
   ✅ 名前と自己紹介を編集して保存
      - 成功メッセージが表示される
      - データが更新される
      - ヘッダーの名前も更新される

4. パスワード変更の確認:
   
   ✅ パスワード変更ボタンをクリック
      - ダイアログが表示される
      - 現在のパスワード、新しいパスワード、確認用パスワードの入力欄がある

========================================
修正内容の確認
========================================

✅ src/app/layout.tsx:
   - NoMuiProvidersからProvidersに変更済み
   - UserProviderが含まれている

✅ src/app/providers.tsx:
   - SessionProviderとUserProviderが正しくネストされている
   - MUIテーマプロバイダーも含まれている

✅ src/contexts/UserContext.tsx:
   - エラーハンドリングが改善されている
   - 404エラー時の処理が追加されている

これらの修正により、UserProviderエラーは解決されているはずです。

========================================
`);

// APIのテスト
const testAPI = async () => {
  console.log('APIエンドポイントのテスト...\n');
  
  try {
    const response = await fetch('http://localhost:3000/api/profile', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    console.log(`GET /api/profile: ${response.status} ${response.statusText}`);
    
    if (response.status === 401) {
      console.log('✅ 認証が必要です（正常）');
    } else if (response.status === 200) {
      const data = await response.json();
      console.log('✅ プロフィールデータ取得成功:', data);
    } else if (response.status === 500) {
      console.log('❌ サーバーエラーが発生しています');
      const text = await response.text();
      console.log('エラー内容:', text);
    }
  } catch (error) {
    console.error('APIテストエラー:', error.message);
  }
};

// 実行
if (typeof window === 'undefined') {
  testAPI();
}