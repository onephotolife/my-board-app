/**
 * クライアント側ObjectID検証ユーティリティ
 * 優先度2実装：無効なObjectIDのAPIリクエスト防止
 * 
 * @module utils/validators/objectId
 * @since 2025-08-28
 */

// MongoDB ObjectIDの正規表現パターン
// - 正確に24文字の16進数文字列
// - 大文字小文字を区別しない
const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;

/**
 * ObjectIDの有効性を検証
 * @param id - 検証するID
 * @returns 有効な場合true、無効な場合false
 */
export function isValidObjectId(id: unknown): boolean {
  // null/undefined チェック
  if (id == null) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[ObjectID Validator] ID is null or undefined');
    }
    return false;
  }

  // 文字列型チェック
  if (typeof id !== 'string') {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[ObjectID Validator] ID is not a string: ${typeof id}`);
    }
    return false;
  }

  // 空文字列チェック
  if (id.length === 0) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[ObjectID Validator] ID is empty string');
    }
    return false;
  }

  // 長さチェック（早期リターン最適化）
  if (id.length !== 24) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[ObjectID Validator] Invalid ID length: ${id.length} (expected 24)`);
    }
    return false;
  }

  // 16進数パターンチェック
  const isValid = OBJECT_ID_REGEX.test(id);
  
  if (!isValid && process.env.NODE_ENV === 'development') {
    console.warn(`[ObjectID Validator] ID contains invalid characters: ${id}`);
  }

  return isValid;
}

/**
 * 複数のObjectIDを検証
 * @param ids - 検証するIDの配列
 * @returns 全てのIDが有効な場合true
 */
export function areValidObjectIds(ids: unknown[]): boolean {
  if (!Array.isArray(ids)) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[ObjectID Validator] Input is not an array');
    }
    return false;
  }

  if (ids.length === 0) {
    return true; // 空配列は有効とする
  }

  return ids.every(id => isValidObjectId(id));
}

/**
 * ObjectIDの検証詳細情報を取得（デバッグ用）
 * @param id - 検証するID
 * @returns 検証結果の詳細情報
 */
export function validateObjectIdWithDetails(id: unknown): {
  isValid: boolean;
  error?: string;
  details?: {
    value: unknown;
    type: string;
    length?: number;
    hexCheck?: boolean;
  };
} {
  // null/undefined チェック
  if (id == null) {
    return {
      isValid: false,
      error: 'ID is null or undefined',
      details: {
        value: id,
        type: id === null ? 'null' : 'undefined'
      }
    };
  }

  // 型チェック
  if (typeof id !== 'string') {
    return {
      isValid: false,
      error: `ID must be a string, got ${typeof id}`,
      details: {
        value: id,
        type: typeof id
      }
    };
  }

  // 空文字列チェック
  if (id.length === 0) {
    return {
      isValid: false,
      error: 'ID cannot be empty',
      details: {
        value: id,
        type: 'string',
        length: 0
      }
    };
  }

  // 長さチェック
  if (id.length !== 24) {
    return {
      isValid: false,
      error: `ID must be 24 characters, got ${id.length}`,
      details: {
        value: id,
        type: 'string',
        length: id.length
      }
    };
  }

  // 16進数チェック
  const hexCheck = OBJECT_ID_REGEX.test(id);
  if (!hexCheck) {
    return {
      isValid: false,
      error: 'ID must contain only hexadecimal characters (0-9, a-f)',
      details: {
        value: id,
        type: 'string',
        length: id.length,
        hexCheck: false
      }
    };
  }

  return {
    isValid: true,
    details: {
      value: id,
      type: 'string',
      length: id.length,
      hexCheck: true
    }
  };
}

/**
 * 無効なIDをフィルタリング
 * @param ids - IDの配列
 * @returns 有効なIDのみの配列
 */
export function filterValidObjectIds(ids: unknown[]): string[] {
  if (!Array.isArray(ids)) {
    return [];
  }

  return ids.filter(id => isValidObjectId(id)) as string[];
}

/**
 * IDバリデーションエラーメッセージ生成
 * @param id - 検証に失敗したID
 * @returns ユーザー向けエラーメッセージ
 */
export function getObjectIdErrorMessage(id: unknown): string {
  const validation = validateObjectIdWithDetails(id);
  
  if (validation.isValid) {
    return '';
  }

  // ユーザーフレンドリーなエラーメッセージ
  if (id == null) {
    return 'ユーザーIDが指定されていません';
  }

  if (typeof id !== 'string') {
    return '無効なユーザーID形式です';
  }

  if (id.length === 0) {
    return 'ユーザーIDが空です';
  }

  if (id.length !== 24) {
    return `ユーザーIDの長さが不正です（${id.length}文字）`;
  }

  return 'ユーザーIDに無効な文字が含まれています';
}

// 開発環境でのテスト用エクスポート
if (process.env.NODE_ENV === 'development') {
  (window as any).__objectIdValidator = {
    isValidObjectId,
    areValidObjectIds,
    validateObjectIdWithDetails,
    filterValidObjectIds,
    getObjectIdErrorMessage,
    OBJECT_ID_REGEX
  };
}