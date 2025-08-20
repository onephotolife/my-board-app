import crypto from 'crypto';

/**
 * トークン生成と検証のユーティリティ
 */

/**
 * セキュアなランダムトークンを生成
 * @param length トークンのバイト数（デフォルト: 32バイト = 256ビット）
 * @returns 16進数文字列のトークン
 */
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * トークンの有効期限を計算
 * @param hours 有効期限（時間単位、デフォルト: 24時間）
 * @returns 有効期限のDateオブジェクト
 */
export function calculateTokenExpiry(hours: number = 24): Date {
  const expiry = new Date();
  expiry.setHours(expiry.getHours() + hours);
  return expiry;
}

/**
 * トークンが有効期限内かチェック
 * @param expiry 有効期限
 * @returns 有効期限内ならtrue
 */
export function isTokenValid(expiry: Date | undefined): boolean {
  if (!expiry) return false;
  return new Date() < new Date(expiry);
}

/**
 * タイミング攻撃を防ぐための固定時間比較
 * @param a 文字列1
 * @param b 文字列2
 * @returns 一致すればtrue
 */
export function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  
  return crypto.timingSafeEqual(
    Buffer.from(a),
    Buffer.from(b)
  );
}

/**
 * メール確認用のトークンデータを生成
 * @returns トークンとその有効期限
 */
export function generateEmailVerificationToken(): {
  token: string;
  expiry: Date;
} {
  return {
    token: generateSecureToken(),
    expiry: calculateTokenExpiry(24), // 24時間有効
  };
}

/**
 * パスワードリセット用のトークンデータを生成
 * @returns トークンとその有効期限
 */
export function generatePasswordResetToken(): {
  token: string;
  expiry: Date;
} {
  return {
    token: generateSecureToken(),
    expiry: calculateTokenExpiry(1), // 1時間有効
  };
}