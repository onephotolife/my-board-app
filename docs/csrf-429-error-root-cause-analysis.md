# CSRF 429 Too Many Requests エラー - 根本原因分析レポート

## 調査日時
2025年8月31日

## 問題の概要
http://localhost:3000/ にアクセスした際、以下のエラーが発生：
- `Error: CSRF token fetch failed: 429 Too Many Requests`
- CSRFトークン取得時にレート制限（429エラー）に到達
- NextAuthのCLIENT_FETCH_ERRORも併発

## 調査実施者
天才デバッグエキスパート会議（4名）
- Expert 1 (FE/React): CSRFProvider・初期化フロー担当
- Expert 2 (BE/API): レート制限・エンドポイント設計担当
- Expert 3 (Security): CSRF保護・認証フロー担当
- Expert 4 (Performance): 並列リクエスト・最適化担当

## 問題の真の原因

### 1. 根本原因：CSRFトークン取得の多重実行

#### 1.1 React.StrictModeによるdouble rendering
- **ファイル**: `next.config.ts`（行9）
- **設定**: `reactStrictMode: true`
- **影響**: 開発環境でコンポーネントが2回レンダリングされる

#### 1.2 CSRFProviderの強制的なトークン取得
- **ファイル**: `src/components/CSRFProvider.tsx`（行98）
- **問題コード**:
```typescript
useEffect(() => {
    // 初回マウント時にトークンを取得（強制実行）
    fetchToken(true);  // <- 強制的に実行
    // ...
}, []);
```
- **影響**: マウント時に必ずトークン取得APIを呼び出す

#### 1.3 initial-data-fetcherによる重複取得
- **ファイル**: `src/lib/initial-data-fetcher.ts`（行79）
- **問題コード**:
```typescript
// CSRFトークン取得
fetch('/api/csrf/token', {
    headers: {
        'Content-Type': 'application/json',
    },
    credentials: 'include',
})
```
- **影響**: Providerの初期化時に別途CSRFトークンを取得

#### 1.4 CSRFTokenManagerのリトライメカニズム
- **ファイル**: `src/lib/security/csrf-token-manager.ts`（行106-114）
- **リトライ設定**: 最大3回、指数バックオフ（2秒、4秒、8秒）
- **影響**: エラー時に自動的に再試行し、リクエスト数が倍増

### 2. レート制限の設定

#### 2.1 apiRateLimiterの設定
- **ファイル**: `src/lib/security/rate-limiter-v2.ts`（行130-134）
- **設定値**: 200 req/min（開発環境）
```typescript
export const apiRateLimiter = new RateLimiterV2({
  max: 200, // 開発環境用に大幅緩和: 200req/min
  window: 60000,
  maxItems: 10000,
});
```

#### 2.2 CSRFエンドポイントのレート制限適用
- **ファイル**: `src/middleware.ts`（行99-104）
- **適用**: `/api/csrf`にはapiRateLimiterが適用される

### 3. Provider階層の複雑な初期化

#### 3.1 Provider階層構造
```
SessionProvider
└── ProvidersWithData
    ├── UserProvider (initialData依存)
    ├── PermissionProvider (initialData依存)
    └── CSRFProvider (initialToken依存)
        └── ConditionalSocketProvider
            └── QueryProvider
                └── SNSProvider
                    └── ThemeProvider
```

#### 3.2 各Providerの初期化タイミング
1. **SessionProvider**: セッション管理
2. **ProvidersWithData**: セッション確立後、initial-data-fetcherで並列取得
3. **UserProvider**: `/api/profile`を呼び出し（initialDataがない場合）
4. **PermissionProvider**: `/api/user/permissions`を呼び出し（initialDataがない場合）
5. **CSRFProvider**: `/api/csrf`を強制的に呼び出し（fetchToken(true)）

## 問題発生のメカニズム

### シーケンス分析
1. **ページアクセス時**
   - React.StrictModeにより、コンポーネントが2回マウント

2. **1回目のマウント**
   - ProvidersWithData: initial-data-fetcher実行
     - `/api/csrf/token` リクエスト（1）
   - CSRFProvider: fetchToken(true)実行
     - `/api/csrf` リクエスト（2）

3. **2回目のマウント（StrictMode）**
   - ProvidersWithData: initial-data-fetcher実行
     - `/api/csrf/token` リクエスト（3）
   - CSRFProvider: fetchToken(true)実行
     - `/api/csrf` リクエスト（4）

4. **リトライメカニズム発動**
   - 429エラー発生後、各リクエストが最大3回リトライ
   - 合計リクエスト数: 4 × (1 + 3) = 16リクエスト

5. **visibilitychangeイベント**
   - タブフォーカス時に追加のトークン取得（デバウンス1秒）

### 実際のリクエスト数計算
- 基本リクエスト: 4回（StrictMode × 2、2つのエンドポイント）
- リトライ: 各3回まで
- 最大リクエスト数: 16回/初期化
- レート制限: 200 req/min
- **結果**: 短時間に大量のリクエストが発生し、レート制限に到達

## 影響範囲

### 1. ユーザー体験への影響
- ページ初回アクセス時にエラー表示
- CSRFトークン取得失敗によりフォーム送信不可
- 認証フローの中断

### 2. システムへの影響
- APIサーバーへの過剰な負荷
- レート制限によるサービス拒否状態
- エラーログの大量生成

### 3. 開発効率への影響
- 開発環境での頻繁なエラー発生
- デバッグの困難化
- テスト実行の失敗

## 推奨される解決策

### 即座の対策（緊急度：高）

#### 1. CSRFProviderの初期化ロジック改善
```typescript
// CSRFProvider.tsx（行96-98）の修正案
useEffect(() => {
    // initialTokenがある場合はスキップ
    if (!initialToken) {
        fetchToken(false); // 強制実行を無効化
    }
}, [initialToken]);
```

#### 2. initial-data-fetcherの最適化
```typescript
// CSRFトークン取得を条件付きに
if (!session.csrfToken) { // セッションに既存トークンがない場合のみ
    // CSRFトークン取得処理
}
```

#### 3. レート制限の緩和（開発環境）
```typescript
// CSRFエンドポイント専用の緩い制限を設定
export const csrfRateLimiter = new RateLimiterV2({
  max: 500, // CSRF専用: 500req/min
  window: 60000,
  maxItems: 10000,
});
```

### 中期的な改善（優先度：中）

#### 1. トークン管理の一元化
- CSRFTokenManagerのシングルトンパターンを強化
- Provider間でのトークン共有メカニズム実装
- キャッシング戦略の改善

#### 2. Provider階層の最適化
- 不要な再レンダリングの防止
- React.memoによるメモ化
- useMemoとuseCallbackの適切な使用

#### 3. エラーハンドリングの改善
- 429エラー時の適切なフォールバック
- ユーザーへの明確なエラーメッセージ
- 自動リカバリメカニズム

### 長期的な改善（優先度：低）

#### 1. アーキテクチャの見直し
- CSRFトークンのサーバーサイド管理
- Edge Functionでのトークン生成
- セッションベースのトークン管理

#### 2. パフォーマンス最適化
- 初期化の遅延実行
- 必要時のみのトークン取得
- バッチリクエストの実装

## テスト計画

### 1. 単体テスト
- CSRFTokenManagerのリトライロジック
- レート制限の動作確認
- Provider初期化のタイミング

### 2. 統合テスト（認証付き）
- 認証情報:
  - Email: one.photolife+1@gmail.com
  - Password: ?@thc123THC@?
- テスト項目:
  - ログイン後のCSRFトークン取得
  - Provider階層の初期化順序
  - レート制限の回避確認

### 3. E2Eテスト
- 実際のユーザーフローでの動作確認
- エラー発生時のリカバリ
- パフォーマンス計測

## 監視項目

### 1. メトリクス
- CSRFトークン取得の成功率
- 429エラーの発生頻度
- APIレスポンスタイム

### 2. ログ
- CSRFトークン取得のタイミング
- リトライ回数と間隔
- Provider初期化の順序

### 3. アラート
- 429エラー率が閾値を超えた場合
- CSRFトークン取得の連続失敗
- レート制限の頻繁な発動

## まとめ

### 問題の本質
React.StrictModeとProvider階層の複雑な初期化により、CSRFトークン取得APIが短時間に大量に呼び出され、レート制限（429エラー）に到達している。

### 重要な発見
1. CSRFProviderの`fetchToken(true)`による強制実行が主要因
2. initial-data-fetcherによる重複取得が問題を悪化
3. リトライメカニズムがリクエスト数を倍増
4. React.StrictModeのdouble renderingが開発環境で問題を顕在化

### 次のアクション
1. **即座**: CSRFProviderの初期化ロジック修正
2. **今週中**: レート制限の調整とエラーハンドリング改善
3. **今月中**: Provider階層の最適化とテスト実装

## 参考資料

### 関連ファイル
- `/src/components/CSRFProvider.tsx`
- `/src/lib/security/csrf-token-manager.ts`
- `/src/lib/security/rate-limiter-v2.ts`
- `/src/middleware.ts`
- `/src/app/providers.tsx`
- `/src/lib/initial-data-fetcher.ts`
- `/next.config.ts`

### 関連ドキュメント
- [Next.js React Strict Mode](https://nextjs.org/docs/app/api-reference/next-config-js/reactStrictMode)
- [Rate Limiting Best Practices](https://www.cloudflare.com/learning/bots/what-is-rate-limiting/)
- [CSRF Protection in Next.js](https://nextjs.org/docs/app/building-your-application/configuring/csrf-protection)

---

*このレポートは2025年8月31日に作成されました。*
*作成者: 天才デバッグエキスパート会議*