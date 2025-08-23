/**
 * 認証エラーの定義
 * セキュリティを考慮しつつ、ユーザーフレンドリーなメッセージを提供
 * NextAuth v4対応版
 */

export const AUTH_ERRORS = {
  // メール未確認エラー
  EMAIL_NOT_VERIFIED: 'EmailNotVerified',
  // 認証情報不正（ユーザー不在またはパスワード不正）
  INVALID_CREDENTIALS: 'InvalidCredentials',
  // パスワード間違い（セキュリティ上、一般的にはINVALID_CREDENTIALSと同じ扱い）
  INVALID_PASSWORD: 'InvalidPassword',
  // ユーザー不存在（セキュリティ上、一般的にはINVALID_CREDENTIALSと同じ扱い）
  USER_NOT_FOUND: 'UserNotFound',
  // その他のエラー
  UNKNOWN_ERROR: 'UnknownError',
} as const;

/**
 * NextAuth v4対応 カスタムエラークラス（標準Errorクラスを継承）
 */
export class EmailNotVerifiedError extends Error {
  static type = "EmailNotVerified";
  
  constructor(message?: string) {
    super(message || "メールアドレスが確認されていません");
    this.name = "EmailNotVerifiedError";
  }
}

export class InvalidPasswordError extends Error {
  static type = "InvalidPassword";
  
  constructor(message?: string) {
    super(message || "パスワードが正しくありません");
    this.name = "InvalidPasswordError";
  }
}

export class UserNotFoundError extends Error {
  static type = "UserNotFound";
  
  constructor(message?: string) {
    super(message || "ユーザーが見つかりません");
    this.name = "UserNotFoundError";
  }
}

export type AuthErrorType = typeof AUTH_ERRORS[keyof typeof AUTH_ERRORS];

/**
 * エラーメッセージの取得
 */
export function getAuthErrorMessage(error: string | null): {
  title: string;
  message: string;
  action?: string;
} {
  switch (error) {
    case 'EmailNotVerified':
    case AUTH_ERRORS.EMAIL_NOT_VERIFIED:
      return {
        title: 'メールアドレスの確認が必要です',
        message: 'アカウントを有効化するため、登録時に送信された確認メールをご確認ください。',
        action: 'メールが届いていない場合は、迷惑メールフォルダもご確認ください。',
      };
    
    case 'InvalidPassword':
    case AUTH_ERRORS.INVALID_PASSWORD:
      return {
        title: 'パスワードが間違っています',
        message: '入力されたパスワードが正しくありません。',
        action: 'パスワードを確認して再度入力してください。パスワードをお忘れの場合は、パスワードリセットをご利用ください。',
      };
    
    case 'UserNotFound':
    case AUTH_ERRORS.USER_NOT_FOUND:
      return {
        title: 'ユーザーが見つかりません',
        message: 'そのメールアドレスは登録されていません。',
        action: 'メールアドレスを確認するか、新規登録をお試しください。',
      };
    
    case AUTH_ERRORS.INVALID_CREDENTIALS:
      return {
        title: 'ログインに失敗しました',
        message: 'メールアドレスまたはパスワードが正しくありません。',
        action: 'パスワードをお忘れの場合は、パスワードリセットをご利用ください。',
      };
    
    case 'CredentialsSignin':
      // NextAuthのデフォルトエラー
      // メール未確認の場合も含まれる可能性があるため、より親切なメッセージにする
      return {
        title: 'ログインできませんでした',
        message: 'メールアドレスまたはパスワードが正しくないか、メールアドレスの確認が完了していない可能性があります。',
        action: '新規登録された場合は、送信された確認メールをご確認ください。パスワードをお忘れの場合は、パスワードリセットをご利用ください。',
      };
    
    case 'Configuration':
      return {
        title: 'システムエラー',
        message: '認証システムの設定に問題があります。',
        action: '管理者にお問い合わせください。',
      };
    
    case 'AccessDenied':
      return {
        title: 'アクセス拒否',
        message: 'このアカウントへのアクセスが拒否されました。',
      };
    
    case 'Verification':
      return {
        title: '確認エラー',
        message: 'トークンの検証に失敗しました。リンクの有効期限が切れている可能性があります。',
      };
    
    case 'MissingCSRF':
      return {
        title: 'セキュリティエラー',
        message: 'セキュリティトークンが無効です。',
        action: 'ページを再読み込みして再度お試しください。',
      };
    
    default:
      return {
        title: 'エラーが発生しました',
        message: '予期しないエラーが発生しました。',
        action: '時間をおいて再度お試しください。',
      };
  }
}

/**
 * セキュアなエラーメッセージ取得
 * パスワード間違いとユーザー不在を区別しない
 */
export function getSecureErrorMessage(
  isUserNotFound: boolean,
  isPasswordInvalid: boolean,
  isEmailNotVerified: boolean
): string {
  // メール未確認は明確に伝える（ユーザーエクスペリエンス向上のため）
  if (isEmailNotVerified) {
    return AUTH_ERRORS.EMAIL_NOT_VERIFIED;
  }
  
  // ユーザー不在とパスワード不正は同じメッセージ（セキュリティのため）
  if (isUserNotFound || isPasswordInvalid) {
    return AUTH_ERRORS.INVALID_CREDENTIALS;
  }
  
  return AUTH_ERRORS.UNKNOWN_ERROR;
}