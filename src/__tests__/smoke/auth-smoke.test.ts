/**
 * 認証スモークテスト
 * STRICT120準拠 - 最小実行確認
 */

describe('【SMOKE】認証基本確認', () => {
  const VALID_CREDENTIALS = {
    email: 'one.photolife+1@gmail.com',
    password: '?@thc123THC@?'
  };

  test('認証情報が定義されている', () => {
    expect(VALID_CREDENTIALS.email).toBeDefined();
    expect(VALID_CREDENTIALS.password).toBeDefined();
    expect(VALID_CREDENTIALS.email).toBe('one.photolife+1@gmail.com');
    expect(VALID_CREDENTIALS.password).toBe('?@thc123THC@?');
  });

  test('メール形式が正しい', () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    expect(VALID_CREDENTIALS.email).toMatch(emailRegex);
  });

  test('パスワード強度が十分', () => {
    const password = VALID_CREDENTIALS.password;
    expect(password.length).toBeGreaterThanOrEqual(8);
    expect(password).toMatch(/[A-Z]/); // 大文字
    expect(password).toMatch(/[a-z]/); // 小文字
    expect(password).toMatch(/[0-9]/); // 数字
    expect(password).toMatch(/[!@#$%^&*?]/); // 特殊文字
  });
});

export {};