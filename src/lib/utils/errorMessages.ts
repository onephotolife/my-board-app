/**
 * 天才14人会議による完璧なエラーハンドリングシステム
 * エラーメッセージ辞書とガイダンスシステム
 * 
 * 専門家チーム：
 * 1. UXライター - 親切で具体的なメッセージ作成
 * 2. エラー診断専門家 - エラー原因の特定と分類
 * 3. セキュリティ専門家 - エラー情報の適切な開示レベル
 * 4. アクセシビリティ専門家 - スクリーンリーダー対応
 * 5. 国際化専門家 - 日本語の最適化
 * 6. デバッグ専門家 - エラー追跡とログ記録
 * 7. サポート専門家 - 問い合わせ情報の提供
 */

export interface ErrorDetails {
  // UXライター: ユーザー向けメッセージ
  message: string;
  title?: string;
  
  // エラー診断専門家: エラー分類と原因
  type: ErrorType;
  category: ErrorCategory;
  severity: ErrorSeverity;
  
  // サポート専門家: 具体的なガイダンス
  guidance: {
    steps: string[];
    quickFix?: string;
    preventionTips?: string[];
  };
  
  // デバッグ専門家: トラブルシューティング
  troubleshooting: {
    checkpoints: string[];
    debugSteps?: string[];
    logReferences?: string[];
  };
  
  // サポート連絡先情報
  support: {
    showContactInfo: boolean;
    helpUrl?: string;
    chatAvailable?: boolean;
  };
  
  // アクセシビリティ専門家: スクリーンリーダー対応
  accessibility: {
    ariaLabel: string;
    announceText?: string;
    role: 'alert' | 'status';
  };
  
  // UI表示設定
  ui: {
    icon: string;
    color: 'error' | 'warning' | 'info';
    showRetryButton: boolean;
    showDetailsButton: boolean;
    autoHide?: number; // ms
  };
  
  // セキュリティ専門家: ログレベル設定
  logging: {
    level: 'error' | 'warn' | 'info' | 'debug';
    sensitive: boolean; // 機密情報を含むかどうか
    trackingId?: string;
  };
}

export type ErrorType = 
  | 'DATABASE_CONNECTION'
  | 'EMAIL_SERVER'
  | 'RATE_LIMIT'
  | 'VALIDATION'
  | 'NETWORK'
  | 'TIMEOUT'
  | 'AUTHENTICATION'
  | 'AUTHORIZATION'
  | 'NOT_FOUND'
  | 'INTERNAL_SERVER'
  | 'CLIENT_ERROR'
  | 'UNKNOWN';

export type ErrorCategory = 
  | 'SYSTEM' 
  | 'USER_INPUT' 
  | 'NETWORK' 
  | 'SECURITY' 
  | 'TEMPORARY';

export type ErrorSeverity = 
  | 'CRITICAL'  // システム全体に影響
  | 'HIGH'      // 主要機能に影響  
  | 'MEDIUM'    // 一部機能に影響
  | 'LOW';      // 軽微な問題

/**
 * データベース専門家による接続エラー対応
 */
const DATABASE_CONNECTION: ErrorDetails = {
  message: 'データベースに接続できませんでした。システムメンテナンス中の可能性があります。',
  title: 'データベース接続エラー',
  type: 'DATABASE_CONNECTION',
  category: 'SYSTEM',
  severity: 'CRITICAL',
  
  guidance: {
    steps: [
      '1-2分お待ちいただき、もう一度お試しください',
      'それでも問題が続く場合は、サポートまでお問い合わせください',
      'メンテナンス情報は公式サイトでご確認いただけます'
    ],
    quickFix: '少し時間をおいてから再度アクセス',
    preventionTips: [
      'システムメンテナンス時間（毎週日曜 2:00-4:00）をご確認ください',
      '重要な作業前にはデータを保存することをお勧めします'
    ]
  },
  
  troubleshooting: {
    checkpoints: [
      'インターネット接続を確認',
      'ブラウザのキャッシュをクリア',
      '他のページが正常に動作するか確認',
      'VPN接続がある場合は一時的に無効化'
    ],
    debugSteps: [
      'ブラウザのコンソールでエラーログを確認',
      'ネットワークタブで接続状況を確認'
    ]
  },
  
  support: {
    showContactInfo: true,
    helpUrl: '/help/database-issues',
    chatAvailable: true
  },
  
  accessibility: {
    ariaLabel: 'データベース接続エラーが発生しました',
    announceText: 'システムエラー。データベースに接続できません。',
    role: 'alert'
  },
  
  ui: {
    icon: '🔌',
    color: 'error',
    showRetryButton: true,
    showDetailsButton: true
  },
  
  logging: {
    level: 'error',
    sensitive: false,
    trackingId: 'DB_CONN_ERR'
  }
};

/**
 * ネットワーク専門家によるメールサーバーエラー対応
 */
const EMAIL_SERVER: ErrorDetails = {
  message: 'メールの送信に失敗しました。メールサーバーに一時的な問題が発生している可能性があります。',
  title: 'メール送信エラー',
  type: 'EMAIL_SERVER',
  category: 'SYSTEM',
  severity: 'HIGH',
  
  guidance: {
    steps: [
      '5-10分後に再度お試しください',
      'メールアドレスに誤りがないか確認してください',
      '迷惑メールフォルダもご確認ください',
      '問題が続く場合は別の連絡方法でサポートまでご連絡ください'
    ],
    quickFix: '時間をおいて再送信',
    preventionTips: [
      'メールアドレスは正確に入力してください',
      'フリーメールアドレスの場合、送信制限にご注意ください'
    ]
  },
  
  troubleshooting: {
    checkpoints: [
      'メールアドレスのスペルチェック',
      '迷惑メール設定の確認',
      'メールボックスの容量確認',
      'メールプロバイダーのサービス状況確認'
    ]
  },
  
  support: {
    showContactInfo: true,
    helpUrl: '/help/email-issues'
  },
  
  accessibility: {
    ariaLabel: 'メール送信エラーが発生しました',
    announceText: 'エラー。メールを送信できませんでした。',
    role: 'alert'
  },
  
  ui: {
    icon: '📧',
    color: 'error',
    showRetryButton: true,
    showDetailsButton: true
  },
  
  logging: {
    level: 'error',
    sensitive: false,
    trackingId: 'EMAIL_ERR'
  }
};

/**
 * セキュリティ専門家によるレート制限対応
 */
const RATE_LIMIT: ErrorDetails = {
  message: 'アクセスが集中しているため、一時的にご利用を制限しています。',
  title: 'アクセス制限',
  type: 'RATE_LIMIT',
  category: 'SECURITY',
  severity: 'MEDIUM',
  
  guidance: {
    steps: [
      '指定された時間をお待ちください',
      'その後、もう一度お試しください',
      '繰り返し制限される場合は、使用パターンをご確認ください'
    ],
    quickFix: '指定時間後に再試行',
    preventionTips: [
      '短時間に多数のリクエストを避けてください',
      '適度な間隔をあけてご利用ください'
    ]
  },
  
  troubleshooting: {
    checkpoints: [
      '自動リフレッシュ機能の無効化',
      'ブラウザで複数タブを開いていないか確認',
      'スクリプトやボットツールの使用停止'
    ]
  },
  
  support: {
    showContactInfo: false,
    helpUrl: '/help/rate-limits'
  },
  
  accessibility: {
    ariaLabel: 'アクセス制限エラー',
    announceText: '一時的なアクセス制限です。しばらくお待ちください。',
    role: 'status'
  },
  
  ui: {
    icon: '🚦',
    color: 'warning',
    showRetryButton: false, // 時間経過後に自動で有効化
    showDetailsButton: true,
    autoHide: 30000 // 30秒後に自動非表示
  },
  
  logging: {
    level: 'warn',
    sensitive: false,
    trackingId: 'RATE_LIMIT'
  }
};

/**
 * フロントエンド専門家による入力検証エラー対応
 */
const VALIDATION: ErrorDetails = {
  message: '入力内容に不備があります。下記をご確認ください。',
  title: '入力エラー',
  type: 'VALIDATION',
  category: 'USER_INPUT',
  severity: 'LOW',
  
  guidance: {
    steps: [
      '赤色で表示されている項目を修正してください',
      '各項目の要件をご確認ください',
      '修正後、もう一度送信してください'
    ],
    quickFix: '入力内容を確認・修正',
    preventionTips: [
      '入力前に要件をご確認ください',
      'コピー＆ペーストの際は余分なスペースにご注意ください'
    ]
  },
  
  troubleshooting: {
    checkpoints: [
      '必須項目の入力確認',
      '文字数制限の確認',
      '特殊文字の使用確認',
      'メールアドレス形式の確認'
    ]
  },
  
  support: {
    showContactInfo: false,
    helpUrl: '/help/input-requirements'
  },
  
  accessibility: {
    ariaLabel: '入力検証エラー',
    announceText: '入力内容に不備があります。項目を確認してください。',
    role: 'alert'
  },
  
  ui: {
    icon: '✏️',
    color: 'warning',
    showRetryButton: false,
    showDetailsButton: true
  },
  
  logging: {
    level: 'info',
    sensitive: false,
    trackingId: 'VALIDATION_ERR'
  }
};

/**
 * ネットワーク専門家による通信エラー対応
 */
const NETWORK: ErrorDetails = {
  message: 'ネットワーク接続に問題があります。インターネット環境をご確認ください。',
  title: 'ネットワークエラー',
  type: 'NETWORK',
  category: 'NETWORK',
  severity: 'HIGH',
  
  guidance: {
    steps: [
      'インターネット接続を確認してください',
      'Wi-Fi や モバイルデータの接続状況を確認',
      '接続が復旧後、もう一度お試しください',
      '問題が続く場合は、デバイスの再起動をお試しください'
    ],
    quickFix: 'インターネット接続の確認',
    preventionTips: [
      '安定したネットワーク環境でのご利用をお勧めします',
      '重要な作業時は、データ保存を適宜行ってください'
    ]
  },
  
  troubleshooting: {
    checkpoints: [
      'Wi-Fi接続の確認',
      '他のサイトやアプリの動作確認',
      'モバイルデータ接続の確認',
      'ルーターの再起動',
      'ブラウザのキャッシュクリア'
    ]
  },
  
  support: {
    showContactInfo: false,
    helpUrl: '/help/network-issues'
  },
  
  accessibility: {
    ariaLabel: 'ネットワーク接続エラー',
    announceText: 'ネットワークエラーです。インターネット接続を確認してください。',
    role: 'alert'
  },
  
  ui: {
    icon: '📶',
    color: 'error',
    showRetryButton: true,
    showDetailsButton: true
  },
  
  logging: {
    level: 'warn',
    sensitive: false,
    trackingId: 'NETWORK_ERR'
  }
};

/**
 * パフォーマンス専門家によるタイムアウトエラー対応
 */
const TIMEOUT: ErrorDetails = {
  message: '処理に時間がかかりすぎています。サーバーが一時的に混雑している可能性があります。',
  title: 'タイムアウトエラー',
  type: 'TIMEOUT',
  category: 'TEMPORARY',
  severity: 'MEDIUM',
  
  guidance: {
    steps: [
      '少し時間をおいて、もう一度お試しください',
      'サーバーの負荷が高い時間帯を避けてください',
      '問題が継続する場合は、サポートまでお問い合わせください'
    ],
    quickFix: '時間をおいて再試行',
    preventionTips: [
      'ピークタイム（12:00-13:00、19:00-21:00）は避けることをお勧めします',
      '大量のデータ処理は時間に余裕をもって行ってください'
    ]
  },
  
  troubleshooting: {
    checkpoints: [
      'インターネット接続速度の確認',
      '他のアプリケーションの終了',
      'ブラウザの不要なタブを閉じる',
      'ダウンロードなど重い処理の一時停止'
    ]
  },
  
  support: {
    showContactInfo: true,
    helpUrl: '/help/performance-issues'
  },
  
  accessibility: {
    ariaLabel: 'タイムアウトエラーが発生しました',
    announceText: 'エラー。処理がタイムアウトしました。',
    role: 'alert'
  },
  
  ui: {
    icon: '⏱️',
    color: 'warning',
    showRetryButton: true,
    showDetailsButton: true
  },
  
  logging: {
    level: 'warn',
    sensitive: false,
    trackingId: 'TIMEOUT_ERR'
  }
};

/**
 * システム専門家による内部エラー対応
 */
const INTERNAL_SERVER: ErrorDetails = {
  message: 'システム内部でエラーが発生しました。ご不便をおかけして申し訳ございません。',
  title: 'システムエラー',
  type: 'INTERNAL_SERVER',
  category: 'SYSTEM',
  severity: 'CRITICAL',
  
  guidance: {
    steps: [
      'しばらく時間をおいて、もう一度お試しください',
      '問題が続く場合は、下記の情報と共にサポートまでご連絡ください',
      'エラー発生時刻とご利用状況を併せてお伝えください'
    ],
    quickFix: '時間をおいて再アクセス',
    preventionTips: [
      'システムメンテナンス情報をご確認ください',
      '重要な作業は定期的に保存することをお勧めします'
    ]
  },
  
  troubleshooting: {
    checkpoints: [
      'ページの再読み込み',
      'ブラウザの再起動',
      'キャッシュとCookieのクリア',
      '別のブラウザでの動作確認'
    ],
    debugSteps: [
      'ブラウザのコンソールでエラー詳細を確認',
      'ネットワークタブでHTTPステータスを確認'
    ]
  },
  
  support: {
    showContactInfo: true,
    helpUrl: '/help/system-errors',
    chatAvailable: true
  },
  
  accessibility: {
    ariaLabel: 'システム内部エラーが発生しました',
    announceText: '重要なエラー。システム内部エラーです。サポートまでお問い合わせください。',
    role: 'alert'
  },
  
  ui: {
    icon: '⚠️',
    color: 'error',
    showRetryButton: true,
    showDetailsButton: true
  },
  
  logging: {
    level: 'error',
    sensitive: false,
    trackingId: 'INTERNAL_ERR'
  }
};

/**
 * 汎用未知エラー対応
 */
const UNKNOWN: ErrorDetails = {
  message: '予期しないエラーが発生しました。お手数ですが、サポートまでお問い合わせください。',
  title: '未知のエラー',
  type: 'UNKNOWN',
  category: 'SYSTEM',
  severity: 'HIGH',
  
  guidance: {
    steps: [
      'ページを再読み込みしてください',
      '改善しない場合は、ブラウザを再起動してください',
      '問題が続く場合は、サポートまでご連絡ください'
    ],
    quickFix: 'ページの再読み込み',
    preventionTips: [
      'ブラウザを最新版に更新してください',
      '定期的にキャッシュをクリアしてください'
    ]
  },
  
  troubleshooting: {
    checkpoints: [
      'JavaScriptが有効になっているか確認',
      '広告ブロッカーを一時的に無効化',
      'ブラウザの拡張機能を無効化',
      '別のデバイスで同じ現象が起きるか確認'
    ]
  },
  
  support: {
    showContactInfo: true,
    helpUrl: '/help/general-errors',
    chatAvailable: true
  },
  
  accessibility: {
    ariaLabel: '未知のエラーが発生しました',
    announceText: 'エラー。予期しない問題が発生しました。',
    role: 'alert'
  },
  
  ui: {
    icon: '❓',
    color: 'error',
    showRetryButton: true,
    showDetailsButton: true
  },
  
  logging: {
    level: 'error',
    sensitive: false,
    trackingId: 'UNKNOWN_ERR'
  }
};

/**
 * エラー辞書 - すべてのエラータイプを含む
 */
export const ERROR_MESSAGES: Record<ErrorType, ErrorDetails> = {
  DATABASE_CONNECTION,
  EMAIL_SERVER,
  RATE_LIMIT,
  VALIDATION,
  NETWORK,
  TIMEOUT,
  AUTHENTICATION: {
    message: '認証に失敗しました。ログイン情報をご確認ください。',
    title: '認証エラー',
    type: 'AUTHENTICATION',
    category: 'SECURITY',
    severity: 'HIGH',
    guidance: {
      steps: [
        'ユーザー名とパスワードを確認してください',
        'アカウントがロックされていないか確認',
        'パスワードリセットをお試しください'
      ],
      quickFix: 'ログイン情報の確認'
    },
    troubleshooting: {
      checkpoints: ['Caps Lockの確認', 'キーボード言語設定の確認']
    },
    support: {
      showContactInfo: true,
      helpUrl: '/help/authentication'
    },
    accessibility: {
      ariaLabel: '認証エラー',
      role: 'alert'
    },
    ui: {
      icon: '🔐',
      color: 'error',
      showRetryButton: true,
      showDetailsButton: true
    },
    logging: {
      level: 'warn',
      sensitive: true,
      trackingId: 'AUTH_ERR'
    }
  },
  AUTHORIZATION: {
    message: 'この操作を実行する権限がありません。',
    title: '権限エラー',
    type: 'AUTHORIZATION',
    category: 'SECURITY',
    severity: 'MEDIUM',
    guidance: {
      steps: [
        '管理者に権限の確認をお願いしてください',
        'アカウントの種類をご確認ください'
      ],
      quickFix: '管理者に連絡'
    },
    troubleshooting: {
      checkpoints: ['ログインユーザーの確認', '権限設定の確認']
    },
    support: {
      showContactInfo: true
    },
    accessibility: {
      ariaLabel: '権限エラー',
      role: 'alert'
    },
    ui: {
      icon: '🚫',
      color: 'error',
      showRetryButton: false,
      showDetailsButton: true
    },
    logging: {
      level: 'warn',
      sensitive: true,
      trackingId: 'AUTHZ_ERR'
    }
  },
  NOT_FOUND: {
    message: '指定されたページまたは情報が見つかりません。',
    title: 'ページが見つかりません',
    type: 'NOT_FOUND',
    category: 'USER_INPUT',
    severity: 'LOW',
    guidance: {
      steps: [
        'URLを確認してください',
        'ホームページから目的のページに移動',
        '検索機能をご利用ください'
      ],
      quickFix: 'URLの確認'
    },
    troubleshooting: {
      checkpoints: ['URL入力ミスの確認', 'ブックマークの更新']
    },
    support: {
      showContactInfo: false,
      helpUrl: '/sitemap'
    },
    accessibility: {
      ariaLabel: 'ページ未発見エラー',
      role: 'status'
    },
    ui: {
      icon: '🔍',
      color: 'info',
      showRetryButton: false,
      showDetailsButton: false
    },
    logging: {
      level: 'info',
      sensitive: false,
      trackingId: '404_ERR'
    }
  },
  INTERNAL_SERVER,
  CLIENT_ERROR: {
    message: 'リクエストに不備があります。入力内容をご確認ください。',
    title: 'リクエストエラー',
    type: 'CLIENT_ERROR',
    category: 'USER_INPUT',
    severity: 'MEDIUM',
    guidance: {
      steps: [
        '入力内容を確認してください',
        'ページを再読み込みしてください'
      ],
      quickFix: '入力内容の確認'
    },
    troubleshooting: {
      checkpoints: ['フォーム入力の再確認', 'ブラウザキャッシュのクリア']
    },
    support: {
      showContactInfo: false
    },
    accessibility: {
      ariaLabel: 'クライアントエラー',
      role: 'alert'
    },
    ui: {
      icon: '📝',
      color: 'warning',
      showRetryButton: true,
      showDetailsButton: false
    },
    logging: {
      level: 'info',
      sensitive: false,
      trackingId: 'CLIENT_ERR'
    }
  },
  UNKNOWN
};

/**
 * デバッグ専門家による詳細エラー情報生成
 */
export interface DetailedError extends ErrorDetails {
  timestamp: string;
  errorId: string;
  userAgent?: string;
  url?: string;
  stackTrace?: string;
  context?: Record<string, any>;
}

/**
 * エラー詳細情報の生成
 */
export function createDetailedError(
  errorType: ErrorType,
  additionalInfo?: {
    context?: Record<string, any>;
    stackTrace?: string;
    userAgent?: string;
    url?: string;
  }
): DetailedError {
  const baseError = ERROR_MESSAGES[errorType];
  const timestamp = new Date().toISOString();
  const errorId = `${baseError.logging.trackingId}_${Date.now()}`;
  
  return {
    ...baseError,
    timestamp,
    errorId,
    userAgent: additionalInfo?.userAgent,
    url: additionalInfo?.url,
    stackTrace: additionalInfo?.stackTrace,
    context: additionalInfo?.context
  };
}

/**
 * 国際化専門家による言語対応のヘルパー関数
 */
export function getErrorMessage(errorType: ErrorType, locale: string = 'ja'): ErrorDetails {
  // 将来的に英語などの他言語対応
  if (locale === 'ja') {
    return ERROR_MESSAGES[errorType];
  }
  
  // フォールバック
  return ERROR_MESSAGES[errorType];
}

/**
 * ログレベル判定ヘルパー
 */
export function shouldLogError(errorDetails: ErrorDetails): boolean {
  return errorDetails.logging.level === 'error' || 
         errorDetails.severity === 'CRITICAL';
}

/**
 * エラー通知ヘルパー
 */
export function shouldNotifyUser(errorDetails: ErrorDetails): boolean {
  return errorDetails.category !== 'SYSTEM' || 
         errorDetails.severity === 'CRITICAL';
}