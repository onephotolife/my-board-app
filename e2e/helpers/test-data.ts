/**
 * E2Eテスト用のテストデータ
 */

export const TEST_USERS = {
  // 新規登録用ユーザー
  newUser: {
    email: `test${Date.now()}@example.com`,
    password: 'Test123!@#',
    name: 'Test User',
  },
  
  // 既存ユーザー（認証済み）
  existingUser: {
    email: 'existing@example.com',
    password: 'Existing123!@#',
    name: 'Existing User',
  },
  
  // 既存ユーザー（未認証）
  unverifiedUser: {
    email: 'unverified@example.com',
    password: 'Unverified123!@#',
    name: 'Unverified User',
  },
  
  // 無効なユーザー
  invalidUser: {
    email: 'invalid@',
    password: '123',
    name: '',
  },
};

export const WEAK_PASSWORDS = [
  '12345678',           // 数字のみ
  'abcdefgh',          // 小文字のみ
  'ABCDEFGH',          // 大文字のみ
  'Abcd1234',          // 特殊文字なし
  'Test!',             // 短すぎる
  'password',          // 一般的すぎる
  'aaaaaaaa',          // 繰り返し
];

export const STRONG_PASSWORDS = [
  'MyP@ssw0rd123!',
  'Secure#Pass2024',
  'Complex!Pwd@789',
  'Str0ng&Safe$456',
];

export const XSS_PAYLOADS = [
  '<script>alert("XSS")</script>',
  '"><script>alert("XSS")</script>',
  '<img src=x onerror=alert("XSS")>',
  'javascript:alert("XSS")',
  '<svg onload=alert("XSS")>',
];

export const SQL_INJECTION_PAYLOADS = [
  "' OR '1'='1",
  "1; DROP TABLE users--",
  "admin'--",
  "' UNION SELECT * FROM users--",
  "1' AND '1' = '1",
];

export const RATE_LIMIT_CONFIG = {
  maxAttempts: 3,
  windowMs: 60 * 60 * 1000, // 1時間
  cooldownMs: 60 * 1000,     // 60秒
};

export const PERFORMANCE_THRESHOLDS = {
  pageLoad: 2000,          // ページ読み込み: 2秒以内
  apiResponse: 500,        // API応答: 500ms以内
  formSubmit: 1000,        // フォーム送信: 1秒以内
  emailDelivery: 5000,     // メール配信: 5秒以内
};

export const TEST_TOKENS = {
  valid: 'a'.repeat(64),                    // 有効なトークン形式
  invalid: 'invalid-token',                 // 無効なトークン
  expired: 'expired-token-123456789',       // 期限切れトークン
  used: 'already-used-token-987654321',     // 使用済みトークン
};

export const MOBILE_VIEWPORTS = {
  iPhoneSE: { width: 375, height: 667 },
  iPhone12: { width: 390, height: 844 },
  Pixel5: { width: 393, height: 851 },
  GalaxyS20: { width: 360, height: 800 },
};

export const DESKTOP_VIEWPORTS = {
  laptop: { width: 1366, height: 768 },
  desktop: { width: 1920, height: 1080 },
  wide: { width: 2560, height: 1440 },
};

export const ERROR_MESSAGES = {
  invalidEmail: 'メールアドレスの形式が正しくありません',
  weakPassword: 'パスワードが弱すぎます',
  emailExists: 'このメールアドレスは既に登録されています',
  invalidToken: '無効なトークンです',
  tokenExpired: '確認リンクの有効期限が切れています',
  rateLimited: 'リクエストが多すぎます',
  serverError: 'サーバーエラーが発生しました',
};