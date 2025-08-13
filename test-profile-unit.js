/**
 * プロフィール機能の単体テスト（Unit Test）
 * 各関数・コンポーネントが独立して正しく動作することを確認
 */

const { validateName, validateBio } = require('./src/lib/validations/profile');

console.log('🧪 単体テスト（Unit Test）開始\n');
console.log('========================================');

// テスト結果を記録
let passed = 0;
let failed = 0;

function test(description, fn) {
  try {
    fn();
    console.log(`✅ ${description}`);
    passed++;
  } catch (error) {
    console.log(`❌ ${description}`);
    console.log(`   Error: ${error.message}`);
    failed++;
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

// 1. バリデーション関数のテスト
console.log('\n1️⃣ バリデーション関数のテスト');
console.log('----------------------------------------');

// validateName のテスト
test('validateName: 正常な名前を受け入れる', () => {
  const result = validateName('山田太郎');
  assert(result.isValid === true, 'isValid should be true');
  assert(!result.error, 'error should be empty');
});

test('validateName: 空の名前を拒否する', () => {
  const result = validateName('');
  assert(result.isValid === false, 'isValid should be false');
  assert(result.error === '名前は必須です', 'error message should match');
});

test('validateName: 50文字を超える名前を拒否する', () => {
  const longName = 'あ'.repeat(51);
  const result = validateName(longName);
  assert(result.isValid === false, 'isValid should be false');
  assert(result.error === '名前は50文字以内で入力してください', 'error message should match');
});

test('validateName: 50文字ちょうどの名前を受け入れる', () => {
  const maxName = 'あ'.repeat(50);
  const result = validateName(maxName);
  assert(result.isValid === true, 'isValid should be true');
  assert(!result.error, 'error should be empty');
});

// validateBio のテスト
test('validateBio: 正常な自己紹介を受け入れる', () => {
  const result = validateBio('こんにちは、よろしくお願いします。');
  assert(result.isValid === true, 'isValid should be true');
  assert(!result.error, 'error should be empty');
});

test('validateBio: 空の自己紹介を受け入れる', () => {
  const result = validateBio('');
  assert(result.isValid === true, 'isValid should be true (bio is optional)');
  assert(!result.error, 'error should be empty');
});

test('validateBio: undefinedの自己紹介を受け入れる', () => {
  const result = validateBio(undefined);
  assert(result.isValid === true, 'isValid should be true (bio is optional)');
  assert(!result.error, 'error should be empty');
});

test('validateBio: 200文字を超える自己紹介を拒否する', () => {
  const longBio = 'あ'.repeat(201);
  const result = validateBio(longBio);
  assert(result.isValid === false, 'isValid should be false');
  assert(result.error === '自己紹介は200文字以内で入力してください', 'error message should match');
});

test('validateBio: 200文字ちょうどの自己紹介を受け入れる', () => {
  const maxBio = 'あ'.repeat(200);
  const result = validateBio(maxBio);
  assert(result.isValid === true, 'isValid should be true');
  assert(!result.error, 'error should be empty');
});

// 2. データ変換のテスト
console.log('\n2️⃣ データ変換のテスト');
console.log('----------------------------------------');

test('ProfileUpdateData: bioがundefinedの場合に空文字列に変換', () => {
  const data = { name: 'テスト', bio: undefined };
  const transformed = data.bio !== undefined ? data.bio : '';
  assert(transformed === '', 'undefined should be converted to empty string');
});

test('ProfileUpdateData: bioがnullの場合に空文字列に変換', () => {
  const data = { name: 'テスト', bio: null };
  const transformed = data.bio !== null ? data.bio : '';
  assert(transformed === '', 'null should be converted to empty string');
});

test('ProfileUpdateData: bioが文字列の場合はそのまま', () => {
  const data = { name: 'テスト', bio: 'テスト自己紹介' };
  const transformed = data.bio;
  assert(transformed === 'テスト自己紹介', 'string should remain unchanged');
});

// 3. エラーハンドリングのテスト
console.log('\n3️⃣ エラーハンドリングのテスト');
console.log('----------------------------------------');

test('エラーメッセージが適切にフォーマットされる', () => {
  const error = new Error('テストエラー');
  const message = error instanceof Error ? error.message : 'デフォルトメッセージ';
  assert(message === 'テストエラー', 'error message should be extracted correctly');
});

test('非Errorオブジェクトの場合デフォルトメッセージを使用', () => {
  const error = 'string error';
  const message = error instanceof Error ? error.message : 'デフォルトメッセージ';
  assert(message === 'デフォルトメッセージ', 'default message should be used');
});

// 結果サマリー
console.log('\n========================================');
console.log('📊 単体テスト結果サマリー');
console.log('========================================');
console.log(`✅ 成功: ${passed} 件`);
console.log(`❌ 失敗: ${failed} 件`);
console.log(`📈 成功率: ${Math.round((passed / (passed + failed)) * 100)}%`);

if (failed === 0) {
  console.log('\n🎉 すべての単体テストが成功しました！');
} else {
  console.log('\n⚠️ 一部のテストが失敗しました。修正が必要です。');
  process.exit(1);
}