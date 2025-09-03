/**
 * ObjectID バリデーター単体テスト
 * 優先度1実装の単体テスト
 */

import { isValidObjectId, validateObjectId, debugObjectId } from '@/lib/validators/objectId';

describe('ObjectID Validator', () => {
  describe('isValidObjectId', () => {
    test('有効な24文字のObjectIDを受け入れる', () => {
      const validIds = [
        '507f1f77bcf86cd799439011',
        '68b00bb9e2d2d61e174b2204',
        'aaaaaaaaaaaaaaaaaaaaaaaa',
        'AAAAAAAAAAAAAAAAAAAAAAAA',
        '123456789abcdef012345678',
      ];

      validIds.forEach(id => {
        expect(isValidObjectId(id)).toBe(true);
      });
    });

    test('無効なObjectIDを拒否する', () => {
      const invalidIds = [
        '123',                      // 短すぎる
        '68b00b3',                  // 7文字（開発者ツールで省略された形式）
        'invalid-id-format',        // 無効な文字
        '68b00b3xxxxxxxxxxxxxxxxx', // 無効な文字を含む
        'GGGGGG00000000000000000',  // 16進数ではない
        '',                         // 空文字列
        null,                       // null
        undefined,                  // undefined
        123,                        // 数値
        {},                         // オブジェクト
        [],                         // 配列
      ];

      invalidIds.forEach(id => {
        expect(isValidObjectId(id)).toBe(false);
      });
    });

    test('24文字だが16進数でない文字列を拒否する', () => {
      const invalidHex = [
        'xxxxxxxxxxxxxxxxxxxxxxxx',
        '!@#$%^&*()_+{}[]|\\:";\'<>?,.',
        '                        ',  // スペース24文字
      ];

      invalidHex.forEach(id => {
        expect(isValidObjectId(id)).toBe(false);
      });
    });
  });

  describe('validateObjectId', () => {
    test('有効なObjectIDの場合は文字列を返す', () => {
      const validId = '507f1f77bcf86cd799439011';
      expect(validateObjectId(validId)).toBe(validId);
    });

    test('無効なObjectIDの場合はnullを返す', () => {
      const invalidIds = ['123', '', null, undefined];
      
      invalidIds.forEach(id => {
        expect(validateObjectId(id)).toBeNull();
      });
    });

    test('警告ログを出力する', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      validateObjectId('invalid');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invalid ObjectID')
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('debugObjectId', () => {
    test('有効なObjectIDの詳細情報を返す', () => {
      const id = '507f1f77bcf86cd799439011';
      const debug = debugObjectId(id);
      
      expect(debug).toEqual({
        isValid: true,
        value: id,
        type: 'string',
        length: 24,
        hexCheck: true,
      });
    });

    test('無効なObjectIDの詳細情報を返す', () => {
      const id = '68b00b3';
      const debug = debugObjectId(id);
      
      expect(debug).toEqual({
        isValid: false,
        value: id,
        type: 'string',
        length: 7,
        hexCheck: true,
      });
    });

    test('非文字列型の詳細情報を返す', () => {
      const debug = debugObjectId(123);
      
      expect(debug).toEqual({
        isValid: false,
        value: 123,
        type: 'number',
        length: undefined,
        hexCheck: undefined,
      });
    });

    test('nullとundefinedの詳細情報を返す', () => {
      const debugNull = debugObjectId(null);
      expect(debugNull.type).toBe('object');
      expect(debugNull.isValid).toBe(false);
      
      const debugUndefined = debugObjectId(undefined);
      expect(debugUndefined.type).toBe('undefined');
      expect(debugUndefined.isValid).toBe(false);
    });
  });
});

// パフォーマンステスト
describe('ObjectID Validator Performance', () => {
  test('大量のバリデーションが高速に処理される', () => {
    const iterations = 10000;
    const validId = '507f1f77bcf86cd799439011';
    
    const startTime = performance.now();
    
    for (let i = 0; i < iterations; i++) {
      isValidObjectId(validId);
    }
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    // 10000回のバリデーションが100ms以内に完了すること
    expect(duration).toBeLessThan(100);
    
    console.warn(`Performance: ${iterations} validations in ${duration.toFixed(2)}ms`);
  });
});