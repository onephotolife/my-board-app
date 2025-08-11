# メール再送信機能 - 包括的検証テストプロンプト

## 目的
実装されたメール再送信機能を多角的かつ包括的に検証し、本番環境での安定稼働を保証するための徹底的なテストを実施する。

## テスト範囲と検証項目

### 1. 機能テスト (Functional Testing)

#### 1.1 基本機能検証
```yaml
test_cases:
  - name: "正常な再送信フロー"
    steps:
      1. 新規ユーザー登録
      2. 確認メール再送信リクエスト
      3. レスポンス検証
    expected:
      - status: 200
      - cooldownSeconds: 存在する
      - retriesRemaining: 数値
      - メール送信: 成功

  - name: "理由別再送信"
    reasons:
      - not_received
      - expired
      - spam_folder
      - other
    validation:
      - 各理由が正しく記録される
      - 理由に応じたレスポンスメッセージ

  - name: "再送信回数制限"
    max_attempts: 5
    validation:
      - 5回目まで: 成功
      - 6回目: エラー (MAX_ATTEMPTS_EXCEEDED)
      - サポート案内表示
```

#### 1.2 エッジケース検証
```yaml
edge_cases:
  - 存在しないメールアドレス
  - 既に確認済みのアカウント
  - 無効なトークン
  - 期限切れトークン
  - 削除されたユーザー
  - 一時的に無効化されたアカウント
```

### 2. セキュリティテスト (Security Testing)

#### 2.1 レート制限検証
```yaml
rate_limit_tests:
  - name: "IPベースレート制限"
    test:
      - 同一IPから連続リクエスト
      - 429エラー確認
      - クールダウン時間検証

  - name: "メールベースレート制限"
    test:
      - 同一メールで連続リクエスト
      - 指数バックオフ確認
      - cooldown: 60秒 → 120秒 → 240秒...

  - name: "分散攻撃シミュレーション"
    test:
      - 複数IPからの同時リクエスト
      - システム負荷確認
      - DDoS耐性検証
```

#### 2.2 タイミング攻撃対策
```yaml
timing_attack_tests:
  - name: "レスポンス時間一貫性"
    scenarios:
      - 存在するメール: レスポンス時間記録
      - 存在しないメール: レスポンス時間記録
      - 確認済みメール: レスポンス時間記録
    validation: |
      全シナリオでレスポンス時間が
      100-300ms範囲内で一貫している
```

#### 2.3 入力検証
```yaml
input_validation:
  - SQLインジェクション試行
  - XSS攻撃ベクター
  - メールヘッダーインジェクション
  - Unicode制御文字
  - 超長文字列 (>10000文字)
  - null/undefined値
  - 型不一致データ
```

### 3. パフォーマンステスト (Performance Testing)

#### 3.1 負荷テスト
```yaml
load_tests:
  - name: "同時接続テスト"
    concurrent_users: [10, 50, 100, 500, 1000]
    metrics:
      - レスポンス時間
      - エラー率
      - スループット
      - CPU使用率
      - メモリ使用量

  - name: "持続負荷テスト"
    duration: 60分
    rps: 100 # requests per second
    monitor:
      - メモリリーク
      - データベース接続プール
      - キューサイズ
```

#### 3.2 スケーラビリティテスト
```yaml
scalability:
  - horizontal_scaling:
      instances: [1, 2, 4, 8]
      measure: スループット向上率
  
  - queue_performance:
      jobs: [100, 1000, 10000]
      metrics:
        - 処理時間
        - メモリ使用量
        - エラー率
```

### 4. 統合テスト (Integration Testing)

#### 4.1 データベース統合
```yaml
database_tests:
  - transaction_rollback:
      scenario: "エラー時のロールバック"
      validation: "データ整合性維持"
  
  - connection_pool:
      test: "接続プール枯渇"
      recovery: "自動復旧確認"
  
  - index_performance:
      queries: ["findOne", "updateOne", "aggregate"]
      measure: "実行計画とパフォーマンス"
```

#### 4.2 メールサービス統合
```yaml
email_service:
  - provider_failure:
      simulate: "SMTP接続失敗"
      expected: "キューでリトライ"
  
  - rate_limit_exceeded:
      simulate: "プロバイダーレート制限"
      expected: "指数バックオフ"
  
  - invalid_credentials:
      simulate: "認証エラー"
      expected: "エラーログとDLQ"
```

### 5. 回復性テスト (Resilience Testing)

#### 5.1 障害シナリオ
```yaml
failure_scenarios:
  - database_outage:
      duration: 5分
      expected_behavior:
        - グレースフルデグレード
        - エラーメッセージ表示
        - 自動リトライ

  - redis_failure:
      test: "Redis接続断"
      fallback: "インメモリキュー"

  - network_partition:
      test: "ネットワーク分断"
      validation: "データ一貫性"
```

#### 5.2 カオスエンジニアリング
```yaml
chaos_tests:
  - random_failures:
      probability: 0.1
      components: ["db", "email", "queue"]
      measure: "システム復旧時間"

  - resource_exhaustion:
      test: ["CPU 100%", "メモリ不足", "ディスク満杯"]
      behavior: "グレースフル処理"
```

### 6. UIテスト (UI/UX Testing)

#### 6.1 コンポーネントテスト
```yaml
component_tests:
  - EmailResendButton:
      states:
        - initial: ボタン表示
        - cooldown: カウントダウン表示
        - loading: ローディング状態
        - success: 成功メッセージ
        - error: エラー表示

  - stepper_dialog:
      navigation: "前進/後退"
      validation: "入力検証"
      accessibility: "ARIA属性"
```

#### 6.2 ブラウザ互換性
```yaml
browsers:
  - Chrome: [最新, 最新-1, 最新-2]
  - Firefox: [最新, ESR]
  - Safari: [最新, 最新-1]
  - Edge: [最新]
  - Mobile:
      - iOS Safari: [15, 16, 17]
      - Chrome Android: [最新]
```

### 7. アクセシビリティテスト

```yaml
accessibility:
  - wcag_2_1_compliance:
      level: AA
      tools: ["axe-core", "WAVE"]
  
  - keyboard_navigation:
      test: "全機能キーボード操作可能"
  
  - screen_reader:
      tools: ["NVDA", "JAWS", "VoiceOver"]
      validation: "適切な読み上げ"
```

### 8. 国際化テスト (i18n Testing)

```yaml
i18n_tests:
  - character_sets:
      test: ["ASCII", "UTF-8", "絵文字", "RTL言語"]
  
  - locale_formats:
      test: ["日付形式", "時刻形式", "数値形式"]
  
  - timezone_handling:
      test: "異なるタイムゾーンでの動作"
```

### 9. モニタリング検証

#### 9.1 メトリクス収集
```yaml
metrics_validation:
  - collection_accuracy:
      verify:
        - カウンター増分
        - タイミング計測
        - エラー記録

  - performance_impact:
      measure: "メトリクス収集のオーバーヘッド"
      threshold: "<5% CPU増加"
```

#### 9.2 ログ検証
```yaml
logging:
  - completeness:
      check:
        - 全エラーケースでログ出力
        - セキュリティイベント記録
        - パフォーマンスメトリクス

  - privacy:
      verify:
        - パスワード非記録
        - トークン完全非表示
        - PII適切処理
```

### 10. コンプライアンステスト

```yaml
compliance:
  - gdpr:
      test:
        - データ最小化
        - 同意管理
        - データ削除権

  - security_standards:
      - OWASP Top 10
      - PCI DSS (該当する場合)
      - SOC 2
```

## テスト実行計画

### フェーズ1: 単体テスト (1-2日)
```bash
# 各コンポーネントの単体テスト
npm run test:unit

# カバレッジレポート
npm run test:coverage

# 静的解析
npm run lint
npm run type-check
```

### フェーズ2: 統合テスト (2-3日)
```bash
# API統合テスト
npm run test:api

# データベース統合テスト
npm run test:db

# E2Eテスト
npm run test:e2e
```

### フェーズ3: 非機能テスト (3-4日)
```bash
# パフォーマンステスト
npm run test:perf

# セキュリティテスト
npm run test:security

# 負荷テスト
npm run test:load
```

### フェーズ4: 受け入れテスト (1-2日)
```bash
# UAT環境でのテスト
npm run test:uat

# 本番環境シミュレーション
npm run test:prod-sim
```

## 成功基準

### 必須要件
- ✅ 全機能テストケース合格率: 100%
- ✅ セキュリティテスト合格率: 100%
- ✅ コードカバレッジ: >80%
- ✅ パフォーマンス基準達成
  - レスポンス時間: <500ms (p95)
  - エラー率: <0.1%
  - 可用性: >99.9%

### 推奨要件
- ⭐ コードカバレッジ: >90%
- ⭐ 負荷テスト: 1000 RPS対応
- ⭐ WCAG 2.1 AA準拠
- ⭐ 全ブラウザ互換性

## テストツール推奨

### 自動テスト
```json
{
  "unit": "Jest + React Testing Library",
  "integration": "Supertest",
  "e2e": "Playwright / Cypress",
  "performance": "k6 / Artillery",
  "security": "OWASP ZAP / Burp Suite",
  "accessibility": "axe-core / Pa11y"
}
```

### モニタリング
```json
{
  "apm": "Datadog / New Relic",
  "logging": "ELK Stack / Splunk",
  "metrics": "Prometheus + Grafana",
  "error_tracking": "Sentry",
  "uptime": "Pingdom / UptimeRobot"
}
```

## リスク評価

### 高リスク項目
1. **データベーストランザクション失敗**
   - 影響: データ不整合
   - 対策: ロールバック機構の徹底テスト

2. **メールプロバイダー障害**
   - 影響: メール未送信
   - 対策: マルチプロバイダー対応

3. **DDoS攻撃**
   - 影響: サービス停止
   - 対策: CDN/WAF導入

### 中リスク項目
1. **キューオーバーフロー**
   - 影響: メモリ不足
   - 対策: キューサイズ制限

2. **メトリクス収集失敗**
   - 影響: 監視不能
   - 対策: フォールバック機構

## レポート形式

### テスト結果レポート
```markdown
# テスト実行結果

## サマリー
- 実行日時: YYYY-MM-DD HH:MM
- 環境: [開発/ステージング/本番]
- 実行者: [名前]

## 結果概要
| カテゴリ | 総数 | 成功 | 失敗 | スキップ | 成功率 |
|---------|------|------|------|---------|--------|
| 機能     | 100  | 98   | 2    | 0       | 98%    |
| セキュリティ | 50 | 50  | 0    | 0       | 100%   |
| パフォーマンス | 30 | 28 | 2   | 0       | 93.3%  |

## 詳細結果
[各テストケースの詳細]

## 問題点と対策
[発見された問題と推奨対策]

## 次のステップ
[改善提案と今後のアクション]
```

## 継続的テスト戦略

### CI/CDパイプライン統合
```yaml
pipeline:
  - stage: build
    script: npm run build
    
  - stage: test
    parallel:
      - npm run test:unit
      - npm run test:integration
      - npm run lint
      
  - stage: security
    script: npm run test:security
    
  - stage: deploy
    condition: all_tests_pass
    script: npm run deploy
```

### 定期実行
- 日次: 単体テスト、統合テスト
- 週次: パフォーマンステスト
- 月次: セキュリティ監査、負荷テスト

## まとめ

この包括的テスト計画により、メール再送信機能の品質、セキュリティ、パフォーマンス、信頼性を多角的に検証できます。各テストフェーズを段階的に実行し、問題を早期に発見・修正することで、本番環境での安定稼働を保証します。