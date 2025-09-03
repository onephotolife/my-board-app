/**
 * 通知API単体テスト
 * STRICT120準拠 - テストID: UT-NOTIF-001
 * 
 * 前提条件：認証済みセッション必須
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { NextRequest, NextResponse } from 'next/server';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

// API Handlers
import { GET, POST } from '@/app/api/notifications/route';
import { DELETE, PATCH } from '@/app/api/notifications/[id]/route';

// Models
import Notification from '@/lib/models/Notification';
import User from '@/lib/models/User';

// Test constants
const VALID_USER_ID = 'user-001';
const VALID_SESSION = {
  user: {
    id: VALID_USER_ID,
    email: 'one.photolife+1@gmail.com',
    name: 'Test User'
  },
  expires: new Date(Date.now() + 86400000).toISOString() // 24時間後
};

let mongoServer: MongoMemoryServer;

describe('【UT-NOTIF-001】通知取得API（GET /api/notifications）', () => {
  
  beforeEach(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
    
    // テストユーザー作成
    await User.create({
      _id: VALID_USER_ID,
      email: VALID_SESSION.user.email,
      name: VALID_SESSION.user.name,
      emailVerified: new Date()
    });
    
    console.warn('🔔 [NOTIF-TEST] Test environment initialized');
  });
  
  afterEach(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });
  
  // =====================
  // 正常系テスト
  // =====================
  
  test('【OK】通知0件の場合', async () => {
    const request = createAuthenticatedRequest('GET', '/api/notifications');
    const response = await GET(request);
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data.notifications).toEqual([]);
    expect(data.unreadCount).toBe(0);
    
    console.warn('✅ Empty notifications returned correctly');
  });
  
  test('【OK】通知複数件取得', async () => {
    // テストデータ作成
    const notifications = await createTestNotifications(5);
    
    const request = createAuthenticatedRequest('GET', '/api/notifications');
    const response = await GET(request);
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data.notifications).toHaveLength(5);
    expect(data.unreadCount).toBe(3); // 3件未読
    
    // 新しい順にソート確認
    const dates = data.notifications.map((n: any) => new Date(n.createdAt).getTime());
    expect(dates).toEqual([...dates].sort((a, b) => b - a));
    
    console.warn('✅ Multiple notifications retrieved');
    console.warn('   Total:', data.notifications.length);
    console.warn('   Unread:', data.unreadCount);
  });
  
  test('【OK】ページネーション動作確認', async () => {
    // 15件のテストデータ作成
    await createTestNotifications(15);
    
    // ページ1（デフォルト10件）
    const request1 = createAuthenticatedRequest('GET', '/api/notifications?page=1&limit=10');
    const response1 = await GET(request1);
    const data1 = await response1.json();
    
    expect(data1.notifications).toHaveLength(10);
    expect(data1.totalCount).toBe(15);
    expect(data1.currentPage).toBe(1);
    expect(data1.totalPages).toBe(2);
    
    // ページ2（残り5件）
    const request2 = createAuthenticatedRequest('GET', '/api/notifications?page=2&limit=10');
    const response2 = await GET(request2);
    const data2 = await response2.json();
    
    expect(data2.notifications).toHaveLength(5);
    expect(data2.currentPage).toBe(2);
    
    console.warn('✅ Pagination working correctly');
    console.warn('   Page 1:', data1.notifications.length, 'items');
    console.warn('   Page 2:', data2.notifications.length, 'items');
  });
  
  test('【OK】フィルタリング（type別）', async () => {
    await createTestNotifications(10);
    
    // いいね通知のみ取得
    const request = createAuthenticatedRequest('GET', '/api/notifications?type=like');
    const response = await GET(request);
    const data = await response.json();
    
    const allLikes = data.notifications.every((n: any) => n.type === 'like');
    expect(allLikes).toBe(true);
    
    console.warn('✅ Type filtering works');
    console.warn('   Filter: type=like');
    console.warn('   Results:', data.notifications.length);
  });
  
  // =====================
  // 異常系テスト
  // =====================
  
  test('【NG】認証なしでアクセス', async () => {
    const request = new NextRequest('http://localhost:3000/api/notifications');
    // セッションなしでリクエスト
    
    const response = await GET(request);
    const data = await response.json();
    
    expect(response.status).toBe(401);
    expect(data.error).toContain('Authentication required');
    
    console.warn('✅ Unauthenticated access blocked');
    console.warn('   Status:', response.status);
    console.warn('   Error:', data.error);
  });
  
  test('【NG】無効なユーザーID', async () => {
    // 存在しないユーザーIDでセッション作成
    const invalidSession = {
      user: { id: 'invalid-user-999', email: 'test@example.com' },
      expires: VALID_SESSION.expires
    };
    
    const request = createAuthenticatedRequest('GET', '/api/notifications', invalidSession);
    const response = await GET(request);
    const data = await response.json();
    
    expect(response.status).toBe(404);
    expect(data.error).toContain('User not found');
    
    console.warn('✅ Invalid user ID handled');
  });
  
  test('【NG】不正なページ番号', async () => {
    const request = createAuthenticatedRequest('GET', '/api/notifications?page=-1');
    const response = await GET(request);
    const data = await response.json();
    
    expect(response.status).toBe(400);
    expect(data.error).toContain('Invalid page number');
    
    console.warn('✅ Invalid pagination parameters handled');
  });
});

describe('【UT-NOTIF-002】通知更新API（POST /api/notifications）', () => {
  
  beforeEach(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
    
    await User.create({
      _id: VALID_USER_ID,
      email: VALID_SESSION.user.email,
      name: VALID_SESSION.user.name
    });
  });
  
  afterEach(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });
  
  test('【OK】既読マーク（単一）', async () => {
    const notification = await Notification.create({
      recipient: VALID_USER_ID,
      type: 'like',
      actor: {
        _id: 'actor-001',
        name: 'Actor User',
        email: 'actor@example.com'
      },
      target: { type: 'post', id: 'post-001' },
      message: 'Test notification',
      isRead: false
    });
    
    const request = createAuthenticatedRequest('POST', '/api/notifications', VALID_SESSION, {
      action: 'markAsRead',
      notificationId: notification._id.toString()
    });
    
    const response = await POST(request);
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.notification.isRead).toBe(true);
    expect(data.notification.readAt).toBeDefined();
    
    // DBでも確認
    const updated = await Notification.findById(notification._id);
    expect(updated?.isRead).toBe(true);
    
    console.warn('✅ Single notification marked as read');
  });
  
  test('【OK】全既読マーク', async () => {
    // 5件の未読通知作成
    await createTestNotifications(5);
    
    const request = createAuthenticatedRequest('POST', '/api/notifications', VALID_SESSION, {
      action: 'markAllAsRead'
    });
    
    const response = await POST(request);
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.updatedCount).toBe(3); // 未読3件が更新される
    
    // DBで確認
    const unreadCount = await Notification.countDocuments({
      recipient: VALID_USER_ID,
      isRead: false
    });
    expect(unreadCount).toBe(0);
    
    console.warn('✅ All notifications marked as read');
    console.warn('   Updated count:', data.updatedCount);
  });
  
  test('【NG】他人の通知を既読マーク試行', async () => {
    const otherNotification = await Notification.create({
      recipient: 'other-user-002',
      type: 'like',
      actor: {
        _id: 'actor-001',
        name: 'Actor',
        email: 'actor@example.com'
      },
      target: { type: 'post', id: 'post-001' },
      message: 'Other user notification',
      isRead: false
    });
    
    const request = createAuthenticatedRequest('POST', '/api/notifications', VALID_SESSION, {
      action: 'markAsRead',
      notificationId: otherNotification._id.toString()
    });
    
    const response = await POST(request);
    const data = await response.json();
    
    expect(response.status).toBe(403);
    expect(data.error).toContain('Forbidden');
    
    // DBで未読のまま確認
    const unchanged = await Notification.findById(otherNotification._id);
    expect(unchanged?.isRead).toBe(false);
    
    console.warn('✅ Cross-user access prevented');
  });
});

describe('【UT-NOTIF-003】通知削除API（DELETE /api/notifications/[id]）', () => {
  
  beforeEach(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
    
    await User.create({
      _id: VALID_USER_ID,
      email: VALID_SESSION.user.email,
      name: VALID_SESSION.user.name
    });
  });
  
  afterEach(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });
  
  test('【OK】自分の通知を削除', async () => {
    const notification = await Notification.create({
      recipient: VALID_USER_ID,
      type: 'comment',
      actor: {
        _id: 'actor-001',
        name: 'Commenter',
        email: 'commenter@example.com'
      },
      target: { type: 'post', id: 'post-001' },
      message: 'New comment on your post',
      isRead: true
    });
    
    const request = createAuthenticatedRequest(
      'DELETE',
      `/api/notifications/${notification._id}`,
      VALID_SESSION
    );
    
    const response = await DELETE(request, { params: { id: notification._id.toString() } });
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toContain('deleted');
    
    // DBから削除確認
    const deleted = await Notification.findById(notification._id);
    expect(deleted).toBeNull();
    
    console.warn('✅ Notification deleted successfully');
  });
  
  test('【NG】他人の通知を削除試行', async () => {
    const otherNotification = await Notification.create({
      recipient: 'other-user-003',
      type: 'follow',
      actor: {
        _id: 'actor-002',
        name: 'Follower',
        email: 'follower@example.com'
      },
      target: { type: 'user', id: 'other-user-003' },
      message: 'New follower',
      isRead: false
    });
    
    const request = createAuthenticatedRequest(
      'DELETE',
      `/api/notifications/${otherNotification._id}`,
      VALID_SESSION
    );
    
    const response = await DELETE(request, { params: { id: otherNotification._id.toString() } });
    const data = await response.json();
    
    expect(response.status).toBe(403);
    expect(data.error).toContain('Forbidden');
    
    // DBに残っていることを確認
    const stillExists = await Notification.findById(otherNotification._id);
    expect(stillExists).toBeDefined();
    
    console.warn('✅ Cross-user deletion prevented');
  });
  
  test('【NG】存在しない通知IDで削除試行', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    
    const request = createAuthenticatedRequest(
      'DELETE',
      `/api/notifications/${fakeId}`,
      VALID_SESSION
    );
    
    const response = await DELETE(request, { params: { id: fakeId.toString() } });
    const data = await response.json();
    
    expect(response.status).toBe(404);
    expect(data.error).toContain('not found');
    
    console.warn('✅ Non-existent notification handled');
  });
});

// =====================
// ヘルパー関数
// =====================

function createAuthenticatedRequest(
  method: string,
  url: string,
  session = VALID_SESSION,
  body?: any
): NextRequest {
  const request = new NextRequest(`http://localhost:3000${url}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer mock-token-${session.user.id}`
    },
    body: body ? JSON.stringify(body) : undefined
  });
  
  // セッション情報をモック
  (request as any).auth = session;
  
  return request;
}

async function createTestNotifications(count: number) {
  const notifications = [];
  
  for (let i = 0; i < count; i++) {
    const notification = await Notification.create({
      recipient: VALID_USER_ID,
      type: ['like', 'comment', 'follow', 'system'][i % 4] as any,
      actor: {
        _id: `actor-${i}`,
        name: `User ${i}`,
        email: `user${i}@example.com`
      },
      target: {
        type: ['post', 'comment', 'user'][i % 3] as any,
        id: `target-${i}`,
        preview: i % 2 === 0 ? `Preview text ${i}` : undefined
      },
      message: `Test notification ${i}`,
      isRead: i % 3 === 0, // 約1/3が既読
      createdAt: new Date(Date.now() - i * 3600000) // 1時間ずつ過去
    });
    
    notifications.push(notification);
  }
  
  return notifications;
}

export {};