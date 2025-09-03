/**
 * フォローAPI統合テスト
 * 優先度1実装の統合テスト
 */

import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';

import { GET, POST, DELETE } from '@/app/api/users/[userId]/follow/route';
import dbConnect from '@/lib/mongodb';

// モック
jest.mock('next-auth');
jest.mock('@/lib/mongodb');
jest.mock('@/lib/models/User');
jest.mock('@/lib/models/Follow');

describe('Follow API Integration Tests', () => {
  const mockSession = {
    user: {
      email: 'test@example.com',
      id: '68b00bb9e2d2d61e174b2204',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    (dbConnect as jest.Mock).mockResolvedValue(true);
  });

  describe('ObjectID Validation (400エラー)', () => {
    const invalidIds = [
      { id: '123', description: '短すぎるID' },
      { id: '68b00b3', description: '7文字のID' },
      { id: 'invalid-id', description: '無効な文字' },
      { id: 'xxxxxxxxxxxxxxxxxxxxxxxx', description: '24文字だが無効' },
    ];

    invalidIds.forEach(({ id, description }) => {
      describe(`${description}: ${id}`, () => {
        test('GET - 400エラーを返す', async () => {
          const request = new NextRequest(`http://localhost:3000/api/users/${id}/follow`);
          const params = Promise.resolve({ userId: id });
          
          const response = await GET(request, { params });
          const data = await response.json();
          
          expect(response.status).toBe(400);
          expect(data.error).toBe('無効なユーザーID形式です');
          expect(data.code).toBe('INVALID_OBJECT_ID_FORMAT');
          expect(data.details).toContain('24 character hex string');
        });

        test('POST - 400エラーを返す', async () => {
          const request = new NextRequest(`http://localhost:3000/api/users/${id}/follow`);
          const params = Promise.resolve({ userId: id });
          
          const response = await POST(request, { params });
          const data = await response.json();
          
          expect(response.status).toBe(400);
          expect(data.error).toBe('無効なユーザーID形式です');
          expect(data.code).toBe('INVALID_OBJECT_ID_FORMAT');
        });

        test('DELETE - 400エラーを返す', async () => {
          const request = new NextRequest(`http://localhost:3000/api/users/${id}/follow`);
          const params = Promise.resolve({ userId: id });
          
          const response = await DELETE(request, { params });
          const data = await response.json();
          
          expect(response.status).toBe(400);
          expect(data.error).toBe('無効なユーザーID形式です');
          expect(data.code).toBe('INVALID_OBJECT_ID_FORMAT');
        });
      });
    });
  });

  describe('認証チェック (401エラー)', () => {
    beforeEach(() => {
      (getServerSession as jest.Mock).mockResolvedValue(null);
    });

    test('GET - 未認証で401エラー', async () => {
      const validId = '507f1f77bcf86cd799439011';
      const request = new NextRequest(`http://localhost:3000/api/users/${validId}/follow`);
      const params = Promise.resolve({ userId: validId });
      
      const response = await GET(request, { params });
      const data = await response.json();
      
      expect(response.status).toBe(401);
      expect(data.error).toBe('ログインが必要です');
    });

    test('POST - 未認証で401エラー', async () => {
      const validId = '507f1f77bcf86cd799439011';
      const request = new NextRequest(`http://localhost:3000/api/users/${validId}/follow`);
      const params = Promise.resolve({ userId: validId });
      
      const response = await POST(request, { params });
      const data = await response.json();
      
      expect(response.status).toBe(401);
      expect(data.error).toBe('ログインが必要です');
    });

    test('DELETE - 未認証で401エラー', async () => {
      const validId = '507f1f77bcf86cd799439011';
      const request = new NextRequest(`http://localhost:3000/api/users/${validId}/follow`);
      const params = Promise.resolve({ userId: validId });
      
      const response = await DELETE(request, { params });
      const data = await response.json();
      
      expect(response.status).toBe(401);
      expect(data.error).toBe('ログインが必要です');
    });
  });

  describe('エラーハンドリング', () => {
    test('予期しないエラーで500エラーとrequestId', async () => {
      const validId = '507f1f77bcf86cd799439011';
      const request = new NextRequest(`http://localhost:3000/api/users/${validId}/follow`);
      const params = Promise.resolve({ userId: validId });
      
      // dbConnectがエラーを投げる
      (dbConnect as jest.Mock).mockRejectedValue(new Error('Database connection failed'));
      
      const response = await GET(request, { params });
      const data = await response.json();
      
      expect(response.status).toBe(500);
      expect(data.error).toBe('サーバーエラーが発生しました');
      expect(data.code).toBe('INTERNAL_SERVER_ERROR');
      expect(data.requestId).toBeDefined();
      expect(typeof data.requestId).toBe('string');
    });
  });

  describe('デバッグログ', () => {
    let consoleSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    test('有効なObjectIDでデバッグ情報を出力', async () => {
      const validId = '507f1f77bcf86cd799439011';
      const request = new NextRequest(`http://localhost:3000/api/users/${validId}/follow`);
      const params = Promise.resolve({ userId: validId });
      
      await GET(request, { params });
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Follow API GET] ID validation:'),
        expect.objectContaining({
          isValid: true,
          value: validId,
          type: 'string',
          length: 24,
          hexCheck: true,
        })
      );
    });

    test('無効なObjectIDでデバッグ情報を出力', async () => {
      const invalidId = '68b00b3';
      const request = new NextRequest(`http://localhost:3000/api/users/${invalidId}/follow`);
      const params = Promise.resolve({ userId: invalidId });
      
      await GET(request, { params });
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Follow API GET] ID validation:'),
        expect.objectContaining({
          isValid: false,
          value: invalidId,
          type: 'string',
          length: 7,
          hexCheck: true,
        })
      );
    });
  });
});

describe('パフォーマンステスト', () => {
  test('バリデーションが高速に処理される', async () => {
    const invalidId = '68b00b3';
    const request = new NextRequest(`http://localhost:3000/api/users/${invalidId}/follow`);
    const params = Promise.resolve({ userId: invalidId });
    
    const startTime = performance.now();
    
    await GET(request, { params });
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    // バリデーションが50ms以内に完了すること
    expect(duration).toBeLessThan(50);
    
    console.log(`API validation completed in ${duration.toFixed(2)}ms`);
  });
});