# 🚀 CSP エラー解決 - 高度な実装プロンプト v2.0

## 背景と現状
Next.js 15アプリケーションでCSPエラーが発生し、初期実装で85/100点を達成。さらなる改善が必要。

## 実施済み内容
✅ CSPヘッダーの基本設定
✅ 開発/本番環境の差別化
✅ セキュリティヘッダーの追加
✅ CSP違反ゼロを達成

## 🎯 次段階の実装目標

### Phase 1: Nonce-Based CSP実装（セキュリティ強化）
```typescript
// 1. Nonceジェネレーターの実装
// src/lib/csp.ts
import crypto from 'crypto';

export function generateNonce() {
  return crypto.randomBytes(16).toString('base64');
}

// 2. Middlewareでnonce生成と注入
// 3. _document.tsxでnonceを全scriptタグに適用
// 4. Material-UIのSSR対応
```

### Phase 2: CSP違反レポート機能
```typescript
// 1. Report-URIエンドポイント作成
// /api/csp-report
// 2. 違反ログの収集と分析
// 3. アラート機能の実装
```

### Phase 3: Trusted Types実装
```typescript
// 1. Trusted Types Policy作成
// 2. DOM XSS防御の強化
// 3. サニタイゼーション実装
```

### Phase 4: 動的コンテンツ対応
```typescript
// 1. Hash-based inline scripts
// 2. Dynamic import最適化
// 3. Worker-src設定
```

## 📋 実装チェックリスト

### 即座実装（Critical）
- [ ] Nonce生成機能の実装
- [ ] CSPヘッダーへのnonce追加
- [ ] React SSRでのnonce伝播
- [ ] Material-UIのnonce対応
- [ ] CSP違反レポートAPI

### 短期実装（High Priority）
- [ ] Trusted Types Policy設定
- [ ] Strict-Dynamic導入
- [ ] Inline-style hash化
- [ ] External resource integrity
- [ ] CSPテストスイート拡充

### 中期実装（Medium Priority）
- [ ] CSP違反ダッシュボード
- [ ] A/Bテストでの段階的展開
- [ ] パフォーマンス最適化
- [ ] ブラウザ互換性調整
- [ ] CSP v3機能の活用

## 🔍 検証項目

### 自動テスト
```bash
# 1. CSP違反検出テスト
node scripts/test-csp-violations.js

# 2. XSS攻撃シミュレーション
node scripts/test-xss-protection.js

# 3. パフォーマンス影響測定
node scripts/test-csp-performance.js

# 4. ブラウザ互換性テスト
npm run test:e2e:csp
```

### 手動確認
1. 開発者ツールでCSP違反確認
2. Report-URIでの違反レポート確認
3. 各ブラウザでの動作確認
4. Lighthouse セキュリティ監査

## 📊 成功基準

### セキュリティスコア目標
- **現在**: 85/100点
- **目標**: 95/100点以上

### 詳細目標
| 項目 | 現在 | 目標 |
|------|------|------|
| CSP Level | 2 | 3 |
| Inline Scripts | unsafe-inline | nonce-based |
| Eval使用 | 開発のみ許可 | 完全削除 |
| XSS防御 | 基本 | 高度 |
| 違反監視 | なし | リアルタイム |

## 🛠 技術要件

### 必須要件
- Next.js 15互換性維持
- Material-UI v7完全対応
- TypeScript型安全性
- ゼロダウンタイム移行
- SEO影響なし

### パフォーマンス要件
- First Load JS: < 100KB増加
- TTI影響: < 100ms
- メモリ使用: < 10MB増加

## 🚨 エラー対応戦略

### よくあるエラーと解決策
1. **Material-UI スタイル注入エラー**
   - Emotion SSR設定
   - Nonce伝播確認

2. **Dynamic Import エラー**
   - Webpack設定調整
   - Strict-dynamic使用

3. **Third-party Script エラー**
   - SRI実装
   - Proxy経由読み込み

## 📝 実装手順

### Step 1: 環境準備
```bash
npm install crypto-js csp-header @types/csp-header
```

### Step 2: Nonce実装
1. Middleware更新
2. Provider作成
3. Component更新

### Step 3: 検証
1. 単体テスト実行
2. E2Eテスト実行
3. セキュリティ監査

### Step 4: 段階的展開
1. 開発環境でテスト
2. ステージング環境で検証
3. 本番環境へ段階的適用

## 🎯 最終目標

### セキュリティ
- OWASP Top 10完全対応
- CSP Level 3準拠
- XSS攻撃100%防御

### ユーザビリティ
- エラー表示なし
- パフォーマンス影響最小
- 全ブラウザ対応

### 保守性
- 自動化されたテスト
- 詳細なドキュメント
- CI/CD統合

## 使用方法
このプロンプトを使用して、段階的にCSPを強化し、セキュリティスコア95点以上を達成してください。各フェーズ完了後、`scripts/test-csp.js`でスコアを確認し、問題があれば即座に修正してください。

---
*このプロンプトはCSPテスト結果（85/100点）に基づいて生成されました。*