# 🔒 パスワードリセット時の同一パスワード再利用問題 - 完全解決プロンプト

## 🚨 セキュリティ問題の詳細

### 現在の問題
パスワードリセット時に、ユーザーが以前と同じパスワードを設定できてしまう

### セキュリティリスク評価
**リスクレベル: 中〜高**

#### なぜこれが問題なのか
1. **アカウント侵害の可能性**
   - パスワードが漏洩した場合、リセット後も同じパスワードでは意味がない
   - 攻撃者が既知のパスワードで再度アクセス可能

2. **コンプライアンス違反**
   - NIST SP 800-63B: パスワード履歴の考慮を推奨
   - PCI DSS: パスワード再利用の制限を要求
   - ISO 27001: アクセス制御の要件

3. **ユーザーの誤解**
   - リセット = セキュリティ向上という期待に反する
   - 組織のセキュリティポリシー違反の可能性

## 📋 実行指示

### Phase 1: 現状分析と問題特定

#### 1.1 現在のパスワードリセット実装を確認
```javascript
// 確認項目
1. /api/auth/reset-password の実装
2. パスワードハッシュ化の方法（bcrypt使用確認）
3. 古いパスワードとの比較処理の有無
4. パスワード履歴の保存有無
```

#### 1.2 データベーススキーマ確認
```javascript
// Userモデルの確認
- password フィールドの構造
- passwordHistory フィールドの有無
- lastPasswordChange タイムスタンプの有無
```

### Phase 2: セキュリティ強化実装

#### 2.1 パスワード履歴機能の追加
```typescript
// src/models/User.ts に追加
interface IUser {
  // 既存フィールド
  password: string;
  
  // 新規追加
  passwordHistory: {
    hash: string;
    changedAt: Date;
  }[];
  lastPasswordChange: Date;
  passwordResetCount: number;
}

// パスワード履歴の保存数（推奨: 3-5個）
const PASSWORD_HISTORY_LIMIT = 5;
```

#### 2.2 パスワード比較関数の実装
```typescript
// src/lib/auth/password-validator.ts
import bcrypt from 'bcryptjs';

export async function isPasswordReused(
  newPassword: string,
  currentPasswordHash: string,
  passwordHistory: Array<{ hash: string; changedAt: Date }>
): Promise<boolean> {
  // 現在のパスワードと比較
  const isSameAsCurrent = await bcrypt.compare(newPassword, currentPasswordHash);
  if (isSameAsCurrent) {
    return true;
  }
  
  // 履歴のパスワードと比較
  for (const historicalPassword of passwordHistory) {
    const isSameAsHistorical = await bcrypt.compare(
      newPassword,
      historicalPassword.hash
    );
    if (isSameAsHistorical) {
      return true;
    }
  }
  
  return false;
}

export function getPasswordReuseError(historyCount: number): string {
  return `新しいパスワードは過去${historyCount}回分と異なるものを設定してください。`;
}
```

#### 2.3 パスワードリセットAPIの更新
```typescript
// src/app/api/auth/reset-password/route.ts
export async function POST(request: Request) {
  const { token, newPassword } = await request.json();
  
  // トークン検証
  const resetRequest = await validateResetToken(token);
  if (!resetRequest) {
    return NextResponse.json(
      { error: 'トークンが無効または期限切れです' },
      { status: 400 }
    );
  }
  
  // ユーザー取得
  const user = await User.findOne({ email: resetRequest.email });
  if (!user) {
    return NextResponse.json(
      { error: 'ユーザーが見つかりません' },
      { status: 404 }
    );
  }
  
  // パスワード再利用チェック
  const isReused = await isPasswordReused(
    newPassword,
    user.password,
    user.passwordHistory || []
  );
  
  if (isReused) {
    // セキュリティログ記録
    await logSecurityEvent({
      type: 'PASSWORD_REUSE_ATTEMPT',
      userId: user._id,
      ip: request.headers.get('x-forwarded-for'),
      timestamp: new Date(),
    });
    
    return NextResponse.json(
      { 
        error: 'セキュリティポリシー違反',
        message: getPasswordReuseError(PASSWORD_HISTORY_LIMIT),
        code: 'PASSWORD_REUSED'
      },
      { status: 400 }
    );
  }
  
  // パスワード更新処理
  const hashedPassword = await bcrypt.hash(newPassword, 12);
  
  // 履歴に現在のパスワードを追加
  const updatedHistory = [
    { hash: user.password, changedAt: user.lastPasswordChange || new Date() },
    ...(user.passwordHistory || [])
  ].slice(0, PASSWORD_HISTORY_LIMIT - 1);
  
  // ユーザー情報更新
  await User.findByIdAndUpdate(user._id, {
    password: hashedPassword,
    passwordHistory: updatedHistory,
    lastPasswordChange: new Date(),
    passwordResetCount: (user.passwordResetCount || 0) + 1,
    emailVerificationToken: null, // セキュリティのためトークンクリア
  });
  
  // リセットトークン削除
  await PasswordReset.deleteOne({ token });
  
  // 通知メール送信
  await sendPasswordChangedNotification(user.email);
  
  return NextResponse.json({
    success: true,
    message: 'パスワードが正常に更新されました',
  });
}
```

### Phase 3: フロントエンド対応

#### 3.1 エラーメッセージ表示の改善
```typescript
// src/app/auth/reset-password/[token]/page.tsx
const handleSubmit = async (e: FormEvent) => {
  e.preventDefault();
  
  try {
    const response = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, newPassword }),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      if (data.code === 'PASSWORD_REUSED') {
        setError({
          type: 'security',
          message: data.message,
          suggestion: '異なるパスワードを設定してください',
        });
        
        // パスワード強度の提案を表示
        setShowPasswordSuggestions(true);
      } else {
        setError({ type: 'general', message: data.error });
      }
      return;
    }
    
    // 成功処理
    router.push('/auth/signin?reset=success');
  } catch (error) {
    setError({ type: 'network', message: 'エラーが発生しました' });
  }
};
```

### Phase 4: テスト実装

#### 4.1 単体テストスクリプト
```javascript
// scripts/test-password-reuse-prevention.js
const bcrypt = require('bcryptjs');
const { MongoClient } = require('mongodb');

async function testPasswordReusePrevention() {
  console.log('🔒 パスワード再利用防止テスト開始\n');
  
  const tests = [
    {
      name: '同一パスワードの拒否',
      test: async () => {
        const testUser = await createTestUser();
        const resetToken = await requestPasswordReset(testUser.email);
        
        // 同じパスワードでリセット試行
        const result = await resetPassword(resetToken, testUser.originalPassword);
        
        return {
          passed: result.status === 400 && result.code === 'PASSWORD_REUSED',
          message: result.message,
        };
      }
    },
    {
      name: '履歴パスワードの拒否',
      test: async () => {
        const testUser = await createTestUserWithHistory();
        const resetToken = await requestPasswordReset(testUser.email);
        
        // 履歴にあるパスワードでリセット試行
        const result = await resetPassword(resetToken, testUser.historicalPasswords[0]);
        
        return {
          passed: result.status === 400 && result.code === 'PASSWORD_REUSED',
          message: result.message,
        };
      }
    },
    {
      name: '新規パスワードの受け入れ',
      test: async () => {
        const testUser = await createTestUser();
        const resetToken = await requestPasswordReset(testUser.email);
        
        // 完全に新しいパスワード
        const newPassword = generateUniquePassword();
        const result = await resetPassword(resetToken, newPassword);
        
        return {
          passed: result.success === true,
          message: '新規パスワード正常受理',
        };
      }
    },
    {
      name: '履歴制限の確認',
      test: async () => {
        const testUser = await createTestUserWithFullHistory();
        const resetToken = await requestPasswordReset(testUser.email);
        
        // 6回前のパスワード（制限外）
        const oldPassword = testUser.veryOldPassword;
        const result = await resetPassword(resetToken, oldPassword);
        
        return {
          passed: result.success === true,
          message: '履歴制限外のパスワードは許可',
        };
      }
    },
    {
      name: 'タイミング攻撃耐性',
      test: async () => {
        const times = [];
        
        for (let i = 0; i < 10; i++) {
          const start = Date.now();
          await resetPassword('invalid-token', 'TestPassword123!');
          times.push(Date.now() - start);
        }
        
        const avgTime = times.reduce((a, b) => a + b) / times.length;
        const variance = Math.max(...times) - Math.min(...times);
        
        return {
          passed: variance < 100, // 100ms以内の差
          message: `タイミング差: ${variance}ms`,
        };
      }
    }
  ];
  
  // テスト実行
  let passedCount = 0;
  let failedCount = 0;
  
  for (const testCase of tests) {
    console.log(`\n📝 ${testCase.name}`);
    
    try {
      const result = await testCase.test();
      
      if (result.passed) {
        console.log(`  ✅ 成功: ${result.message}`);
        passedCount++;
      } else {
        console.log(`  ❌ 失敗: ${result.message}`);
        failedCount++;
      }
    } catch (error) {
      console.log(`  ❌ エラー: ${error.message}`);
      failedCount++;
    }
  }
  
  // 結果サマリー
  console.log('\n' + '='.repeat(50));
  console.log('📊 テスト結果サマリー');
  console.log('='.repeat(50));
  console.log(`✅ 成功: ${passedCount}/${tests.length}`);
  console.log(`❌ 失敗: ${failedCount}/${tests.length}`);
  
  const successRate = (passedCount / tests.length * 100).toFixed(1);
  console.log(`\n成功率: ${successRate}%`);
  
  if (successRate === '100.0') {
    console.log('🎉 すべてのテストに合格！パスワード再利用防止機能は正常です。');
  } else {
    console.log('⚠️ 一部のテストが失敗しました。実装を確認してください。');
  }
  
  return successRate === '100.0';
}

// 実行
testPasswordReusePrevention();
```

#### 4.2 E2Eテスト
```typescript
// e2e/auth/password-reuse.spec.ts
import { test, expect } from '@playwright/test';

test.describe('パスワード再利用防止', () => {
  test('同じパスワードでのリセットを拒否', async ({ page }) => {
    // テストユーザーでログイン
    await loginAsTestUser(page);
    const originalPassword = 'TestPassword123!';
    
    // パスワードリセットリクエスト
    await page.goto('/auth/forgot-password');
    await page.fill('[name="email"]', 'test@example.com');
    await page.click('button[type="submit"]');
    
    // リセットリンクを取得（テスト環境）
    const resetLink = await getResetLinkFromEmail();
    await page.goto(resetLink);
    
    // 同じパスワードを入力
    await page.fill('[name="password"]', originalPassword);
    await page.fill('[name="confirmPassword"]', originalPassword);
    await page.click('button[type="submit"]');
    
    // エラーメッセージを確認
    const errorMessage = await page.textContent('.error-message');
    expect(errorMessage).toContain('過去5回分と異なるもの');
    
    // パスワード強度提案が表示されることを確認
    await expect(page.locator('.password-suggestions')).toBeVisible();
  });
  
  test('新しいパスワードは受け入れる', async ({ page }) => {
    // 同様のセットアップ
    const newPassword = 'CompletelyNew456!@#';
    
    await page.fill('[name="password"]', newPassword);
    await page.fill('[name="confirmPassword"]', newPassword);
    await page.click('button[type="submit"]');
    
    // 成功を確認
    await expect(page).toHaveURL('/auth/signin?reset=success');
  });
});
```

### Phase 5: セキュリティ監査ログ

#### 5.1 監査ログ実装
```typescript
// src/lib/security/audit-log.ts
export async function logPasswordReuseAttempt(
  userId: string,
  ip: string,
  userAgent: string
) {
  await AuditLog.create({
    event: 'PASSWORD_REUSE_ATTEMPT',
    userId,
    ip,
    userAgent,
    timestamp: new Date(),
    severity: 'MEDIUM',
    details: {
      action: 'Password reset attempted with reused password',
      blocked: true,
    },
  });
  
  // 閾値を超えた場合はアラート
  const recentAttempts = await AuditLog.countDocuments({
    userId,
    event: 'PASSWORD_REUSE_ATTEMPT',
    timestamp: { $gte: new Date(Date.now() - 3600000) }, // 1時間以内
  });
  
  if (recentAttempts > 3) {
    await sendSecurityAlert(userId, 'Multiple password reuse attempts detected');
  }
}
```

## 📊 成功基準

### 必須要件
- [ ] 同一パスワードの再利用を100%ブロック
- [ ] パスワード履歴5件の保存と比較
- [ ] 適切なエラーメッセージの表示
- [ ] セキュリティログの記録
- [ ] タイミング攻撃への耐性

### パフォーマンス要件
- [ ] パスワード比較: < 200ms
- [ ] 履歴検索: < 100ms
- [ ] 全体処理: < 500ms

### コンプライアンス
- [ ] NIST SP 800-63B準拠
- [ ] OWASP認証チートシート準拠
- [ ] GDPR/個人情報保護法準拠

## 🚀 実行コマンド

```bash
# 1. 実装
npm run implement:password-reuse-prevention

# 2. テスト
npm run test:password-reuse

# 3. セキュリティ監査
npm run audit:password-security

# 4. デプロイ前チェック
npm run check:security-compliance
```

## ⚠️ 注意事項

1. **既存ユーザーへの影響**
   - 段階的導入を推奨
   - 初回は警告のみ、次回から強制

2. **パフォーマンス**
   - bcrypt比較は重い処理
   - 必要に応じてワーカースレッド使用

3. **ユーザビリティ**
   - 明確なエラーメッセージ
   - パスワード生成ツールの提供

## 📝 期待される成果

1. **セキュリティ向上**
   - パスワード漏洩時のリスク軽減
   - アカウント乗っ取り防止

2. **コンプライアンス達成**
   - 業界標準への準拠
   - 監査要件の充足

3. **ユーザー信頼性向上**
   - プロフェッショナルなセキュリティ実装
   - ブランド価値の向上

---

*このプロンプトを使用して、パスワード再利用問題を完全に解決してください。*