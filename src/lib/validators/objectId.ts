/**
 * MongoDB ObjectID バリデーションユーティリティ（統合版）
 * 
 * ObjectIDの形式検証を行い、無効なIDによる500エラーを防ぐ
 * 解決策1: ObjectIDバリデーター統合実装
 * 
 * @module lib/validators/objectId
 * @since 2025-08-28 - SOL-1 統合実装
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

/**
 * 複数のObjectIDを検証
 * @param ids - 検証するIDの配列
 * @returns 全てのIDが有効な場合true
 */
export function areValidObjectIds(ids: unknown[]): boolean {
  if (!Array.isArray(ids)) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[SOL-1][ObjectID Validator] Input is not an array');
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

// 開発環境でのデバッグ用エクスポート（SSR対応）
if (process.env.NODE_ENV === 'development') {
  console.warn('[SOL-1][DEBUG] ObjectID Validator module loading:', {
    timestamp: new Date().toISOString(),
    environment: typeof window !== 'undefined' ? 'client' : 'server',
    nodeEnv: process.env.NODE_ENV,
    solution: 'SOL-1_CONSOLIDATED'
  });
  
  // SSRガード: windowが存在する場合のみグローバルに追加
  if (typeof window !== 'undefined') {
    (window as any).__objectIdValidator = {
      isValidObjectId,
      areValidObjectIds,
      validateObjectIdWithDetails,
      filterValidObjectIds,
      getObjectIdErrorMessage,
      debugObjectId,
      validateObjectId,
      OBJECT_ID_REGEX
    };
    console.warn('[SOL-1][DEBUG] ObjectID Validator attached to window for client-side debugging');
  } else {
    console.warn('[SOL-1][DEBUG] ObjectID Validator server-side loading (window unavailable)');
  }
}