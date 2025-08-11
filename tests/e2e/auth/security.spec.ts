import { test, expect } from '@playwright/test';
import { DatabaseHelper } from '../helpers/db-helper';
import { APIHelper } from '../helpers/api-helper';

let dbHelper: DatabaseHelper;
let apiHelper: APIHelper;

test.beforeAll(async () => {
  dbHelper = new DatabaseHelper();
  apiHelper = new APIHelper();
  
  await dbHelper.connect();
  await dbHelper.cleanupTestData();
  await dbHelper.createTestUsers(3);
});

test.afterAll(async () => {
  await dbHelper.cleanupTestData();
  await dbHelper.disconnect();
});

test.describe('セキュリティ検証', () => {
  const testEmail = 'e2e_test_5@example.com';
  
  test.beforeEach(async () => {
    await dbHelper.resetUserVerification(testEmail);
    await dbHelper.clearResendHistoryForUser(testEmail);
  });
  
  test('タイミング攻撃対策の確認', async () => {
    const existingEmail = testEmail;
    const nonExistingEmail = 'e2e_definitely_not_exists_999@example.com';
    
    // Measure response times for existing user
    const existingTimes: number[] = [];
    for (let i = 0; i < 5; i++) {
      const { duration } = await apiHelper.sendResendRequestWithTiming(existingEmail);
      existingTimes.push(duration);
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    // Measure response times for non-existing user
    const nonExistingTimes: number[] = [];
    for (let i = 0; i < 5; i++) {
      const { duration } = await apiHelper.sendResendRequestWithTiming(nonExistingEmail);
      nonExistingTimes.push(duration);
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    // Calculate averages
    const existingAvg = existingTimes.reduce((a, b) => a + b, 0) / existingTimes.length;
    const nonExistingAvg = nonExistingTimes.reduce((a, b) => a + b, 0) / nonExistingTimes.length;
    
    // The difference should be minimal (less than 100ms)
    const timeDifference = Math.abs(existingAvg - nonExistingAvg);
    expect(timeDifference).toBeLessThan(100);
    
    // Both should return 200 status
    const existingResponse = await apiHelper.sendResendRequest(existingEmail);
    const nonExistingResponse = await apiHelper.sendResendRequest(nonExistingEmail);
    
    expect(existingResponse.status).toBe(200);
    expect(nonExistingResponse.status).toBe(200);
  });
  
  test('XSS攻撃の防御確認', async () => {
    const xssPayloads = [
      '<script>alert(1)</script>@example.com',
      'test<img src=x onerror=alert(1)>@example.com',
      'test<svg onload=alert(1)>@example.com',
      'javascript:alert(1)@example.com',
      'test<iframe src=javascript:alert(1)>@example.com'
    ];
    
    for (const payload of xssPayloads) {
      const response = await apiHelper.sendResendRequest(payload);
      
      // Should be rejected with 400 status
      expect(response.status).toBe(400);
      expect(response.data?.success).toBe(false);
      expect(response.data?.error?.code).toBe('VALIDATION_ERROR');
      
      // Error message should not contain the payload (to prevent reflection)
      const errorMessage = response.data?.error?.message || '';
      expect(errorMessage).not.toContain('<script>');
      expect(errorMessage).not.toContain('onerror=');
      expect(errorMessage).not.toContain('onload=');
    }
  });
  
  test('SQLインジェクション対策の確認', async () => {
    const sqlPayloads = [
      "test'; DROP TABLE users; --@example.com",
      "test' OR '1'='1@example.com",
      "test'; SELECT * FROM users; --@example.com",
      "test' UNION SELECT * FROM users--@example.com",
      "test'; DELETE FROM users WHERE '1'='1'; --@example.com"
    ];
    
    for (const payload of sqlPayloads) {
      const response = await apiHelper.sendResendRequest(payload);
      
      // Should be rejected with 400 status
      expect(response.status).toBe(400);
      expect(response.data?.success).toBe(false);
      expect(response.data?.error?.code).toBe('VALIDATION_ERROR');
    }
  });
  
  test('メールヘッダーインジェクション対策', async () => {
    const headerInjectionPayloads = [
      'test@example.com\\r\\nBcc: attacker@evil.com',
      'test@example.com\\nCc: attacker@evil.com',
      'test@example.com\\rSubject: Hacked',
      'test@example.com%0d%0aBcc:attacker@evil.com',
      'test@example.com%0aTo:victim@example.com'
    ];
    
    for (const payload of headerInjectionPayloads) {
      const response = await apiHelper.sendResendRequest(payload);
      
      // Should be rejected
      expect(response.status).toBe(400);
      expect(response.data?.success).toBe(false);
    }
  });
  
  test('制御文字の検証', async () => {
    const controlCharPayloads = [
      'test\u0000@example.com',  // Null character
      'test\u0001@example.com',  // Start of heading
      'test\u0008@example.com',  // Backspace
      'test\u001b@example.com',  // Escape
      'test\u007f@example.com'   // Delete
    ];
    
    for (const payload of controlCharPayloads) {
      const response = await apiHelper.sendResendRequest(payload);
      
      // Should be rejected
      expect(response.status).toBe(400);
      expect(response.data?.success).toBe(false);
      expect(response.data?.error?.message).toContain('無効な文字');
    }
  });
  
  test('超長文字列の処理', async () => {
    // Create a very long email address
    const longEmail = 'a'.repeat(200) + '@example.com';
    
    const response = await apiHelper.sendResendRequest(longEmail);
    
    // Should be rejected due to length
    expect(response.status).toBe(400);
    expect(response.data?.success).toBe(false);
    expect(response.data?.error?.message).toContain('長すぎます');
  });
  
  test('特殊文字の適切な処理', async () => {
    const specialCharEmails = [
      'test+tag@example.com',  // Valid: plus addressing
      'test.user@example.com',  // Valid: dot in local part
      'test_user@example.com',  // Valid: underscore
      'test-user@example.com',  // Valid: hyphen
      '123test@example.com'     // Valid: numbers
    ];
    
    for (const email of specialCharEmails) {
      const response = await apiHelper.sendResendRequest(email);
      
      // These should be accepted (200 status)
      expect(response.status).toBe(200);
      expect(response.data?.success).toBe(true);
    }
  });
  
  test('JSON構造の検証', async () => {
    // Send malformed JSON-like email addresses
    const jsonPayloads = [
      '{"email": "attacker@evil.com"}@example.com',
      '[admin@example.com]@test.com',
      'test@{domain: "evil.com"}'
    ];
    
    for (const payload of jsonPayloads) {
      const response = await apiHelper.sendResendRequest(payload);
      
      // Should be rejected
      expect(response.status).toBe(400);
      expect(response.data?.success).toBe(false);
    }
  });
  
  test('レスポンスヘッダーのセキュリティ', async () => {
    const response = await apiHelper.sendResendRequest(testEmail);
    
    // Check security headers
    const headers = response.headers;
    
    // Content-Type should be set
    expect(headers['content-type']).toContain('application/json');
    
    // Should not expose sensitive information
    expect(headers['x-powered-by']).toBeUndefined();
  });
  
  test('エラーメッセージの情報漏洩防止', async () => {
    // Test various invalid inputs
    const invalidInputs = [
      '',
      'invalid',
      'test@',
      '@example.com',
      'test@test@test.com'
    ];
    
    const errorMessages = new Set<string>();
    
    for (const input of invalidInputs) {
      const response = await apiHelper.sendResendRequest(input);
      if (response.data?.error?.message) {
        errorMessages.add(response.data.error.message);
      }
    }
    
    // Error messages should be generic and not reveal system details
    for (const message of errorMessages) {
      expect(message).not.toContain('MongoDB');
      expect(message).not.toContain('mongoose');
      expect(message).not.toContain('stack');
      expect(message).not.toContain('trace');
      expect(message).not.toContain('/Users/');
      expect(message).not.toContain('/home/');
      expect(message).not.toContain('.ts');
      expect(message).not.toContain('.js');
    }
  });
  
  test('同一オリジンポリシーの確認', async () => {
    // Test with different origin headers
    const response = await apiHelper.sendResendRequest(testEmail, {
      headers: {
        'Origin': 'http://evil.com',
        'Referer': 'http://evil.com/attack'
      }
    });
    
    // Should still work (API doesn't enforce CORS for this endpoint)
    // But should not expose sensitive data
    if (response.status === 200) {
      expect(response.data).toHaveProperty('success');
      expect(response.data).not.toHaveProperty('_id');
      expect(response.data).not.toHaveProperty('password');
      expect(response.data).not.toHaveProperty('token');
    }
  });
});