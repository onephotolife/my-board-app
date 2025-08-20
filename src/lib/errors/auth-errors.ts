export enum AuthErrorCode {
  // トークン関連
  INVALID_TOKEN = 'INVALID_TOKEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  ALREADY_VERIFIED = 'ALREADY_VERIFIED',
  
  // ユーザー関連
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  EMAIL_EXISTS = 'EMAIL_EXISTS',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  
  // レート制限
  RATE_LIMITED = 'RATE_LIMITED',
  TOO_MANY_REQUESTS = 'TOO_MANY_REQUESTS',
  
  // 入力検証
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  
  // システムエラー
  DATABASE_ERROR = 'DATABASE_ERROR',
  EMAIL_SEND_FAILED = 'EMAIL_SEND_FAILED',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

export interface AuthErrorResponse {
  success: false;
  error: {
    code: AuthErrorCode;
    message: string;
    details?: any;
    canResend?: boolean;
  };
}

export interface AuthSuccessResponse {
  success: true;
  message: string;
  data?: any;
  redirectUrl?: string;
}

export class AuthError extends Error {
  public code: AuthErrorCode;
  public statusCode: number;
  public details?: any;
  public canResend?: boolean;

  constructor(
    code: AuthErrorCode,
    message: string,
    statusCode: number = 400,
    details?: any,
    canResend?: boolean
  ) {
    super(message);
    this.name = 'AuthError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.canResend = canResend;
  }

  toJSON(): AuthErrorResponse {
    return {
      success: false,
      error: {
        code: this.code,
        message: this.message,
        details: this.details,
        canResend: this.canResend,
      },
    };
  }
}

// エラーメッセージの日本語マッピング
export const AUTH_ERROR_MESSAGES: Record<AuthErrorCode, string> = {
  [AuthErrorCode.INVALID_TOKEN]: '無効なトークンです。',
  [AuthErrorCode.TOKEN_EXPIRED]: '確認リンクの有効期限が切れています。',
  [AuthErrorCode.ALREADY_VERIFIED]: 'メールアドレスは既に確認済みです。',
  [AuthErrorCode.USER_NOT_FOUND]: 'ユーザーが見つかりません。',
  [AuthErrorCode.EMAIL_EXISTS]: 'このメールアドレスは既に登録されています。',
  [AuthErrorCode.INVALID_CREDENTIALS]: 'メールアドレスまたはパスワードが正しくありません。',
  [AuthErrorCode.RATE_LIMITED]: 'リクエストが多すぎます。しばらくしてからお試しください。',
  [AuthErrorCode.TOO_MANY_REQUESTS]: '試行回数が上限に達しました。',
  [AuthErrorCode.INVALID_INPUT]: '入力内容が正しくありません。',
  [AuthErrorCode.MISSING_REQUIRED_FIELD]: '必須項目が入力されていません。',
  [AuthErrorCode.DATABASE_ERROR]: 'データベースエラーが発生しました。',
  [AuthErrorCode.EMAIL_SEND_FAILED]: 'メール送信に失敗しました。',
  [AuthErrorCode.INTERNAL_ERROR]: 'サーバーエラーが発生しました。',
};

// エラーコードからHTTPステータスコードを取得
export function getStatusCodeForError(code: AuthErrorCode): number {
  switch (code) {
    case AuthErrorCode.INVALID_TOKEN:
    case AuthErrorCode.TOKEN_EXPIRED:
    case AuthErrorCode.INVALID_INPUT:
    case AuthErrorCode.MISSING_REQUIRED_FIELD:
      return 400;
    case AuthErrorCode.INVALID_CREDENTIALS:
      return 401;
    case AuthErrorCode.USER_NOT_FOUND:
      return 404;
    case AuthErrorCode.EMAIL_EXISTS:
    case AuthErrorCode.ALREADY_VERIFIED:
      return 409;
    case AuthErrorCode.RATE_LIMITED:
    case AuthErrorCode.TOO_MANY_REQUESTS:
      return 429;
    case AuthErrorCode.DATABASE_ERROR:
    case AuthErrorCode.EMAIL_SEND_FAILED:
    case AuthErrorCode.INTERNAL_ERROR:
      return 500;
    default:
      return 400;
  }
}