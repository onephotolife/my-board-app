/**
 * 認証エラーの定義
 * セキュリティを考慮しつつ、ユーザーフレンドリーなメッセージを提供
 * 25人天才エンジニア会議による改善 - NextAuth v5カスタムエラー対応
 */

import { AuthError } from "next-auth";

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
 * NextAuth v5 カスタムエラークラス
 */
export class EmailNotVerifiedError extends AuthError {
  static override type = "EmailNotVerified";
  
  constructor(message?: string) {
    super(message || "メールアドレスが確認されていません");
    this.name = "EmailNotVerifiedError";
  }
}

export class InvalidPasswordError extends AuthError {
  static override type = "InvalidPassword";
  
  constructor(message?: string) {
    super(message || "パスワードが正しくありません");
    this.name = "InvalidPasswordError";
  }
}

export class UserNotFoundError extends AuthError {
  static override type = "UserNotFound";
  
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
        title: 'ログインできませんでした',
        message: 'メールアドレスまたはパスワードが正しくありません。',
        action: 'パスワードをお忘れの場合は、パスワードリセットをご利用ください。',
      };
    
    case AUTH_ERRORS.INVALID_CREDENTIALS:
      return {
        title: 'ログインできませんでした',
        message: 'メールアドレスまたはパスワードが正しくありません。',
        action: 'パスワードをお忘れの場合は、パスワードリセットをご利用ください。',
      };
    
    case 'CredentialsSignin':
      // NextAuthのデフォルトエラー（メールアドレスまたはパスワードが正しくない）
      return {
        title: 'ログインできませんでした',
        message: 'メールアドレスまたはパスワードが正しくありません。',
        action: 'パスワードをお忘れの場合は、パスワードリセットをご利用ください。',
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