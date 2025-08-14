/**
 * 権限管理システムの自動テスト
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { MongoClient } from 'mongodb';
import bcrypt from 'bcryptjs';

// テスト用ユーザーデータ
const TEST_USERS = {
  userA: {
    email: 'test-user-a@test.com',
    password: 'testpass123',
    name: 'Test User A',
    role: 'user'
  },
  userB: {
    email: 'test-user-b@test.com',
    password: 'testpass123',
    name: 'Test User B',
    role: 'user'
  },
  admin: {
    email: 'test-admin@test.com',
    password: 'adminpass123',
    name: 'Test Admin',
    role: 'admin'
  }
};

// APIテストヘルパー
class PermissionTestHelper {
  private baseUrl = 'http://localhost:3000';
  private cookies: Map<string, string> = new Map();

  // ログイン
  async login(email: string, password: string): Promise<string> {
    const res = await fetch(`${this.baseUrl}/api/auth/signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const setCookie = res.headers.get('set-cookie');
    if (setCookie) {
      this.cookies.set(email, setCookie);
      return setCookie;
    }
    throw new Error('Login failed');
  }

  // 投稿作成
  async createPost(userEmail: string, content: string): Promise<any> {
    const cookie = this.cookies.get(userEmail);
    const res = await fetch(`${this.baseUrl}/api/posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookie || ''
      },
      body: JSON.stringify({ content })
    });

    return res.json();
  }

  // 投稿更新試行
  async updatePost(userEmail: string, postId: string, content: string): Promise<Response> {
    const cookie = this.cookies.get(userEmail);
    return fetch(`${this.baseUrl}/api/posts/${postId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookie || ''
      },
      body: JSON.stringify({ content })
    });
  }

  // 投稿削除試行
  async deletePost(userEmail: string, postId: string): Promise<Response> {
    const cookie = this.cookies.get(userEmail);
    return fetch(`${this.baseUrl}/api/posts/${postId}`, {
      method: 'DELETE',
      headers: {
        'Cookie': cookie || ''
      }
    });
  }

  // 権限情報取得
  async getPermissions(userEmail: string): Promise<any> {
    const cookie = this.cookies.get(userEmail);
    const res = await fetch(`${this.baseUrl}/api/user/permissions`, {
      headers: {
        'Cookie': cookie || ''
      }
    });
    return res.json();
  }
}

describe('権限管理システムテスト', () => {
  let helper: PermissionTestHelper;
  let mongoClient: MongoClient;
  let userAPostId: string;
  let userBPostId: string;

  beforeAll(async () => {
    helper = new PermissionTestHelper();
    
    // MongoDB接続とテストユーザー作成
    mongoClient = new MongoClient(process.env.MONGODB_URI || 'mongodb://localhost:27017');
    await mongoClient.connect();
    const db = mongoClient.db('boardDB');
    
    // テストユーザー作成
    for (const [key, user] of Object.entries(TEST_USERS)) {
      const hashedPassword = await bcrypt.hash(user.password, 10);
      await db.collection('users').insertOne({
        ...user,
        password: hashedPassword,
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    // ログイン
    await helper.login(TEST_USERS.userA.email, TEST_USERS.userA.password);
    await helper.login(TEST_USERS.userB.email, TEST_USERS.userB.password);
    await helper.login(TEST_USERS.admin.email, TEST_USERS.admin.password);

    // テスト用投稿作成
    const postA = await helper.createPost(TEST_USERS.userA.email, 'User A の投稿');
    const postB = await helper.createPost(TEST_USERS.userB.email, 'User B の投稿');
    userAPostId = postA.post._id;
    userBPostId = postB.post._id;
  });

  afterAll(async () => {
    // テストデータクリーンアップ
    const db = mongoClient.db('boardDB');
    await db.collection('users').deleteMany({
      email: { $in: Object.values(TEST_USERS).map(u => u.email) }
    });
    await db.collection('posts').deleteMany({
      _id: { $in: [userAPostId, userBPostId] }
    });
    await mongoClient.close();
  });

  describe('✅ 正常系: 権限がある場合', () => {
    test('自分の投稿を編集できる', async () => {
      const res = await helper.updatePost(
        TEST_USERS.userA.email,
        userAPostId,
        '編集されたコンテンツ'
      );
      
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.message).toContain('更新');
    });

    test('自分の投稿を削除できる', async () => {
      const tempPost = await helper.createPost(TEST_USERS.userA.email, '削除用投稿');
      const res = await helper.deletePost(TEST_USERS.userA.email, tempPost.post._id);
      
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.message).toContain('削除');
    });

    test('管理者は他人の投稿を編集できる', async () => {
      const res = await helper.updatePost(
        TEST_USERS.admin.email,
        userBPostId,
        '管理者による編集'
      );
      
      expect(res.status).toBe(200);
    });
  });

  describe('⛔ 異常系: 権限がない場合', () => {
    test('他人の投稿を編集できない（403エラー）', async () => {
      const res = await helper.updatePost(
        TEST_USERS.userB.email,
        userAPostId,
        '不正な編集試行'
      );
      
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toContain('権限');
    });

    test('他人の投稿を削除できない（403エラー）', async () => {
      const res = await helper.deletePost(TEST_USERS.userB.email, userAPostId);
      
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toContain('権限');
    });

    test('未認証でのアクセスは拒否される（401エラー）', async () => {
      const res = await fetch(`http://localhost:3000/api/posts/${userAPostId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: '未認証更新' })
      });
      
      expect(res.status).toBe(401);
    });
  });

  describe('🔍 権限情報の取得', () => {
    test('一般ユーザーの権限情報', async () => {
      const permissions = await helper.getPermissions(TEST_USERS.userA.email);
      
      expect(permissions.role).toBe('user');
      expect(permissions.permissions).toContain('post:create');
      expect(permissions.permissions).toContain('post:update:own');
      expect(permissions.permissions).toContain('post:delete:own');
      expect(permissions.permissions).not.toContain('post:delete');
    });

    test('管理者の権限情報', async () => {
      const permissions = await helper.getPermissions(TEST_USERS.admin.email);
      
      expect(permissions.role).toBe('admin');
      expect(permissions.permissions).toContain('post:create');
      expect(permissions.permissions).toContain('post:update');
      expect(permissions.permissions).toContain('post:delete');
      expect(permissions.permissions).toContain('admin:access');
    });
  });
});

// 実行用エクスポート
export default PermissionTestHelper;