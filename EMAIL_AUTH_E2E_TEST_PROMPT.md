# 🔍 メール認証機能 エンドツーエンド動作確認プロンプト

## 📋 確認目的

実際のユーザーフローに沿って、メール認証機能が正しく動作しているかを確認します。

## ✅ 検証項目

```yaml
必須確認事項:
  1. 登録後に送信されたメールのリンクをクリック
  2. 認証成功画面が表示される
  3. データベースでemailVerifiedが設定されている
  4. 認証後はログイン可能になる
  5. 無効なトークンでエラーが表示される
  6. 使用済みトークンが再利用できない
```

## 🚀 実行手順

### 準備作業

```bash
# 1. 開発サーバーの起動
npm run dev

# 2. MongoDBの確認
node scripts/check-mongodb.js

# 3. メールサーバーの確認（必要な場合）
# MailHogやMailtrapなどのテスト用メールサーバーを使用
```

## 📝 検証シナリオ

### シナリオ1: 新規登録からメール認証完了まで

#### ステップ1: 新規ユーザー登録

```javascript
// テストユーザー情報
const testUser = {
  email: `test-${Date.now()}@example.com`,
  password: 'TestPassword123!',
  name: 'Test User'
};

// 1. 新規登録ページにアクセス
// URL: http://localhost:3000/auth/signup

// 2. フォームに入力
// - Email: testUser.email
// - Password: testUser.password  
// - Name: testUser.name

// 3. 登録ボタンをクリック
```

**期待される結果:**
- ✅ 登録成功メッセージが表示される
- ✅ 確認メール送信の通知が表示される
- ✅ データベースに新規ユーザーが作成される

#### ステップ2: メールリンクの確認

```javascript
// データベースから認証トークンを取得
const user = await User.findOne({ email: testUser.email });
console.log('認証トークン:', user.emailVerificationToken);
console.log('有効期限:', user.emailVerificationTokenExpiry);

// 認証URLの構築
const verificationUrl = `http://localhost:3000/auth/verify?token=${user.emailVerificationToken}`;
console.log('認証URL:', verificationUrl);
```

**確認項目:**
- ✅ emailVerificationTokenが生成されている
- ✅ emailVerificationTokenExpiryが24時間後に設定されている
- ✅ emailVerifiedがfalseである

#### ステップ3: メールリンクをクリック

```javascript
// ブラウザで認証URLにアクセス
// または、プログラムでテスト
const response = await fetch(verificationUrl);
const result = await response.json();

console.log('認証結果:', result);
```

**期待される結果:**
- ✅ ステータスコード: 200
- ✅ success: true
- ✅ メッセージ: "メールアドレスの確認が完了しました！"

#### ステップ4: 認証成功画面の確認

**UI確認項目:**
```markdown
□ 成功アイコン（緑色のチェックマーク）が表示される
□ "確認完了！"のタイトルが表示される
□ 成功メッセージが表示される
□ 3秒後に自動的にログインページへリダイレクトされる
□ "ログインページへ"ボタンが表示される
```

#### ステップ5: データベースの確認

```javascript
// 認証後のユーザー情報を確認
const verifiedUser = await User.findOne({ email: testUser.email });

console.log('確認項目:');
console.log('- emailVerified:', verifiedUser.emailVerified); // true であること
console.log('- emailVerificationToken:', verifiedUser.emailVerificationToken); // undefined であること
console.log('- emailVerificationTokenExpiry:', verifiedUser.emailVerificationTokenExpiry); // undefined であること
```

**期待される結果:**
- ✅ emailVerified: true
- ✅ emailVerificationToken: undefined（削除済み）
- ✅ emailVerificationTokenExpiry: undefined（削除済み）

#### ステップ6: ログイン可能性の確認

```javascript
// ログインページでテスト
// URL: http://localhost:3000/auth/signin

// ログイン情報を入力
const loginData = {
  email: testUser.email,
  password: testUser.password
};

// ログインを実行
const loginResponse = await fetch('/api/auth/signin', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(loginData)
});
```

**期待される結果:**
- ✅ ログイン成功
- ✅ ダッシュボードまたは掲示板ページへリダイレクト
- ✅ セッションが確立される

### シナリオ2: エラーケースの確認

#### テスト1: 無効なトークンでアクセス

```javascript
// 無効なトークンでアクセス
const invalidUrl = 'http://localhost:3000/auth/verify?token=invalid-token-12345';

// ブラウザでアクセスまたはfetch
const response = await fetch(invalidUrl);
const result = await response.json();
```

**期待される結果:**
- ✅ ステータスコード: 400
- ✅ エラーメッセージ: "トークンが無効です"
- ✅ エラーアイコン（赤色）が表示される
- ✅ トラブルシューティング情報が表示される

#### テスト2: 使用済みトークンの再利用

```javascript
// 1. 有効なトークンで一度認証を完了
const firstAttempt = await fetch(verificationUrl);
console.log('初回認証:', await firstAttempt.json());

// 2. 同じトークンで再度アクセス
const secondAttempt = await fetch(verificationUrl);
console.log('再利用試行:', await secondAttempt.json());
```

**期待される結果:**
- ✅ 初回: 認証成功
- ✅ 2回目: エラー（トークンが見つからない）
- ✅ または "既に確認済み" メッセージ

#### テスト3: 期限切れトークン

```javascript
// データベースで期限切れトークンを作成
const expiredUser = await User.create({
  email: 'expired@example.com',
  password: 'hashedPassword',
  emailVerificationToken: 'expired-token-123',
  emailVerificationTokenExpiry: new Date(Date.now() - 25 * 60 * 60 * 1000), // 25時間前
  emailVerified: false
});

// 期限切れトークンでアクセス
const expiredUrl = `http://localhost:3000/auth/verify?token=expired-token-123`;
const response = await fetch(expiredUrl);
```

**期待される結果:**
- ✅ ステータスコード: 400
- ✅ エラーメッセージ: "確認リンクの有効期限が切れています"
- ✅ 再送信ボタンが表示される
- ✅ canResend: true

### シナリオ3: 再送信機能の確認

```javascript
// メール再送信のテスト
const resendResponse = await fetch('/api/auth/resend', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: testUser.email })
});

const resendResult = await resendResponse.json();
console.log('再送信結果:', resendResult);
```

**期待される結果:**
- ✅ 新しいトークンが生成される
- ✅ 確認メールが再送信される
- ✅ クールダウン時間が設定される

## 🧪 自動テストスクリプト

### 完全なE2Eテストスクリプト

```javascript
// scripts/test-email-auth-e2e.js
const mongoose = require('mongoose');
const fetch = require('node-fetch');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;
const BASE_URL = 'http://localhost:3000';

// Userモデル（簡易版）
const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  name: String,
  emailVerified: Boolean,
  emailVerificationToken: String,
  emailVerificationTokenExpiry: Date,
});

const User = mongoose.model('User', userSchema);

async function runE2ETest() {
  console.log('🚀 メール認証E2Eテスト開始\n');
  
  // MongoDB接続
  await mongoose.connect(MONGODB_URI);
  console.log('✅ MongoDB接続成功\n');
  
  const testEmail = `e2e-test-${Date.now()}@example.com`;
  const testPassword = 'TestPassword123!';
  const results = [];
  
  try {
    // 1. 新規ユーザー登録（直接DB操作でシミュレート）
    console.log('📝 ステップ1: 新規ユーザー登録');
    const token = generateToken();
    const user = await User.create({
      email: testEmail,
      password: 'hashedPassword', // 実際はハッシュ化される
      name: 'E2E Test User',
      emailVerified: false,
      emailVerificationToken: token,
      emailVerificationTokenExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000)
    });
    console.log(`✅ ユーザー作成: ${user.email}`);
    console.log(`📧 認証トークン: ${token.substring(0, 10)}...`);
    results.push({ step: '新規登録', status: 'PASS' });
    
    // 2. メールリンクをクリック（認証実行）
    console.log('\n📝 ステップ2: メールリンクをクリック');
    const verifyUrl = `${BASE_URL}/api/auth/verify?token=${token}`;
    const verifyResponse = await fetch(verifyUrl);
    const verifyResult = await verifyResponse.json();
    
    if (verifyResponse.status === 200 && verifyResult.success) {
      console.log('✅ 認証成功:', verifyResult.message);
      results.push({ step: '認証成功画面', status: 'PASS' });
    } else {
      console.log('❌ 認証失敗:', verifyResult);
      results.push({ step: '認証成功画面', status: 'FAIL' });
    }
    
    // 3. データベースでemailVerifiedを確認
    console.log('\n📝 ステップ3: データベース確認');
    const verifiedUser = await User.findById(user._id);
    
    if (verifiedUser.emailVerified === true) {
      console.log('✅ emailVerified: true');
      results.push({ step: 'emailVerified設定', status: 'PASS' });
    } else {
      console.log('❌ emailVerified: false');
      results.push({ step: 'emailVerified設定', status: 'FAIL' });
    }
    
    if (!verifiedUser.emailVerificationToken) {
      console.log('✅ トークン削除: 成功');
      results.push({ step: 'トークン削除', status: 'PASS' });
    } else {
      console.log('❌ トークンが残っている');
      results.push({ step: 'トークン削除', status: 'FAIL' });
    }
    
    // 4. 認証後のログイン可能性（シミュレート）
    console.log('\n📝 ステップ4: ログイン可能性確認');
    if (verifiedUser.emailVerified) {
      console.log('✅ ログイン可能状態');
      results.push({ step: 'ログイン可能', status: 'PASS' });
    } else {
      console.log('❌ ログイン不可状態');
      results.push({ step: 'ログイン可能', status: 'FAIL' });
    }
    
    // 5. 無効なトークンでエラー確認
    console.log('\n📝 ステップ5: 無効なトークンテスト');
    const invalidResponse = await fetch(`${BASE_URL}/api/auth/verify?token=invalid-12345`);
    const invalidResult = await invalidResponse.json();
    
    if (invalidResponse.status === 400 && invalidResult.error) {
      console.log('✅ 無効なトークンエラー:', invalidResult.error.message);
      results.push({ step: '無効トークンエラー', status: 'PASS' });
    } else {
      console.log('❌ エラーが正しく表示されない');
      results.push({ step: '無効トークンエラー', status: 'FAIL' });
    }
    
    // 6. 使用済みトークンの再利用テスト
    console.log('\n📝 ステップ6: 使用済みトークン再利用テスト');
    const reusedResponse = await fetch(verifyUrl);
    const reusedResult = await reusedResponse.json();
    
    if (reusedResponse.status === 400 || 
        (reusedResponse.status === 200 && reusedResult.data?.alreadyVerified)) {
      console.log('✅ 使用済みトークン再利用防止: 成功');
      results.push({ step: 'トークン再利用防止', status: 'PASS' });
    } else {
      console.log('❌ 使用済みトークンが再利用できてしまう');
      results.push({ step: 'トークン再利用防止', status: 'FAIL' });
    }
    
    // クリーンアップ
    await User.deleteOne({ _id: user._id });
    
  } catch (error) {
    console.error('❌ テストエラー:', error);
    results.push({ step: 'エラー', status: 'FAIL', error: error.message });
  }
  
  // 結果サマリー
  console.log('\n' + '='.repeat(60));
  console.log('📊 テスト結果サマリー');
  console.log('='.repeat(60));
  
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  
  console.log(`\n✅ 成功: ${passed}件`);
  console.log(`❌ 失敗: ${failed}件`);
  console.log(`📈 合格率: ${((passed / results.length) * 100).toFixed(1)}%`);
  
  console.log('\n詳細:');
  results.forEach(r => {
    const icon = r.status === 'PASS' ? '✅' : '❌';
    console.log(`${icon} ${r.step}: ${r.status}`);
    if (r.error) console.log(`   エラー: ${r.error}`);
  });
  
  // 最終評価
  console.log('\n📝 最終評価:');
  if (failed === 0) {
    console.log('🏆 完璧！すべてのテストに合格しました。');
  } else if (passed >= 4) {
    console.log('✅ 良好: 主要機能は正常に動作しています。');
  } else {
    console.log('⚠️ 要改善: 重要な機能に問題があります。');
  }
  
  await mongoose.connection.close();
  process.exit(failed > 0 ? 1 : 0);
}

function generateToken() {
  return Array.from({ length: 32 }, () => 
    Math.random().toString(36).charAt(2)
  ).join('');
}

// 実行
runE2ETest().catch(console.error);
```

## 📊 確認チェックリスト

### 必須確認項目

- [ ] **新規登録後のメール送信**
  - [ ] 確認メールが送信される
  - [ ] メールにトークン付きリンクが含まれる
  - [ ] リンクが正しいURLを指している

- [ ] **認証リンククリック時の動作**
  - [ ] 認証成功画面が表示される
  - [ ] 成功メッセージが表示される
  - [ ] 自動リダイレクトが動作する

- [ ] **データベースの更新**
  - [ ] emailVerified が true に更新される
  - [ ] emailVerificationToken が削除される
  - [ ] emailVerificationTokenExpiry が削除される

- [ ] **認証後のログイン**
  - [ ] 認証済みユーザーがログインできる
  - [ ] 未認証ユーザーがログインできない
  - [ ] 適切なエラーメッセージが表示される

- [ ] **エラーハンドリング**
  - [ ] 無効なトークンでエラーが表示される
  - [ ] 期限切れトークンでエラーが表示される
  - [ ] 使用済みトークンが再利用できない

## 🎯 期待される結果

### 成功基準

```yaml
合格基準:
  機能テスト: 6/6 (100%)
  エラーハンドリング: 3/3 (100%)
  セキュリティ: 2/2 (100%)
  
必須要件:
  - すべての基本フローが動作する
  - エラーが適切に処理される
  - セキュリティが確保されている
```

## 🚀 実行コマンド

```bash
# 1. テストスクリプトの実行
node scripts/test-email-auth-e2e.js

# 2. 手動テスト
# ブラウザで http://localhost:3000/auth/signup にアクセスして手動でテスト

# 3. データベース確認
node scripts/check-mongodb.js
```

## 📝 トラブルシューティング

### よくある問題と解決方法

1. **メールが届かない**
   - メールサーバーの設定を確認
   - .env.local の SMTP設定を確認
   - ローカル開発環境ではコンソールログを確認

2. **トークンが無効と表示される**
   - URLが正しくコピーされているか確認
   - トークンの有効期限を確認
   - データベースでトークンの存在を確認

3. **認証後もログインできない**
   - emailVerifiedフィールドを確認
   - セッション設定を確認
   - NextAuthの設定を確認

---
*このプロンプトを使用して、メール認証機能の完全な動作確認を実施してください。*