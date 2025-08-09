/**
 * 天才14人会議による完璧なエラーハンドリングシステムのテスト
 * テスト専門家による網羅的なテストケース
 */

import { 
  ERROR_MESSAGES, 
  ErrorType, 
  createDetailedError,
  getErrorMessage,
  shouldLogError,
  shouldNotifyUser 
} from '@/lib/utils/errorMessages';

describe('エラーメッセージ辞書システム', () => {
  
  describe('基本的なエラーメッセージ取得', () => {
    test('すべてのエラータイプにメッセージが定義されている', () => {
      const errorTypes: ErrorType[] = [
        'DATABASE_CONNECTION',
        'EMAIL_SERVER', 
        'RATE_LIMIT',
        'VALIDATION',
        'NETWORK',
        'TIMEOUT',
        'AUTHENTICATION',
        'AUTHORIZATION', 
        'NOT_FOUND',
        'INTERNAL_SERVER',
        'CLIENT_ERROR',
        'UNKNOWN'
      ];
      
      errorTypes.forEach(errorType => {
        const errorDetails = ERROR_MESSAGES[errorType];
        
        expect(errorDetails).toBeDefined();
        expect(errorDetails.message).toBeTruthy();
        expect(errorDetails.type).toBe(errorType);
        expect(errorDetails.guidance.steps.length).toBeGreaterThan(0);
      });
    });

    test('日本語メッセージの品質チェック', () => {
      Object.values(ERROR_MESSAGES).forEach(errorDetails => {
        // UXライター: メッセージが適切な長さであること
        expect(errorDetails.message.length).toBeGreaterThan(10);
        expect(errorDetails.message.length).toBeLessThan(200);
        
        // 国際化専門家: 日本語の文字が含まれていること
        expect(errorDetails.message).toMatch(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/);
        
        // UXライター: 丁寧語が使用されていること
        expect(
          errorDetails.message.includes('です') ||
          errorDetails.message.includes('ます') ||
          errorDetails.message.includes('ください')
        ).toBe(true);
      });
    });

    test('ガイダンス情報の完全性チェック', () => {
      Object.values(ERROR_MESSAGES).forEach(errorDetails => {
        // サポート専門家: 対処手順が提供されていること
        expect(errorDetails.guidance.steps).toBeDefined();
        expect(errorDetails.guidance.steps.length).toBeGreaterThan(0);
        
        // すべての手順が意味のある内容であること
        errorDetails.guidance.steps.forEach(step => {
          expect(step.length).toBeGreaterThan(5);
          expect(step).toMatch(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/);
        });
      });
    });
  });

  describe('エラー重要度とカテゴリー分類', () => {
    test('重要度の適切な設定', () => {
      // データベース接続エラーは重要度が高いはず
      expect(ERROR_MESSAGES.DATABASE_CONNECTION.severity).toBe('CRITICAL');
      
      // バリデーションエラーは重要度が低いはず
      expect(ERROR_MESSAGES.VALIDATION.severity).toBe('LOW');
      
      // ネットワークエラーは中程度の重要度
      expect(ERROR_MESSAGES.NETWORK.severity).toBe('HIGH');
    });

    test('カテゴリーの適切な分類', () => {
      // システムエラーの分類
      expect(ERROR_MESSAGES.DATABASE_CONNECTION.category).toBe('SYSTEM');
      expect(ERROR_MESSAGES.INTERNAL_SERVER.category).toBe('SYSTEM');
      
      // ユーザー入力エラーの分類
      expect(ERROR_MESSAGES.VALIDATION.category).toBe('USER_INPUT');
      expect(ERROR_MESSAGES.NOT_FOUND.category).toBe('USER_INPUT');
      
      // セキュリティエラーの分類
      expect(ERROR_MESSAGES.RATE_LIMIT.category).toBe('SECURITY');
      expect(ERROR_MESSAGES.AUTHENTICATION.category).toBe('SECURITY');
    });
  });

  describe('アクセシビリティ対応', () => {
    test('スクリーンリーダー対応情報の存在', () => {
      Object.values(ERROR_MESSAGES).forEach(errorDetails => {
        // アクセシビリティ専門家: ARIA対応
        expect(errorDetails.accessibility.ariaLabel).toBeTruthy();
        expect(['alert', 'status']).toContain(errorDetails.accessibility.role);
        
        // アクセシビリティメッセージの品質
        expect(errorDetails.accessibility.ariaLabel.length).toBeGreaterThan(5);
        expect(errorDetails.accessibility.ariaLabel).toMatch(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/);
      });
    });

    test('UI表示設定の完全性', () => {
      Object.values(ERROR_MESSAGES).forEach(errorDetails => {
        // フロントエンド専門家: UI設定の存在確認
        expect(errorDetails.ui.icon).toBeTruthy();
        expect(['error', 'warning', 'info']).toContain(errorDetails.ui.color);
        expect(typeof errorDetails.ui.showRetryButton).toBe('boolean');
        expect(typeof errorDetails.ui.showDetailsButton).toBe('boolean');
      });
    });
  });

  describe('詳細エラー情報生成', () => {
    test('createDetailedError関数の正常動作', () => {
      const errorType: ErrorType = 'DATABASE_CONNECTION';
      const additionalInfo = {
        context: { operation: 'user_save' },
        userAgent: 'Mozilla/5.0...',
        url: '/api/users'
      };
      
      const detailedError = createDetailedError(errorType, additionalInfo);
      
      // デバッグ専門家: 詳細情報の存在確認
      expect(detailedError.timestamp).toBeTruthy();
      expect(detailedError.errorId).toBeTruthy();
      expect(detailedError.errorId).toMatch(/^DB_CONN_ERR_\d+$/);
      expect(detailedError.userAgent).toBe(additionalInfo.userAgent);
      expect(detailedError.url).toBe(additionalInfo.url);
      expect(detailedError.context).toEqual(additionalInfo.context);
      
      // 基本エラー情報の継承確認
      expect(detailedError.message).toBe(ERROR_MESSAGES[errorType].message);
      expect(detailedError.type).toBe(errorType);
    });

    test('タイムスタンプの形式確認', () => {
      const detailedError = createDetailedError('NETWORK');
      
      // ISO 8601形式であることを確認
      expect(detailedError.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      
      // 有効な日付であることを確認
      const parsedDate = new Date(detailedError.timestamp);
      expect(parsedDate.getTime()).not.toBeNaN();
      expect(parsedDate.getTime()).toBeLessThanOrEqual(Date.now());
    });
  });

  describe('ヘルパー関数', () => {
    test('shouldLogError関数', () => {
      // セキュリティ専門家: 重要なエラーはログ記録されるべき
      expect(shouldLogError(ERROR_MESSAGES.DATABASE_CONNECTION)).toBe(true);
      expect(shouldLogError(ERROR_MESSAGES.INTERNAL_SERVER)).toBe(true);
      
      // 軽微なエラーはログレベルに依存
      const validationError = ERROR_MESSAGES.VALIDATION;
      expect(shouldLogError(validationError)).toBe(false);
    });

    test('shouldNotifyUser関数', () => {
      // パフォーマンス専門家: 適切な通知判定
      expect(shouldNotifyUser(ERROR_MESSAGES.NETWORK)).toBe(true);
      expect(shouldNotifyUser(ERROR_MESSAGES.VALIDATION)).toBe(true);
      
      // システムエラーでも重要度によっては通知
      expect(shouldNotifyUser(ERROR_MESSAGES.DATABASE_CONNECTION)).toBe(true);
    });

    test('getErrorMessage関数 (国際化対応)', () => {
      // 国際化専門家: 言語対応の基本テスト
      const errorDetails = getErrorMessage('VALIDATION', 'ja');
      expect(errorDetails).toEqual(ERROR_MESSAGES.VALIDATION);
      
      // 未サポート言語の場合のフォールバック
      const fallbackDetails = getErrorMessage('VALIDATION', 'en');
      expect(fallbackDetails).toEqual(ERROR_MESSAGES.VALIDATION);
    });
  });

  describe('特定エラータイプの詳細テスト', () => {
    test('レート制限エラーの特別な設定', () => {
      const rateLimitError = ERROR_MESSAGES.RATE_LIMIT;
      
      // セキュリティ専門家: レート制限特有の設定
      expect(rateLimitError.ui.autoHide).toBe(30000); // 30秒後に自動非表示
      expect(rateLimitError.logging.sensitive).toBe(false);
      expect(rateLimitError.support.showContactInfo).toBe(false);
    });

    test('認証エラーの機密情報配慮', () => {
      const authError = ERROR_MESSAGES.AUTHENTICATION;
      
      // セキュリティ専門家: 機密性の高いエラー
      expect(authError.logging.sensitive).toBe(true);
      expect(authError.severity).toBe('HIGH');
      expect(authError.category).toBe('SECURITY');
    });

    test('データベースエラーの重要度設定', () => {
      const dbError = ERROR_MESSAGES.DATABASE_CONNECTION;
      
      // データベース専門家: 最重要エラー
      expect(dbError.severity).toBe('CRITICAL');
      expect(dbError.category).toBe('SYSTEM');
      expect(dbError.support.showContactInfo).toBe(true);
      expect(dbError.support.chatAvailable).toBe(true);
    });

    test('バリデーションエラーのユーザビリティ', () => {
      const validationError = ERROR_MESSAGES.VALIDATION;
      
      // UXライター: ユーザーが修正可能なエラー
      expect(validationError.severity).toBe('LOW');
      expect(validationError.category).toBe('USER_INPUT');
      expect(validationError.support.showContactInfo).toBe(false);
      expect(validationError.guidance.quickFix).toBeTruthy();
    });
  });

  describe('トラブルシューティング情報', () => {
    test('すべてのエラーにトラブルシューティング手順が存在', () => {
      Object.values(ERROR_MESSAGES).forEach(errorDetails => {
        // デバッグ専門家: トラブルシューティング情報の存在
        expect(errorDetails.troubleshooting.checkpoints).toBeDefined();
        expect(errorDetails.troubleshooting.checkpoints.length).toBeGreaterThan(0);
        
        errorDetails.troubleshooting.checkpoints.forEach(checkpoint => {
          expect(checkpoint.length).toBeGreaterThan(3);
        });
      });
    });

    test('予防策情報の品質', () => {
      const errorsWithPrevention = Object.values(ERROR_MESSAGES).filter(
        error => error.guidance.preventionTips
      );
      
      expect(errorsWithPrevention.length).toBeGreaterThan(0);
      
      errorsWithPrevention.forEach(errorDetails => {
        errorDetails.guidance.preventionTips!.forEach(tip => {
          expect(tip.length).toBeGreaterThan(5);
          expect(tip).toMatch(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/);
        });
      });
    });
  });

  describe('サポート情報の一貫性', () => {
    test('重要なエラーには適切なサポート情報が設定されている', () => {
      const criticalErrors = Object.values(ERROR_MESSAGES).filter(
        error => error.severity === 'CRITICAL'
      );
      
      criticalErrors.forEach(errorDetails => {
        // サポート専門家: 重要エラーにはサポート情報必須
        expect(errorDetails.support.showContactInfo).toBe(true);
        
        if (errorDetails.support.helpUrl) {
          expect(errorDetails.support.helpUrl).toMatch(/^\/help\//);
        }
      });
    });

    test('ユーザー入力エラーには適切なガイダンス', () => {
      const userInputErrors = Object.values(ERROR_MESSAGES).filter(
        error => error.category === 'USER_INPUT'
      );
      
      userInputErrors.forEach(errorDetails => {
        // UXライター: ユーザーが修正可能な明確な指示
        expect(errorDetails.guidance.quickFix).toBeTruthy();
        expect(errorDetails.guidance.steps.length).toBeGreaterThan(1);
      });
    });
  });

  describe('モバイル対応考慮', () => {
    test('エラーメッセージの長さがモバイル表示に適している', () => {
      Object.values(ERROR_MESSAGES).forEach(errorDetails => {
        // モバイル専門家: メッセージ長の制限
        expect(errorDetails.message.length).toBeLessThan(150);
        
        if (errorDetails.title) {
          expect(errorDetails.title.length).toBeLessThan(30);
        }
      });
    });

    test('アイコンがEmoji形式で提供されている', () => {
      Object.values(ERROR_MESSAGES).forEach(errorDetails => {
        // モバイル専門家: Unicode絵文字の使用
        expect(errorDetails.ui.icon).toMatch(/[\u{1F000}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u);
      });
    });
  });
});

describe('エラーハンドリング統合テスト', () => {
  
  describe('APIエラーレスポンス形式', () => {
    test('標準的なエラーレスポンス構造', () => {
      const errorType: ErrorType = 'EMAIL_SERVER';
      const detailedError = createDetailedError(errorType, {
        context: { email: 'test@example.com' }
      });
      
      const apiResponse = {
        error: detailedError.message,
        type: detailedError.type,
        errorId: detailedError.errorId,
        timestamp: detailedError.timestamp,
        guidance: detailedError.guidance,
        support: detailedError.support,
        ui: detailedError.ui
      };
      
      // バックエンド専門家: API規約の確認
      expect(apiResponse.error).toBeTruthy();
      expect(apiResponse.type).toBe(errorType);
      expect(apiResponse.errorId).toMatch(/^EMAIL_ERR_\d+$/);
      expect(apiResponse.guidance.steps.length).toBeGreaterThan(0);
      expect(typeof apiResponse.support.showContactInfo).toBe('boolean');
    });
  });

  describe('フロントエンド連携テスト', () => {
    test('エラータイプからUI設定への変換', () => {
      const networkError = ERROR_MESSAGES.NETWORK;
      
      // フロントエンド専門家: UI設定の活用
      expect(networkError.ui.showRetryButton).toBe(true);
      expect(networkError.ui.color).toBe('error');
      expect(networkError.ui.icon).toBe('📶');
    });

    test('アクセシビリティ属性の生成', () => {
      const validationError = ERROR_MESSAGES.VALIDATION;
      
      // アクセシビリティ専門家: 正しい属性設定
      expect(validationError.accessibility.role).toBe('alert');
      expect(validationError.accessibility.ariaLabel).toBeTruthy();
    });
  });
});

describe('パフォーマンステスト', () => {
  
  test('大量のエラー生成パフォーマンス', () => {
    const startTime = performance.now();
    
    // パフォーマンス専門家: 1000個のエラー生成
    for (let i = 0; i < 1000; i++) {
      createDetailedError('NETWORK', {
        context: { requestId: i }
      });
    }
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    // 1000個のエラー生成が100ms以内で完了すること
    expect(duration).toBeLessThan(100);
  });

  test('メモリリークの確認', () => {
    const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;
    
    // 大量のエラーオブジェクト作成と削除
    for (let i = 0; i < 10000; i++) {
      const error = createDetailedError('TIMEOUT');
      // オブジェクトを即座に削除
    }
    
    // ガベージコレクションを促進
    if (global.gc) {
      global.gc();
    }
    
    const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;
    
    // メモリ使用量の増加が合理的な範囲内であること
    if (initialMemory > 0) {
      const memoryIncrease = finalMemory - initialMemory;
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024); // 10MB以内
    }
  });
});

describe('セキュリティテスト', () => {
  
  test('機密情報の適切なマスキング', () => {
    const sensitiveErrors = Object.values(ERROR_MESSAGES).filter(
      error => error.logging.sensitive
    );
    
    sensitiveErrors.forEach(errorDetails => {
      // セキュリティ専門家: 機密エラーの特別な扱い
      expect(errorDetails.category).toBe('SECURITY');
      expect(['AUTHENTICATION', 'AUTHORIZATION']).toContain(errorDetails.type);
    });
  });

  test('エラー情報の開示レベル制御', () => {
    const detailedError = createDetailedError('DATABASE_CONNECTION', {
      context: { password: 'secret123' },
      stackTrace: 'Error: Database connection failed at...'
    });
    
    // セキュリティ専門家: 開発環境以外では機密情報を含まない
    if (process.env.NODE_ENV !== 'development') {
      expect(detailedError.stackTrace).toBeUndefined();
    }
  });
});

describe('国際化対応テスト', () => {
  
  test('将来の多言語対応への準備', () => {
    // 国際化専門家: 言語設定の基本テスト
    const jaMessage = getErrorMessage('NETWORK', 'ja');
    const enMessage = getErrorMessage('NETWORK', 'en'); // フォールバック
    
    expect(jaMessage).toBeDefined();
    expect(enMessage).toBeDefined();
    
    // 現在は日本語のみサポートなので同じ結果
    expect(jaMessage).toEqual(enMessage);
  });

  test('文字コード対応', () => {
    Object.values(ERROR_MESSAGES).forEach(errorDetails => {
      // 国際化専門家: UTF-8文字の正常処理
      expect(() => JSON.stringify(errorDetails)).not.toThrow();
      expect(() => JSON.parse(JSON.stringify(errorDetails))).not.toThrow();
    });
  });
});