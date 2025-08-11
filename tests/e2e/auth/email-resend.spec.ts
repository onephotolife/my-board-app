import { test, expect, Page } from '@playwright/test';
import { DatabaseHelper } from '../helpers/db-helper';
import { APIHelper } from '../helpers/api-helper';

let dbHelper: DatabaseHelper;
let apiHelper: APIHelper;

test.beforeAll(async () => {
  // Initialize helpers
  dbHelper = new DatabaseHelper();
  apiHelper = new APIHelper();
  
  // Connect to database and setup test data
  await dbHelper.connect();
  await dbHelper.cleanupTestData();
  await dbHelper.createTestUsers(10);
});

test.afterAll(async () => {
  // Cleanup
  await dbHelper.cleanupTestData();
  await dbHelper.disconnect();
});

test.describe('メール再送信機能 - 基本E2Eテスト', () => {
  const testEmail = 'e2e_test_1@example.com';
  
  test.beforeEach(async () => {
    // Reset user state before each test
    await dbHelper.resetUserVerification(testEmail);
    await dbHelper.clearResendHistoryForUser(testEmail);
  });
  
  test('API: 正常な再送信フロー', async () => {
    const response = await apiHelper.sendResendRequest(testEmail);
    
    // Check response status
    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
    
    // Check response structure
    expect(response.data).toHaveProperty('message');
    expect(response.data.data).toHaveProperty('cooldownSeconds');
    expect(response.data.data).toHaveProperty('attemptNumber');
    expect(response.data.data).toHaveProperty('retriesRemaining');
    
    // Verify attempt number
    expect(response.data.data.attemptNumber).toBeGreaterThanOrEqual(1);
    expect(response.data.data.retriesRemaining).toBeLessThanOrEqual(4);
  });
  
  test('API: 理由別再送信処理', async () => {
    const reasons = ['not_received', 'expired', 'spam_folder', 'other'];
    
    for (const reason of reasons) {
      const response = await apiHelper.sendResendRequest(testEmail, { reason });
      
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      
      // Clear history for next iteration
      await dbHelper.clearResendHistoryForUser(testEmail);
    }
  });
  
  test('API: 再送信回数制限の動作確認', async () => {
    const result = await apiHelper.testMaxAttempts(testEmail);
    
    // Should hit limit after 5 attempts
    expect(result.limitReached).toBe(true);
    expect(result.afterAttempts).toBeLessThanOrEqual(6);
    expect(result.errorCode).toBe('MAX_ATTEMPTS_EXCEEDED');
  });
  
  test('API: attemptNumberの増加確認', async () => {
    const attemptNumbers: number[] = [];
    
    // Send 3 requests and collect attempt numbers
    for (let i = 1; i <= 3; i++) {
      const response = await apiHelper.sendResendRequest(testEmail);
      
      if (response.status === 200) {
        const attemptNumber = response.data.data?.attemptNumber;
        if (attemptNumber) {
          attemptNumbers.push(attemptNumber);
        }
      }
      
      // Wait between requests
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    // Verify attempt numbers are increasing
    expect(attemptNumbers.length).toBeGreaterThan(0);
    for (let i = 1; i < attemptNumbers.length; i++) {
      expect(attemptNumbers[i]).toBeGreaterThan(attemptNumbers[i - 1]);
    }
  });
  
  test('API: クールダウン時間の確認', async () => {
    const response1 = await apiHelper.sendResendRequest(testEmail);
    expect(response1.status).toBe(200);
    
    const cooldown1 = response1.data.data?.cooldownSeconds;
    expect(cooldown1).toBeDefined();
    expect(cooldown1).toBeGreaterThanOrEqual(60);
    
    // Second request should show increased cooldown
    const response2 = await apiHelper.sendResendRequest(testEmail);
    if (response2.status === 200) {
      const cooldown2 = response2.data.data?.cooldownSeconds;
      expect(cooldown2).toBeGreaterThanOrEqual(cooldown1);
    }
  });
  
  test('API: 入力検証 - 無効なメールアドレス', async () => {
    const invalidEmails = [
      { email: '', expectedError: 'メールアドレスを入力してください' },
      { email: 'invalid', expectedError: '有効なメールアドレスを入力してください' },
      { email: 'test@test@test.com', expectedError: '有効なメールアドレスを入力してください' },
      { email: 'test<script>@test.com', expectedError: '無効な文字が含まれています' }
    ];
    
    const result = await apiHelper.testInputValidation(invalidEmails);
    
    // All invalid inputs should be blocked
    expect(result.allBlocked).toBe(true);
    
    // Check each result
    for (const res of result.results) {
      expect(res.blocked).toBe(true);
      expect(res.error).toBeDefined();
    }
  });
  
  test('API: 存在しないユーザーへのリクエスト', async () => {
    const nonExistentEmail = 'e2e_nonexistent_user@example.com';
    const response = await apiHelper.sendResendRequest(nonExistentEmail);
    
    // Should return success for security reasons
    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
    
    // Should still include attemptNumber
    expect(response.data.data).toHaveProperty('attemptNumber');
    expect(response.data.data.attemptNumber).toBeGreaterThanOrEqual(1);
  });
  
  test('API: レスポンス時間の測定', async () => {
    const stats = await apiHelper.measureResponseTime(testEmail, 5);
    
    // Average response time should be reasonable
    expect(stats.average).toBeLessThan(1000); // Less than 1 second
    expect(stats.min).toBeGreaterThan(0);
    expect(stats.max).toBeLessThan(2000); // Max less than 2 seconds
    
    // Standard deviation should be reasonable (consistent response times)
    expect(stats.stdDev).toBeLessThan(500);
  });
  
  test('データベース: ResendHistory の記録確認', async () => {
    // Send a request
    const response = await apiHelper.sendResendRequest(testEmail);
    expect(response.status).toBe(200);
    
    // Wait a bit for database write
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Check database
    const history = await dbHelper.getResendHistory(testEmail);
    expect(history).toBeDefined();
    expect(history.attempts).toBeDefined();
    expect(history.attempts.length).toBeGreaterThan(0);
    
    // Check the latest attempt
    const latestAttempt = history.attempts[history.attempts.length - 1];
    expect(latestAttempt).toHaveProperty('timestamp');
    expect(latestAttempt).toHaveProperty('reason');
    expect(latestAttempt).toHaveProperty('success');
  });
  
  test('統合: ユーザー状態の確認', async () => {
    // Get initial state
    const initialStats = await dbHelper.getUserStats(testEmail);
    expect(initialStats.exists).toBe(true);
    expect(initialStats.emailVerified).toBe(false);
    expect(initialStats.resendAttempts).toBe(0);
    
    // Send requests
    await apiHelper.sendResendRequest(testEmail);
    await new Promise(resolve => setTimeout(resolve, 200));
    await apiHelper.sendResendRequest(testEmail);
    
    // Check updated state
    const updatedStats = await dbHelper.getUserStats(testEmail);
    expect(updatedStats.resendAttempts).toBeGreaterThan(0);
  });
});