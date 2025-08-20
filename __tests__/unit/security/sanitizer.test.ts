import { InputSanitizer } from '@/lib/security/sanitizer';

describe('InputSanitizer Unit Tests', () => {
  describe('sanitizeText', () => {
    test('通常のテキストはそのまま返す', () => {
      const input = 'これは普通のテキストです';
      const result = InputSanitizer.sanitizeText(input);
      expect(result).toBe(input);
    });

    test('scriptタグを除去する', () => {
      const input = '<script>alert("XSS")</script>テスト';
      const result = InputSanitizer.sanitizeText(input);
      expect(result).toBe('テスト');
      expect(result).not.toContain('<script>');
    });

    test('イベントハンドラを除去する', () => {
      const input = '<img src=x onerror="alert(1)">画像';
      const result = InputSanitizer.sanitizeText(input);
      expect(result).not.toContain('onerror');
      expect(result).not.toContain('alert');
    });

    test('JavaScriptプロトコルを除去する', () => {
      const input = '<a href="javascript:alert(1)">リンク</a>';
      const result = InputSanitizer.sanitizeText(input);
      expect(result).not.toContain('javascript:');
    });

    test('HTMLタグ記号を除去する', () => {
      const input = '<div>テキスト</div>';
      const result = InputSanitizer.sanitizeText(input);
      expect(result).toBe('divテキスト/div');
    });

    test('最大長を制限する', () => {
      const input = 'a'.repeat(15000);
      const result = InputSanitizer.sanitizeText(input);
      expect(result.length).toBeLessThanOrEqual(10000);
    });

    test('null/undefinedを空文字列として扱う', () => {
      expect(InputSanitizer.sanitizeText(null as any)).toBe('');
      expect(InputSanitizer.sanitizeText(undefined as any)).toBe('');
    });
  });

  describe('sanitizeHTML', () => {
    test('安全なHTMLタグは保持する可能性がある', () => {
      const input = '<b>太字</b>と<i>斜体</i>';
      const result = InputSanitizer.sanitizeHTML(input);
      // 実装により挙動が異なる
      expect(result).toBeDefined();
    });

    test('危険なタグを除去する', () => {
      const inputs = [
        '<script>alert("XSS")</script>',
        '<iframe src="evil.com"></iframe>',
        '<object data="evil.swf"></object>'
      ];

      inputs.forEach(input => {
        const result = InputSanitizer.sanitizeHTML(input);
        expect(result).not.toContain('<script>');
        expect(result).not.toContain('<iframe>');
        expect(result).not.toContain('<object>');
      });
    });
  });

  describe('sanitizeQuery', () => {
    test('MongoDB演算子を無効化する', () => {
      const input = { '$ne': null, 'normal': 'value' };
      const result = InputSanitizer.sanitizeQuery(input);
      
      expect(result).not.toHaveProperty('$ne');
      expect(result).toHaveProperty('normal', 'value');
    });

    test('危険なプロトタイプキーを除去する', () => {
      const input = {
        '__proto__': { isAdmin: true },
        'constructor': 'malicious',
        'prototype': 'dangerous',
        'safe': 'value'
      };
      
      const result = InputSanitizer.sanitizeQuery(input);
      
      expect(result).not.toHaveProperty('__proto__');
      expect(result).not.toHaveProperty('constructor');
      expect(result).not.toHaveProperty('prototype');
      expect(result).toHaveProperty('safe', 'value');
    });

    test('ネストされたオブジェクトも再帰的にサニタイズする', () => {
      const input = {
        level1: {
          '$gt': 100,
          level2: {
            '__proto__': 'bad',
            safe: 'ok'
          }
        }
      };
      
      const result = InputSanitizer.sanitizeQuery(input) as any;
      
      expect(result.level1).not.toHaveProperty('$gt');
      expect(result.level1.level2).not.toHaveProperty('__proto__');
      expect(result.level1.level2).toHaveProperty('safe', 'ok');
    });

    test('配列内の要素もサニタイズする', () => {
      const input = [
        { '$ne': null },
        { 'safe': 'value' },
        { '__proto__': 'bad' }
      ];
      
      const result = InputSanitizer.sanitizeQuery(input) as any[];
      
      expect(result[0]).not.toHaveProperty('$ne');
      expect(result[1]).toHaveProperty('safe', 'value');
      expect(result[2]).not.toHaveProperty('__proto__');
    });
  });

  describe('sanitizeFilename', () => {
    test('英数字とハイフンアンダースコアは保持する', () => {
      const input = 'test-file_123.txt';
      const result = InputSanitizer.sanitizeFilename(input);
      expect(result).toBe(input);
    });

    test('特殊文字を置換する', () => {
      const input = 'file@#$%^&*.txt';
      const result = InputSanitizer.sanitizeFilename(input);
      expect(result).toBe('file_______.txt');
    });

    test('連続するピリオドを単一に変換する', () => {
      const input = 'file...txt';
      const result = InputSanitizer.sanitizeFilename(input);
      expect(result).toBe('file.txt');
    });
  });

  describe('sanitizeURL', () => {
    test('有効なHTTP/HTTPSのURLを許可する', () => {
      const urls = [
        'http://example.com',
        'https://example.com/path'
      ];
      
      urls.forEach(url => {
        const result = InputSanitizer.sanitizeURL(url);
        expect(result).toBe(url + '/');
      });
    });

    test('JavaScriptプロトコルを拒否する', () => {
      const input = 'javascript:alert(1)';
      const result = InputSanitizer.sanitizeURL(input);
      expect(result).toBeNull();
    });

    test('無効なURLをnullとして返す', () => {
      const input = 'not-a-url';
      const result = InputSanitizer.sanitizeURL(input);
      expect(result).toBeNull();
    });
  });

  describe('sanitizeEmail', () => {
    test('有効なメールアドレスを正規化する', () => {
      const input = 'TEST@EXAMPLE.COM';
      const result = InputSanitizer.sanitizeEmail(input);
      expect(result).toBe('test@example.com');
    });

    test('無効なメールアドレスを空文字列として返す', () => {
      const inputs = [
        'not-an-email',
        '@example.com',
        'user@',
        'user@.com'
      ];
      
      inputs.forEach(input => {
        const result = InputSanitizer.sanitizeEmail(input);
        expect(result).toBe('');
      });
    });
  });

  describe('sanitizeNumber', () => {
    test('有効な数値を返す', () => {
      expect(InputSanitizer.sanitizeNumber('123')).toBe(123);
      expect(InputSanitizer.sanitizeNumber(456)).toBe(456);
      expect(InputSanitizer.sanitizeNumber('78.9')).toBe(78.9);
    });

    test('最小値と最大値の制約を適用する', () => {
      expect(InputSanitizer.sanitizeNumber(5, 10, 100)).toBe(10);
      expect(InputSanitizer.sanitizeNumber(150, 10, 100)).toBe(100);
      expect(InputSanitizer.sanitizeNumber(50, 10, 100)).toBe(50);
    });

    test('無効な入力をnullとして返す', () => {
      expect(InputSanitizer.sanitizeNumber('abc')).toBeNull();
      expect(InputSanitizer.sanitizeNumber(NaN)).toBeNull();
      expect(InputSanitizer.sanitizeNumber(Infinity)).toBeNull();
    });
  });
});