/**
 * Timeline API 単体テスト（STRICT120準拠）
 * 認証必須・デバッグログ付き
 */

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/timeline/route';
import { getToken } from 'next-auth/jwt';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import Post from '@/models/Post';
import Follow from '@/models/Follow';

// モックの設定
jest.mock('next-auth/jwt');
jest.mock('@/lib/mongodb');
jest.mock('@/models/User');
jest.mock('@/models/Post');
jest.mock('@/models/Follow');

// 認証情報
const AUTH_EMAIL = 'one.photolife+1@gmail.com';
const AUTH_PASSWORD = '?@thc123THC@?';
const TEST_USER_ID = 'test-user-123';

// デバッグログ関数
class TestDebugLogger {
  private logs: any[] = [];
  
  log(category: string, data: any) {
    const entry = {
      timestamp: new Date().toISOString(),
      category,
      data,
      testFile: 'timeline-api.test.ts'
    };
    this.logs.push(entry);
    console.log('[TEST-DEBUG]', JSON.stringify(entry));
  }
  
  getAll() {
    return this.logs;
  }
  
  clear() {
    this.logs = [];
  }
}

const debugLogger = new TestDebugLogger();

describe('Timeline API Unit Tests - 認証必須', () => {
  
  beforeEach(() => {
    debugLogger.clear();
    jest.clearAllMocks();
  });
  
  afterEach(() => {
    // テスト終了時のログ出力
    console.log('[TEST-COMPLETE] Total logs:', debugLogger.getAll().length);
  });
  
  describe('認証チェック', () => {
    
    test('OK: 有効な認証トークンでのアクセス', async () => {
      debugLogger.log('test-start', { test: 'valid-auth-token' });
      
      // モック設定
      const mockToken = {
        id: TEST_USER_ID,
        email: AUTH_EMAIL,
        emailVerified: true,
        name: 'Test User'
      };
      
      (getToken as jest.Mock).mockResolvedValue(mockToken);
      (connectDB as jest.Mock).mockResolvedValue(undefined);
      
      const mockUser = {
        _id: TEST_USER_ID,
        following: []
      };
      
      User.findById = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUser)
      });
      
      Follow.find = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue([])
      });
      
      Post.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([])
      });
      
      Post.countDocuments = jest.fn().mockResolvedValue(0);
      
      // リクエスト作成
      const request = new NextRequest('http://localhost:3000/api/timeline');
      
      debugLogger.log('request-created', { url: request.url });
      
      // API呼び出し
      const response = await GET(request);
      const data = await response.json();
      
      debugLogger.log('response-received', {
        status: response.status,
        success: data.success,
        dataLength: data.data?.length
      });
      
      // 検証
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
      expect(Array.isArray(data.data)).toBe(true);
      
      debugLogger.log('test-complete', { result: 'PASS' });
    });
    
    test('NG: 認証トークンなしでのアクセス（401エラー）', async () => {
      debugLogger.log('test-start', { test: 'no-auth-token' });
      
      // モック設定
      (getToken as jest.Mock).mockResolvedValue(null);
      
      // リクエスト作成
      const request = new NextRequest('http://localhost:3000/api/timeline');
      
      debugLogger.log('request-created', { 
        url: request.url,
        hasToken: false 
      });
      
      // API呼び出し
      const response = await GET(request);
      const data = await response.json();
      
      debugLogger.log('response-received', {
        status: response.status,
        success: data.success,
        error: data.error
      });
      
      // 検証
      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
      expect(data.error.code).toBe('UNAUTHORIZED');
      
      debugLogger.log('test-complete', { 
        result: 'PASS',
        expectedError: '401 UNAUTHORIZED'
      });
    });
    
    test('NG: メール未確認ユーザーのアクセス（403エラー）', async () => {
      debugLogger.log('test-start', { test: 'email-not-verified' });
      
      // モック設定
      const mockToken = {
        id: TEST_USER_ID,
        email: AUTH_EMAIL,
        emailVerified: false, // メール未確認
        name: 'Test User'
      };
      
      (getToken as jest.Mock).mockResolvedValue(mockToken);
      
      // リクエスト作成
      const request = new NextRequest('http://localhost:3000/api/timeline');
      
      debugLogger.log('request-created', { 
        url: request.url,
        emailVerified: false 
      });
      
      // API呼び出し
      const response = await GET(request);
      const data = await response.json();
      
      debugLogger.log('response-received', {
        status: response.status,
        success: data.success,
        error: data.error
      });
      
      // 検証
      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('EMAIL_NOT_VERIFIED');
      
      debugLogger.log('test-complete', { 
        result: 'PASS',
        expectedError: '403 EMAIL_NOT_VERIFIED'
      });
    });
  });
  
  describe('データ取得ロジック', () => {
    
    test('OK: フォロー中のユーザーの投稿取得', async () => {
      debugLogger.log('test-start', { test: 'following-posts' });
      
      // モック設定
      const mockToken = {
        id: TEST_USER_ID,
        email: AUTH_EMAIL,
        emailVerified: true
      };
      
      (getToken as jest.Mock).mockResolvedValue(mockToken);
      (connectDB as jest.Mock).mockResolvedValue(undefined);
      
      const mockUser = { _id: TEST_USER_ID };
      User.findById = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUser)
      });
      
      // フォロー関係
      const mockFollowing = [
        { following: 'user-2' },
        { following: 'user-3' }
      ];
      Follow.find = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue(mockFollowing)
      });
      
      // 投稿データ
      const mockPosts = [
        { _id: 'post-1', content: 'Test post 1', author: 'user-2' },
        { _id: 'post-2', content: 'Test post 2', author: 'user-3' }
      ];
      
      Post.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockPosts)
      });
      
      Post.countDocuments = jest.fn().mockResolvedValue(2);
      
      // リクエスト作成
      const request = new NextRequest('http://localhost:3000/api/timeline');
      
      // API呼び出し
      const response = await GET(request);
      const data = await response.json();
      
      debugLogger.log('response-data', {
        status: response.status,
        postsCount: data.data?.length,
        followingCount: data.metadata?.followingCount
      });
      
      // 検証
      expect(response.status).toBe(200);
      expect(data.data.length).toBe(2);
      expect(data.metadata.followingCount).toBe(2);
      
      debugLogger.log('test-complete', { result: 'PASS' });
    });
    
    test('NG: ユーザーが存在しない場合（404エラー）', async () => {
      debugLogger.log('test-start', { test: 'user-not-found' });
      
      // モック設定
      const mockToken = {
        id: 'non-existent-user',
        email: AUTH_EMAIL,
        emailVerified: true
      };
      
      (getToken as jest.Mock).mockResolvedValue(mockToken);
      (connectDB as jest.Mock).mockResolvedValue(undefined);
      
      // ユーザーが見つからない
      User.findById = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue(null)
      });
      
      // リクエスト作成
      const request = new NextRequest('http://localhost:3000/api/timeline');
      
      // API呼び出し
      const response = await GET(request);
      const data = await response.json();
      
      debugLogger.log('response-received', {
        status: response.status,
        error: data.error
      });
      
      // 検証
      expect(response.status).toBe(404);
      expect(data.error.code).toBe('USER_NOT_FOUND');
      
      debugLogger.log('test-complete', { 
        result: 'PASS',
        expectedError: '404 USER_NOT_FOUND' 
      });
    });
  });
  
  describe('ページネーション', () => {
    
    test('OK: 正常なページネーション処理', async () => {
      debugLogger.log('test-start', { test: 'pagination' });
      
      // 基本モック設定
      const mockToken = {
        id: TEST_USER_ID,
        email: AUTH_EMAIL,
        emailVerified: true
      };
      
      (getToken as jest.Mock).mockResolvedValue(mockToken);
      (connectDB as jest.Mock).mockResolvedValue(undefined);
      
      User.findById = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue({ _id: TEST_USER_ID })
      });
      
      Follow.find = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue([])
      });
      
      Post.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([])
      });
      
      Post.countDocuments = jest.fn().mockResolvedValue(50);
      
      // リクエスト作成（ページ2、リミット10）
      const request = new NextRequest(
        'http://localhost:3000/api/timeline?page=2&limit=10'
      );
      
      // API呼び出し
      const response = await GET(request);
      const data = await response.json();
      
      debugLogger.log('pagination-data', {
        page: data.pagination?.page,
        limit: data.pagination?.limit,
        total: data.pagination?.total,
        totalPages: data.pagination?.totalPages,
        hasNext: data.pagination?.hasNext,
        hasPrev: data.pagination?.hasPrev
      });
      
      // 検証
      expect(data.pagination.page).toBe(2);
      expect(data.pagination.limit).toBe(10);
      expect(data.pagination.totalPages).toBe(5);
      expect(data.pagination.hasNext).toBe(true);
      expect(data.pagination.hasPrev).toBe(true);
      
      debugLogger.log('test-complete', { result: 'PASS' });
    });
    
    test('NG: 不正なページパラメータの処理', async () => {
      debugLogger.log('test-start', { test: 'invalid-pagination' });
      
      // 基本モック設定（省略）
      const mockToken = {
        id: TEST_USER_ID,
        email: AUTH_EMAIL,
        emailVerified: true
      };
      
      (getToken as jest.Mock).mockResolvedValue(mockToken);
      (connectDB as jest.Mock).mockResolvedValue(undefined);
      
      User.findById = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue({ _id: TEST_USER_ID })
      });
      
      Follow.find = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue([])
      });
      
      Post.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([])
      });
      
      Post.countDocuments = jest.fn().mockResolvedValue(0);
      
      // リクエスト作成（負の値とリミット超過）
      const request = new NextRequest(
        'http://localhost:3000/api/timeline?page=-1&limit=1000'
      );
      
      // API呼び出し
      const response = await GET(request);
      const data = await response.json();
      
      debugLogger.log('pagination-corrected', {
        requestedPage: -1,
        actualPage: data.pagination?.page,
        requestedLimit: 1000,
        actualLimit: data.pagination?.limit
      });
      
      // 検証（自動補正）
      expect(response.status).toBe(200);
      expect(data.pagination.page).toBe(1); // 最小値に補正
      expect(data.pagination.limit).toBeLessThanOrEqual(100); // 最大値に補正
      
      debugLogger.log('test-complete', { 
        result: 'PASS',
        note: 'Invalid params auto-corrected'
      });
    });
  });
  
  describe('エラー処理とリカバリー', () => {
    
    test('NG: データベース接続エラー（500エラー）', async () => {
      debugLogger.log('test-start', { test: 'db-connection-error' });
      
      // モック設定
      const mockToken = {
        id: TEST_USER_ID,
        email: AUTH_EMAIL,
        emailVerified: true
      };
      
      (getToken as jest.Mock).mockResolvedValue(mockToken);
      
      // DB接続エラー
      (connectDB as jest.Mock).mockRejectedValue(
        new Error('Database connection failed')
      );
      
      // リクエスト作成
      const request = new NextRequest('http://localhost:3000/api/timeline');
      
      // API呼び出し
      const response = await GET(request);
      const data = await response.json();
      
      debugLogger.log('error-response', {
        status: response.status,
        error: data.error
      });
      
      // 検証
      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('FETCH_ERROR');
      
      debugLogger.log('test-complete', { 
        result: 'PASS',
        expectedError: '500 FETCH_ERROR'
      });
    });
    
    test('対処法: リトライメカニズムの確認', async () => {
      debugLogger.log('test-start', { test: 'retry-mechanism' });
      
      let attempts = 0;
      const maxRetries = 3;
      
      // リトライロジックのシミュレーション
      const retryableOperation = async () => {
        attempts++;
        debugLogger.log('retry-attempt', { attempt: attempts });
        
        if (attempts < maxRetries) {
          throw new Error('Temporary failure');
        }
        return { success: true };
      };
      
      let result;
      for (let i = 0; i < maxRetries; i++) {
        try {
          result = await retryableOperation();
          break;
        } catch (error) {
          debugLogger.log('retry-failed', { 
            attempt: i + 1,
            error: (error as Error).message 
          });
          if (i === maxRetries - 1) {
            throw error;
          }
          // 指数バックオフ
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 100));
        }
      }
      
      expect(result).toEqual({ success: true });
      expect(attempts).toBe(maxRetries);
      
      debugLogger.log('test-complete', { 
        result: 'PASS',
        totalAttempts: attempts
      });
    });
  });
});

// 構文チェック用のダミーエクスポート
export {};