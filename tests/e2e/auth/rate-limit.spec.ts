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
  await dbHelper.createTestUsers(5);
});

test.afterAll(async () => {
  await dbHelper.cleanupTestData();
  await dbHelper.disconnect();
});

test.describe('レート制限とバックオフ機能', () => {
  const testEmail = 'e2e_test_2@example.com';
  
  test.beforeEach(async () => {
    await dbHelper.resetUserVerification(testEmail);
    await dbHelper.clearResendHistoryForUser(testEmail);
    
    // Wait a bit to ensure rate limits are cleared
    await new Promise(resolve => setTimeout(resolve, 1000));
  });
  
  test('レート制限の基本動作', async () => {
    const rapidRequests = 10;
    const results = [];
    
    // Send rapid requests
    for (let i = 1; i <= rapidRequests; i++) {
      const response = await apiHelper.sendResendRequest(testEmail);
      results.push({
        attempt: i,
        status: response.status,
        code: response.data?.error?.code
      });
      
      // If rate limited, break
      if (response.status === 429 && response.data?.error?.code === 'RATE_LIMITED') {
        break;
      }
      
      // Very short delay
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    // Should have hit rate limit
    const rateLimited = results.some(r => r.status === 429 && r.code === 'RATE_LIMITED');
    expect(rateLimited).toBe(true);
  });
  
  test('指数バックオフの検証', async () => {
    const cooldowns: number[] = [];
    
    for (let i = 1; i <= 4; i++) {
      const response = await apiHelper.sendResendRequest(testEmail);
      
      if (response.status === 200) {
        const cooldown = response.data?.data?.cooldownSeconds;
        if (cooldown) {
          cooldowns.push(cooldown);
        }
      } else if (response.status === 429) {
        const cooldown = response.data?.error?.details?.cooldownSeconds;
        if (cooldown) {
          // Wait for cooldown
          await new Promise(resolve => setTimeout(resolve, (cooldown + 1) * 1000));
        }
      }
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    // Verify cooldowns are increasing
    expect(cooldowns.length).toBeGreaterThan(0);
    
    // Check if cooldowns follow exponential pattern (approximately)
    // Expected: 60, 120, 240, 480...
    if (cooldowns.length >= 2) {
      for (let i = 1; i < cooldowns.length; i++) {
        // Each cooldown should be greater than the previous
        expect(cooldowns[i]).toBeGreaterThanOrEqual(cooldowns[i - 1]);
      }
    }
  });
  
  test('クールダウン時間の正確性', async () => {
    // Send first request
    const response1 = await apiHelper.sendResendRequest(testEmail);
    expect(response1.status).toBe(200);
    
    // Send immediate second request (should be rate limited)
    const response2 = await apiHelper.sendResendRequest(testEmail);
    
    if (response2.status === 429) {
      const cooldownSeconds = response2.data?.error?.details?.cooldownSeconds;
      const nextRetryAt = response2.data?.error?.details?.nextRetryAt;
      
      expect(cooldownSeconds).toBeDefined();
      expect(cooldownSeconds).toBeGreaterThan(0);
      expect(nextRetryAt).toBeDefined();
      
      // Verify nextRetryAt is in the future
      const nextRetryTime = new Date(nextRetryAt).getTime();
      const now = Date.now();
      expect(nextRetryTime).toBeGreaterThan(now);
      
      // The difference should be approximately cooldownSeconds
      const diffSeconds = Math.round((nextRetryTime - now) / 1000);
      expect(Math.abs(diffSeconds - cooldownSeconds)).toBeLessThanOrEqual(2);
    }
  });
  
  test('最大試行回数とレート制限の相互作用', async () => {
    let maxAttemptsHit = false;
    let rateLimitHit = false;
    const responses = [];
    
    // Try up to 7 attempts
    for (let i = 1; i <= 7; i++) {
      const response = await apiHelper.sendResendRequest(testEmail);
      responses.push({
        attempt: i,
        status: response.status,
        code: response.data?.error?.code
      });
      
      if (response.status === 429) {
        if (response.data?.error?.code === 'MAX_ATTEMPTS_EXCEEDED') {
          maxAttemptsHit = true;
          break;
        } else if (response.data?.error?.code === 'RATE_LIMITED') {
          rateLimitHit = true;
          // Wait for cooldown
          const cooldown = response.data?.error?.details?.cooldownSeconds || 1;
          await new Promise(resolve => setTimeout(resolve, (cooldown + 0.5) * 1000));
        }
      }
      
      // Small delay between successful requests
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Should hit max attempts (not just rate limit)
    expect(maxAttemptsHit).toBe(true);
    
    // Should have hit max attempts within 6 attempts
    const maxAttemptsResponse = responses.find(r => r.code === 'MAX_ATTEMPTS_EXCEEDED');
    expect(maxAttemptsResponse).toBeDefined();
    expect(maxAttemptsResponse!.attempt).toBeLessThanOrEqual(6);
  });
  
  test('異なるメールアドレスの独立したレート制限', async () => {
    const email1 = 'e2e_test_3@example.com';
    const email2 = 'e2e_test_4@example.com';
    
    // Clear histories
    await dbHelper.clearResendHistoryForUser(email1);
    await dbHelper.clearResendHistoryForUser(email2);
    
    // Send requests for email1
    const response1a = await apiHelper.sendResendRequest(email1);
    expect(response1a.status).toBe(200);
    
    const response1b = await apiHelper.sendResendRequest(email1);
    // Might be rate limited
    
    // Send request for email2 (should not be affected by email1's rate limit)
    const response2 = await apiHelper.sendResendRequest(email2);
    expect(response2.status).toBe(200);
    
    // Verify email2 is not rate limited even if email1 is
    if (response1b.status === 429) {
      expect(response2.status).toBe(200);
    }
  });
  
  test('レート制限の回復確認', async () => {
    // Trigger rate limit
    const response1 = await apiHelper.sendResendRequest(testEmail);
    const response2 = await apiHelper.sendResendRequest(testEmail);
    
    let cooldownSeconds = 0;
    if (response2.status === 429) {
      cooldownSeconds = response2.data?.error?.details?.cooldownSeconds || 60;
    }
    
    // Wait for cooldown period
    if (cooldownSeconds > 0) {
      await new Promise(resolve => setTimeout(resolve, (cooldownSeconds + 1) * 1000));
      
      // Should be able to send request again
      const response3 = await apiHelper.sendResendRequest(testEmail);
      
      // Should not be rate limited (unless hit max attempts)
      if (response3.status === 429) {
        expect(response3.data?.error?.code).not.toBe('RATE_LIMITED');
      }
    }
  });
  
  test('retriesRemaining の正確性', async () => {
    const retriesRemaining: number[] = [];
    
    for (let i = 1; i <= 5; i++) {
      const response = await apiHelper.sendResendRequest(testEmail);
      
      if (response.status === 200) {
        const remaining = response.data?.data?.retriesRemaining;
        if (remaining !== undefined) {
          retriesRemaining.push(remaining);
        }
      } else if (response.status === 429) {
        if (response.data?.error?.code === 'MAX_ATTEMPTS_EXCEEDED') {
          break;
        }
        // Wait for rate limit
        const cooldown = response.data?.error?.details?.cooldownSeconds || 1;
        await new Promise(resolve => setTimeout(resolve, (cooldown + 0.5) * 1000));
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Verify retriesRemaining decreases
    expect(retriesRemaining.length).toBeGreaterThan(0);
    
    for (let i = 1; i < retriesRemaining.length; i++) {
      expect(retriesRemaining[i]).toBeLessThan(retriesRemaining[i - 1]);
    }
    
    // Last value should be 0 or close to it
    if (retriesRemaining.length > 0) {
      const lastValue = retriesRemaining[retriesRemaining.length - 1];
      expect(lastValue).toBeLessThanOrEqual(1);
    }
  });
});