/**
 * MongoDB ObjectID バリデーションユーティリティ
 * 
 * ObjectIDの形式検証を行い、無効なIDによる500エラーを防ぐ
 */

export const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;

/**
 * ObjectID形式の検証
 * @param id - 検証対象のID
 * @returns 有効なObjectIDの場合true
 */
export function isValidObjectId(id: unknown): boolean {
  if (typeof id !== 'string') return false;
  return OBJECT_ID_REGEX.test(id);
}

/**
 * ObjectIDの検証と型安全な変換
 * @param id - 検証対象のID
 * @returns 有効な場合はstring、無効な場合はnull
 */
export function validateObjectId(id: unknown): string | null {
  if (!isValidObjectId(id)) {
    console.warn(`[ObjectID Validator] Invalid ObjectID format: ${id}, type: ${typeof id}, length: ${typeof id === 'string' ? id.length : 'N/A'}`);
    return null;
  }
  return id as string;
}

/**
 * デバッグ用: ObjectIDの詳細情報取得
 */
export function debugObjectId(id: unknown): {
  isValid: boolean;
  value: unknown;
  type: string;
  length?: number;
  hexCheck?: boolean;
} {
  const result = {
    isValid: false,
    value: id,
    type: typeof id,
    length: undefined as number | undefined,
    hexCheck: undefined as boolean | undefined,
  };

  if (typeof id === 'string') {
    result.length = id.length;
    result.hexCheck = /^[0-9a-fA-F]+$/.test(id);
    result.isValid = isValidObjectId(id);
  }

  return result;
}