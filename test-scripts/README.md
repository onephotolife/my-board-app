# 📦 自動テストスクリプト集

## 概要
本番環境（https://board.blankbrainai.com）のユーザー体験を検証する自動テストスクリプト集です。

## 必要なツール

### インストール手順
```bash
# Node.js環境の準備
npm init -y

# E2Eテスト（Playwright）
npm install -D @playwright/test
npx playwright install

# アクセシビリティテスト
npm install -D axe-playwright

# パフォーマンステスト
npm install -g lighthouse
brew install k6

# APIテスト
npm install -D newman
```

## ディレクトリ構造
```
test-scripts/
├── README.md
├── e2e/                    # E2Eテスト
│   ├── user-journey.spec.js
│   ├── mobile.spec.js
│   └── auth.spec.js
├── performance/            # パフォーマンステスト
│   ├── lighthouse.js
│   ├── load-test.js
│   └── stress-test.js
├── accessibility/          # アクセシビリティ
│   └── wcag-check.js
├── security/              # セキュリティ
│   └── security-scan.js
├── api/                   # APIテスト
│   └── api-test.json
└── utils/                 # 共通ユーティリティ
    └── test-data.js
```

## 実行方法

### E2Eテスト
```bash
# 全テスト実行
npx playwright test

# 特定のテスト実行
npx playwright test e2e/user-journey.spec.js

# UIモードで実行
npx playwright test --ui

# デバッグモード
npx playwright test --debug
```

### パフォーマンステスト
```bash
# Lighthouse実行
node performance/lighthouse.js

# 負荷テスト
k6 run performance/load-test.js

# ストレステスト
k6 run performance/stress-test.js
```

### アクセシビリティテスト
```bash
npx playwright test accessibility/wcag-check.js
```

### セキュリティテスト
```bash
node security/security-scan.js
```

### APIテスト
```bash
newman run api/api-test.json
```

## CI/CD統合

### GitHub Actions
```yaml
name: User Experience Tests
on:
  push:
    branches: [main]
  schedule:
    - cron: '0 2 * * *'  # 毎日2時に実行

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npx playwright install
      - run: npm test
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: test-results
          path: test-results/
```

## レポート生成
```bash
# HTMLレポート生成
npx playwright show-report

# JUnitレポート（CI用）
npx playwright test --reporter=junit

# カスタムレポート
npm run test:report
```

## 環境変数
```bash
# .env.test
BASE_URL=https://board.blankbrainai.com
TEST_USER_EMAIL=test@example.com
TEST_USER_PASSWORD=Test1234!
HEADLESS=true
SLOW_MO=0
```

---
*作成日: 2025年8月21日*