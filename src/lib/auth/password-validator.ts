import bcrypt from 'bcryptjs';

// パスワード履歴の保存数（推奨: 3-5個）
export const PASSWORD_HISTORY_LIMIT = 5;

/**
 * パスワードが再利用されているかチェック
 * @param newPassword 新しいパスワード（平文）
 * @param currentPasswordHash 現在のパスワードハッシュ
 * @param passwordHistory パスワード履歴
 * @returns 再利用されている場合はtrue
 */
export async function isPasswordReused(
  newPassword: string,
  currentPasswordHash: string,
  passwordHistory: Array<{ hash: string; changedAt: Date }> = []
): Promise<boolean> {
  // 現在のパスワードと比較
  const isSameAsCurrent = await bcrypt.compare(newPassword, currentPasswordHash);
  if (isSameAsCurrent) {
    return true;
  }
  
  // 履歴のパスワードと比較
  for (const historicalPassword of passwordHistory) {
    const isSameAsHistorical = await bcrypt.compare(
      newPassword,
      historicalPassword.hash
    );
    if (isSameAsHistorical) {
      return true;
    }
  }
  
  return false;
}

/**
 * パスワード再利用エラーメッセージを取得
 * @param historyCount 履歴数
 * @returns エラーメッセージ
 */
export function getPasswordReuseError(historyCount: number): string {
  return `セキュリティのため、新しいパスワードは過去${historyCount}回分と異なるものを設定してください。`;
}

/**
 * パスワード履歴を更新
 * @param currentPasswordHash 現在のパスワードハッシュ
 * @param passwordHistory 既存のパスワード履歴
 * @param lastPasswordChange 最後にパスワードを変更した日時
 * @returns 更新されたパスワード履歴
 */
export function updatePasswordHistory(
  currentPasswordHash: string,
  passwordHistory: Array<{ hash: string; changedAt: Date }> = [],
  lastPasswordChange?: Date
): Array<{ hash: string; changedAt: Date }> {
  const updatedHistory = [
    { 
      hash: currentPasswordHash, 
      changedAt: lastPasswordChange || new Date() 
    },
    ...passwordHistory
  ];
  
  // 履歴の上限を守る（現在のパスワードを含めてLIMIT個まで）
  return updatedHistory.slice(0, PASSWORD_HISTORY_LIMIT - 1);
}