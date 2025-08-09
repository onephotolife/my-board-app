# 天才14人会議による完璧なエラーハンドリングシステム

## 概要

このドキュメントは、14人の専門家チームによって設計された完璧なエラーハンドリングシステムの使用方法とメンテナンスガイドです。

## 専門家チーム構成

1. **UXライター** - 親切で具体的なエラーメッセージ作成
2. **エラー診断専門家** - エラー原因の特定と分類
3. **フロントエンド専門家** - ユーザーフレンドリーなエラー表示
4. **バックエンド専門家** - 詳細なエラーログとデバッグ情報
5. **データベース専門家** - MongoDB接続エラー対処
6. **ネットワーク専門家** - API通信エラー対処
7. **セキュリティ専門家** - エラー情報の適切な開示レベル
8. **アクセシビリティ専門家** - スクリーンリーダー対応
9. **国際化専門家** - 日本語エラーメッセージの最適化
10. **テスト専門家** - エラーケースの網羅的テスト
11. **デバッグ専門家** - エラー追跡とログ記録
12. **パフォーマンス専門家** - エラー処理の高速化
13. **モバイル専門家** - モバイル環境でのエラー表示
14. **ドキュメント専門家** - エラー対処法のガイド作成

## システム構成

### 1. エラーメッセージ辞書 (`/src/lib/utils/errorMessages.ts`)

すべてのエラータイプと対応する詳細情報を管理する中央辞書。

#### 主要エラータイプ

- **DATABASE_CONNECTION** - データベース接続エラー
- **EMAIL_SERVER** - メールサーバーエラー  
- **RATE_LIMIT** - レート制限エラー
- **VALIDATION** - バリデーションエラー
- **NETWORK** - ネットワークエラー
- **TIMEOUT** - タイムアウトエラー
- **AUTHENTICATION** - 認証エラー
- **AUTHORIZATION** - 認可エラー
- **NOT_FOUND** - リソース未発見エラー
- **INTERNAL_SERVER** - 内部サーバーエラー
- **CLIENT_ERROR** - クライアントエラー
- **UNKNOWN** - 未知のエラー

#### エラー詳細情報構造

```typescript
interface ErrorDetails {
  message: string;           // ユーザー向けメッセージ
  title?: string;           // エラータイトル
  type: ErrorType;          // エラータイプ
  category: ErrorCategory;  // エラーカテゴリー
  severity: ErrorSeverity;  // 重要度
  guidance: {               // ユーザーガイダンス
    steps: string[];
    quickFix?: string;
    preventionTips?: string[];
  };
  troubleshooting: {        // トラブルシューティング
    checkpoints: string[];
    debugSteps?: string[];
    logReferences?: string[];
  };
  support: {               // サポート情報
    showContactInfo: boolean;
    helpUrl?: string;
    chatAvailable?: boolean;
  };
  accessibility: {         // アクセシビリティ対応
    ariaLabel: string;
    announceText?: string;
    role: 'alert' | 'status';
  };
  ui: {                   // UI表示設定
    icon: string;
    color: 'error' | 'warning' | 'info';
    showRetryButton: boolean;
    showDetailsButton: boolean;
    autoHide?: number;
  };
  logging: {              // ログ設定
    level: 'error' | 'warn' | 'info' | 'debug';
    sensitive: boolean;
    trackingId?: string;
  };
}
```

### 2. エラー表示コンポーネント (`/src/components/ErrorDisplay.tsx`)

#### ErrorDisplay コンポーネント

メインのエラー表示コンポーネント。詳細なエラー情報とアクションボタンを提供。

```tsx
<ErrorDisplay
  errorType="DATABASE_CONNECTION"
  additionalInfo={{
    message: "カスタムメッセージ",
    errorId: "ERR_001",
    timestamp: "2025-01-08T10:00:00Z"
  }}
  onClose={() => setError(null)}
  onRetry={handleRetry}
  customActions={[
    {
      label: "サポートに連絡",
      action: () => openSupport(),
      variant: "secondary"
    }
  ]}
  size="medium"
  inline={false}
/>
```

#### ErrorToast コンポーネント  

軽量な通知用エラー表示。

```tsx
<ErrorToast
  errorType="NETWORK"
  message="接続エラーが発生しました"
  onClose={() => setShowToast(false)}
  duration={5000}
/>
```

### 3. バックエンドエラー処理

#### 統一されたエラーレスポンス形式

```json
{
  "error": "データベースに接続できませんでした...",
  "type": "DATABASE_CONNECTION",
  "errorId": "DB_CONN_ERR_1704627600000",
  "timestamp": "2025-01-08T10:00:00.000Z",
  "guidance": {
    "steps": ["1-2分お待ちいただき..."],
    "quickFix": "少し時間をおいてから再度アクセス"
  },
  "troubleshooting": {
    "checkpoints": ["インターネット接続を確認", "..."]
  },
  "support": {
    "showContactInfo": true,
    "helpUrl": "/help/database-issues",
    "chatAvailable": true
  },
  "ui": {
    "icon": "🔌",
    "color": "error",
    "showRetryButton": true,
    "showDetailsButton": true
  }
}
```

## 使用方法

### 1. フロントエンドでの使用

```tsx
import ErrorDisplay from '@/components/ErrorDisplay';
import { ErrorType } from '@/lib/utils/errorMessages';

function MyComponent() {
  const [error, setError] = useState<{
    type: ErrorType;
    message: string;
    details?: any;
  } | null>(null);

  const handleApiCall = async () => {
    try {
      const response = await fetch('/api/endpoint');
      const data = await response.json();
      
      if (!response.ok) {
        setError({
          type: data.type || 'UNKNOWN',
          message: data.error,
          details: {
            errorId: data.errorId,
            timestamp: data.timestamp,
            guidance: data.guidance
          }
        });
      }
    } catch (networkError) {
      setError({
        type: 'NETWORK',
        message: 'ネットワークエラーが発生しました'
      });
    }
  };

  return (
    <div>
      {error && (
        <ErrorDisplay
          errorType={error.type}
          additionalInfo={{
            message: error.message,
            ...error.details
          }}
          onClose={() => setError(null)}
          onRetry={handleApiCall}
        />
      )}
    </div>
  );
}
```

### 2. バックエンドでの使用

```typescript
import { createDetailedError, ErrorType } from '@/lib/utils/errorMessages';

export async function POST(request: NextRequest) {
  try {
    // API処理...
  } catch (error) {
    // エラータイプの判定
    let errorType: ErrorType = 'INTERNAL_SERVER';
    
    if (error.message.includes('database')) {
      errorType = 'DATABASE_CONNECTION';
    } else if (error.message.includes('timeout')) {
      errorType = 'TIMEOUT';
    }
    
    // 詳細なエラー情報の作成
    const errorDetails = createDetailedError(errorType, {
      context: {
        operation: 'user_registration',
        step: 'database_save'
      },
      userAgent: request.headers.get('user-agent'),
      url: request.url
    });
    
    return NextResponse.json(
      {
        error: errorDetails.message,
        type: errorType,
        errorId: errorDetails.errorId,
        timestamp: errorDetails.timestamp,
        guidance: errorDetails.guidance,
        support: errorDetails.support,
        ui: errorDetails.ui
      },
      { status: 500 }
    );
  }
}
```

## エラータイプ別対処法

### データベース接続エラー

**症状**: データベースへの接続が失敗する

**原因**:
- MongoDB Atlas接続文字列の設定ミス
- ネットワーク接続問題
- データベースサーバーのメンテナンス
- IP制限による接続拒否

**対処法**:
1. 接続文字列の確認
2. ネットワーク接続状況確認
3. MongoDB Atlasのサービス状況確認
4. IP白名単の設定確認

### メールサーバーエラー

**症状**: メール送信が失敗する

**原因**:
- SMTP設定の誤り
- メールサーバーの一時的な障害
- 送信制限に達している
- 認証情報の誤り

**対処法**:
1. SMTP設定の確認
2. メール認証情報の確認
3. 送信制限の確認
4. メールサーバーのステータス確認

### レート制限エラー

**症状**: 短時間に多数のリクエストで制限される

**原因**:
- API呼び出し頻度が制限値を超過
- 同一IPからの過度なアクセス
- ボット的な動作の検出

**対処法**:
1. リクエスト間隔の調整
2. キャッシュの活用
3. 適切なリトライ戦略の実装

### バリデーションエラー

**症状**: 入力値が要件を満たさない

**原因**:
- 必須項目の未入力
- 形式不正（メールアドレス等）
- 文字数制限超過
- 禁止文字の使用

**対処法**:
1. 入力要件の明確化
2. リアルタイムバリデーション
3. エラーメッセージの具体化

## テスト方法

### 1. エラーケースの網羅テスト

```typescript
describe('Error Handling System', () => {
  test('データベース接続エラーの処理', async () => {
    // データベース接続を無効化
    jest.spyOn(dbConnect, 'connect').mockRejectedValue(
      new Error('Connection failed')
    );
    
    const response = await request(app)
      .post('/api/auth/request-reset')
      .send({ email: 'test@example.com' });
    
    expect(response.status).toBe(500);
    expect(response.body.type).toBe('DATABASE_CONNECTION');
    expect(response.body.errorId).toMatch(/^DB_CONN_ERR_\d+$/);
    expect(response.body.guidance.steps).toHaveLength(3);
  });
  
  test('レート制限エラーの処理', async () => {
    // 制限回数分リクエスト実行
    for (let i = 0; i < 4; i++) {
      const response = await request(app)
        .post('/api/auth/request-reset')
        .send({ email: 'test@example.com' });
        
      if (i === 3) {
        expect(response.status).toBe(429);
        expect(response.body.type).toBe('RATE_LIMIT');
        expect(response.headers['retry-after']).toBeDefined();
      }
    }
  });
});
```

### 2. アクセシビリティテスト

```typescript
describe('Error Display Accessibility', () => {
  test('スクリーンリーダー対応', () => {
    render(
      <ErrorDisplay 
        errorType="DATABASE_CONNECTION" 
        onClose={() => {}}
      />
    );
    
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByLabelText(
      'データベース接続エラーが発生しました'
    )).toBeInTheDocument();
  });
  
  test('キーボード操作対応', () => {
    const onRetry = jest.fn();
    render(
      <ErrorDisplay 
        errorType="NETWORK" 
        onRetry={onRetry}
      />
    );
    
    const retryButton = screen.getByText('🔄 再試行');
    retryButton.focus();
    fireEvent.keyDown(retryButton, { key: 'Enter' });
    
    expect(onRetry).toHaveBeenCalled();
  });
});
```

## メンテナンス

### 1. 新しいエラータイプの追加

1. `errorMessages.ts`に新しいエラータイプを定義
2. `ErrorType`型に追加
3. `ERROR_MESSAGES`辞書に詳細情報を追加
4. 対応するテストケースを作成

### 2. エラーメッセージの更新

1. UXライターがメッセージを見直し
2. 国際化専門家が言語対応を確認
3. アクセシビリティ専門家がスクリーンリーダー対応を検証
4. テスト専門家がテストケースを更新

### 3. パフォーマンス監視

```typescript
// エラー発生頻度の監視
const errorMetrics = {
  total: 0,
  byType: new Map<ErrorType, number>(),
  byHour: new Map<string, number>()
};

export function trackError(errorType: ErrorType) {
  errorMetrics.total++;
  errorMetrics.byType.set(
    errorType, 
    (errorMetrics.byType.get(errorType) || 0) + 1
  );
  
  const hour = new Date().toISOString().slice(0, 13);
  errorMetrics.byHour.set(
    hour,
    (errorMetrics.byHour.get(hour) || 0) + 1
  );
}
```

## ベストプラクティス

1. **統一されたエラー処理**: すべてのエラーは統一された形式で処理する
2. **セキュリティ配慮**: 機密情報を含むエラーは適切にマスクする  
3. **ユーザーフレンドリー**: 技術的詳細ではなく、ユーザーが理解できる言葉を使用
4. **アクション指向**: 単なるエラー通知ではなく、解決策を提示
5. **アクセシビリティ**: スクリーンリーダーやキーボード操作に対応
6. **国際化対応**: 将来の多言語対応を考慮した設計
7. **パフォーマンス**: エラー処理がシステム全体のパフォーマンスに影響しないよう配慮

## トラブルシューティング

### よくある問題

#### 1. エラーコンポーネントが表示されない

**原因**: TypeScriptの型エラーまたは依存関係の問題

**解決法**:
```bash
npm install
npm run type-check
```

#### 2. エラーメッセージが英語で表示される

**原因**: 国際化設定またはフォールバック処理の問題

**解決法**:
```typescript
// errorMessages.tsの確認
export function getErrorMessage(errorType: ErrorType, locale: string = 'ja'): ErrorDetails {
  if (locale === 'ja') {
    return ERROR_MESSAGES[errorType];
  }
  return ERROR_MESSAGES[errorType]; // フォールバック
}
```

#### 3. アクセシビリティ警告

**原因**: スクリーンリーダー対応の不備

**解決法**:
- `role="alert"`の追加
- `aria-label`の設定
- `aria-live="polite"`の設定

この完璧なエラーハンドリングシステムにより、ユーザーは問題発生時にも安心してアプリケーションを利用できます。