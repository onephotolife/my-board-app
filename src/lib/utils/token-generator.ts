/**
 * セキュアなトークン生成ユーティリティ
 * 20人天才エンジニア会議により設計
 */

import crypto from 'crypto';

/**
 * メール確認用トークンを生成
 * @returns 64文字の16進数文字列（256ビットのエントロピー）
 */
export function generateEmailVerificationToken(): string {
  // crypto.randomBytesで32バイト（256ビット）のランダムデータを生成
  // これは暗号学的に安全な乱数生成器を使用
  return crypto.randomBytes(32).toString('hex');
}

/**
 * パスワードリセット用トークンを生成
 * @returns 64文字の16進数文字列（256ビットのエントロピー） 
 */
export function generatePasswordResetToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * 短いOTPコードを生成（SMS/メール用）
 * @param length コードの長さ（デフォルト: 6）
 * @returns 数字のみのOTPコード
 */
export function generateOTPCode(length: number = 6): string {
  const max = Math.pow(10, length) - 1;
  const randomNumber = crypto.randomInt(0, max);
  return randomNumber.toString().padStart(length, '0');
}

/**
 * トークンの有効期限を生成
 * @param hours 有効期間（時間単位、デフォルト: 24時間）
 * @returns 有効期限のDateオブジェクト
 */
export function generateTokenExpiry(hours: number = 24): Date {
  const expiry = new Date();
  expiry.setHours(expiry.getHours() + hours);
  return expiry;
}

/**
 * トークンが有効期限内かチェック
 * @param expiry 有効期限
 * @returns 有効ならtrue
 */
export function isTokenValid(expiry: Date | undefined | null): boolean {
  if (!expiry) return false;
  return new Date() < new Date(expiry);
}

/**
 * UUID v4形式のトークンかチェック（後方互換性のため）
 * @param token チェックするトークン
 * @returns UUID v4形式ならtrue
 */
export function isUUIDv4(token: string): boolean {
  const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidV4Regex.test(token);
}

/**
 * 16進数形式のトークンかチェック
 * @param token チェックするトークン
 * @param expectedLength 期待される長さ（デフォルト: 64文字）
 * @returns 有効な16進数形式ならtrue
 */
export function isHexToken(token: string, expectedLength: number = 64): boolean {
  const hexRegex = new RegExp(`^[0-9a-f]{${expectedLength}}$`, 'i');
  return hexRegex.test(token);
}

/**
 * トークンのタイプを判定（後方互換性のため）
 * @param token 判定するトークン
 * @returns 'uuid' | 'hex' | 'invalid'
 */
export function getTokenType(token: string): 'uuid' | 'hex' | 'invalid' {
  if (isUUIDv4(token)) return 'uuid';
  if (isHexToken(token)) return 'hex';
  return 'invalid';
}

/**
 * タイミング攻撃に耐性のあるトークン比較
 * @param tokenA 比較するトークンA
 * @param tokenB 比較するトークンB
 * @returns 一致すればtrue
 */
export function secureTokenCompare(tokenA: string, tokenB: string): boolean {
  if (!tokenA || !tokenB) return false;
  if (tokenA.length !== tokenB.length) return false;
  
  try {
    // crypto.timingSafeEqualを使用してタイミング攻撃を防ぐ
    return crypto.timingSafeEqual(
      Buffer.from(tokenA),
      Buffer.from(tokenB)
    );
  } catch {
    return false;
  }
}