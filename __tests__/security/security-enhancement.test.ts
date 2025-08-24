/**
 * セキュリティ強化機能のテスト
 */

import { RateLimiterV2 } from '@/lib/security/rate-limiter-v2';
import { CSRFProtection } from '@/lib/security/csrf-protection';
import { SanitizerV2 } from '@/lib/security/sanitizer-v2';
import { AuditLogger, AuditEvent } from '@/lib/security/audit-logger';

describe('Security Enhancement Tests', () => {
  
  describe('Rate Limiter V2', () => {
    let rateLimiter: RateLimiterV2;
    
    beforeEach(() => {
      rateLimiter = new RateLimiterV2({
        max: 3,
        window: 1000, // 1秒
      });
    });
    
    test('should allow requests within limit', async () => {
      const identifier = 'test-user';
      
      const result1 = await rateLimiter.check(identifier);
      expect(result1.allowed).toBe(true);
      expect(result1.remaining).toBe(2);
      
      const result2 = await rateLimiter.check(identifier);
      expect(result2.allowed).toBe(true);
      expect(result2.remaining).toBe(1);
      
      const result3 = await rateLimiter.check(identifier);
      expect(result3.allowed).toBe(true);
      expect(result3.remaining).toBe(0);
    });
    
    test('should block requests exceeding limit', async () => {
      const identifier = 'test-user';
      
      // 制限まで使い切る
      await rateLimiter.check(identifier);
      await rateLimiter.check(identifier);
      await rateLimiter.check(identifier);
      
      // 4回目はブロックされるべき
      const result = await rateLimiter.check(identifier);
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });
    
    test('should reset after time window', async () => {
      const identifier = 'test-user';
      
      // 制限まで使い切る
      await rateLimiter.check(identifier);
      await rateLimiter.check(identifier);
      await rateLimiter.check(identifier);
      
      // 時間窓が経過するまで待つ
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      // リセット後は許可されるべき
      const result = await rateLimiter.check(identifier);
      expect(result.allowed).toBe(true);
    });
  });
  
  describe('CSRF Protection', () => {
    test('should generate unique tokens', () => {
      const token1 = CSRFProtection.generateToken();
      const token2 = CSRFProtection.generateToken();
      
      expect(token1).not.toBe(token2);
      expect(token1.length).toBe(64); // 32バイト * 2（hex）
    });
    
    test('should skip GET requests', () => {
      const mockRequest = {
        method: 'GET',
        cookies: { get: jest.fn() },
        headers: { get: jest.fn() },
      } as any;
      
      const result = CSRFProtection.verifyToken(mockRequest);
      expect(result).toBe(true);
    });
    
    test('should validate POST requests', () => {
      const token = 'test-token';
      const mockRequest = {
        method: 'POST',
        cookies: {
          get: jest.fn((name) => {
            if (name === 'csrf-token') return { value: token };
            if (name === 'csrf-session') return { value: 'session' };
            return undefined;
          }),
        },
        headers: {
          get: jest.fn((name) => {
            if (name === 'x-csrf-token') return token;
            return undefined;
          }),
        },
      } as any;
      
      const result = CSRFProtection.verifyToken(mockRequest);
      expect(result).toBe(true);
    });
  });
  
  describe('Sanitizer V2', () => {
    describe('HTML Sanitization', () => {
      test('should remove script tags', () => {
        const input = 'Hello <script>alert("XSS")</script> World';
        const output = SanitizerV2.sanitizeHTML(input);
        
        expect(output).not.toContain('<script>');
        expect(output).not.toContain('alert');
      });
      
      test('should remove event handlers', () => {
        const input = '<div onclick="alert(1)">Click me</div>';
        const output = SanitizerV2.sanitizeHTML(input);
        
        expect(output).not.toContain('onclick');
      });
      
      test('should allow safe HTML tags', () => {
        const input = '<p>This is <strong>bold</strong> and <em>italic</em></p>';
        const output = SanitizerV2.sanitizeHTML(input);
        
        expect(output).toContain('<p>');
        expect(output).toContain('<strong>');
        expect(output).toContain('<em>');
      });
    });
    
    describe('URL Sanitization', () => {
      test('should block javascript: URLs', () => {
        const input = 'javascript:alert(1)';
        const output = SanitizerV2.sanitizeURL(input);
        
        expect(output).toBe('');
      });
      
      test('should allow safe URLs', () => {
        const safeUrls = [
          'https://example.com',
          'http://localhost:3000',
          '/relative/path',
          'mailto:test@example.com',
        ];
        
        for (const url of safeUrls) {
          const output = SanitizerV2.sanitizeURL(url);
          expect(output).toBe(url);
        }
      });
    });
    
    describe('Markdown Sanitization', () => {
      test('should remove HTML tags from markdown', () => {
        const input = '# Title\n\n<script>alert(1)</script>\n\nParagraph';
        const output = SanitizerV2.sanitizeMarkdown(input);
        
        expect(output).not.toContain('<script>');
        expect(output).toContain('# Title');
      });
    });
    
    describe('JSON Sanitization', () => {
      test('should sanitize nested objects', () => {
        const input = {
          name: 'Test <script>alert(1)</script>',
          nested: {
            value: 'javascript:alert(2)',
          },
          array: ['<img onerror="alert(3)">'],
        };
        
        const output = SanitizerV2.sanitizeJSON(input);
        
        expect(output.name).not.toContain('<script>');
        expect(output.nested.value).not.toContain('javascript:');
        expect(output.array[0]).not.toContain('onerror');
      });
    });
  });
  
  describe('Audit Logger', () => {
    test('should determine severity correctly', () => {
      const testCases = [
        { event: AuditEvent.LOGIN_SUCCESS, expected: 'LOW' },
        { event: AuditEvent.POST_CREATE, expected: 'MEDIUM' },
        { event: AuditEvent.LOGIN_FAILURE, expected: 'HIGH' },
        { event: AuditEvent.XSS_ATTEMPT, expected: 'CRITICAL' },
      ];
      
      for (const testCase of testCases) {
        // Private methodのテストは実際のログ出力で確認
        const consoleSpy = jest.spyOn(console, 'log');
        
        AuditLogger.log({
          event: testCase.event,
          userId: 'test-user',
        });
        
        // セキュリティレベルがログに含まれることを確認
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('[AUDIT]'),
          expect.objectContaining({
            severity: testCase.expected,
          })
        );
        
        consoleSpy.mockRestore();
      }
    });
    
    test('should trigger alerts for critical events', async () => {
      const alertCallback = jest.fn();
      AuditLogger.registerAlertCallback(alertCallback);
      
      await AuditLogger.log({
        event: AuditEvent.XSS_ATTEMPT,
        userId: 'test-user',
        severity: 'CRITICAL',
      });
      
      // アラートコールバックが呼ばれることを確認
      expect(alertCallback).toHaveBeenCalledWith(
        AuditEvent.XSS_ATTEMPT,
        expect.objectContaining({
          event: AuditEvent.XSS_ATTEMPT,
          userId: 'test-user',
        })
      );
    });
  });
});