import mongoose from 'mongoose';

const DOMPurifyImp = require('isomorphic-dompurify');

const DOMPurify = DOMPurifyImp.default || DOMPurifyImp;
import type { INotification } from '@/lib/models/Notification';
import Notification from '@/lib/models/Notification';
import { broadcastEvent } from '@/lib/socket/socket-manager';

// 通知作成のインターフェース
export interface CreateNotificationParams {
  recipient: string;
  type: 'follow' | 'like' | 'comment' | 'system';
  actor: {
    _id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  target: {
    type: 'post' | 'comment' | 'user';
    id: string;
    preview?: string;
  };
  message?: string;
  metadata?: {
    ipAddress?: string;
    userAgent?: string;
    clientVersion?: string;
  };
}

// 通知サービスクラス
export class NotificationService {
  private static instance: NotificationService;
  
  // シングルトンパターン
  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }
  
  private constructor() {
    console.warn('[NOTIFICATION-SERVICE] Service initialized');
  }
  
  /**
   * 通知を作成して配信
   */
  async createAndDeliver(params: CreateNotificationParams): Promise<INotification> {
    try {
      console.warn('[NOTIFICATION-SERVICE-DEBUG] Creating notification:', {
        type: params.type,
        recipient: params.recipient,
        actor: params.actor._id,
        timestamp: new Date().toISOString()
      });
      
      // 自分自身への通知は作成しない
      if (params.recipient === params.actor._id) {
        console.warn('[NOTIFICATION-SERVICE] Skipping self-notification');
        return null as any;
      }
      
      // XSSサニタイゼーション（三層防御の第一層）
      const sanitizedParams = this.sanitizeParams(params);
      
      // 通知作成
      const notification = new Notification({
        recipient: sanitizedParams.recipient,
        type: sanitizedParams.type,
        actor: sanitizedParams.actor,
        target: sanitizedParams.target,
        message: sanitizedParams.message || '',
        metadata: sanitizedParams.metadata,
      });
      
      // 保存
      await notification.save();
      
      console.warn('[NOTIFICATION-SERVICE-SUCCESS] Notification created:', {
        id: notification._id,
        type: notification.type,
        recipient: notification.recipient
      });
      
      // リアルタイム配信
      await this.deliverRealtime(notification);
      
      // 未読数更新の配信
      await this.updateUnreadCount(notification.recipient);
      
      return notification;
      
    } catch (error) {
      console.error('[NOTIFICATION-SERVICE-ERROR] Failed to create notification:', {
        error: error.message,
        stack: error.stack,
        params: params,
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }
  
  /**
   * パラメータのサニタイゼーション
   */
  private sanitizeParams(params: CreateNotificationParams): CreateNotificationParams {
    const config = {
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: [],
      KEEP_CONTENT: false
    };
    
    return {
      ...params,
      actor: {
        ...params.actor,
        name: DOMPurify.sanitize(params.actor.name, config),
      },
      target: {
        ...params.target,
        preview: params.target.preview 
          ? DOMPurify.sanitize(params.target.preview, config).substring(0, 100)
          : undefined,
      },
      message: params.message 
        ? DOMPurify.sanitize(params.message, config).substring(0, 200)
        : undefined,
    };
  }
  
  /**
   * リアルタイム配信
   */
  private async deliverRealtime(notification: INotification): Promise<void> {
    try {
      const notificationData = notification.toJSON();
      
      // Socket.IO経由で配信
      broadcastEvent(`notification:new:${notification.recipient}`, {
        notification: notificationData,
        timestamp: new Date().toISOString()
      });
      
      console.warn('[NOTIFICATION-SERVICE] Realtime delivery sent:', {
        recipient: notification.recipient,
        type: notification.type
      });
      
    } catch (error) {
      console.error('[NOTIFICATION-SERVICE-ERROR] Realtime delivery failed:', error);
      // リアルタイム配信の失敗は無視（通知自体は作成済み）
    }
  }
  
  /**
   * 未読数を更新して配信
   */
  private async updateUnreadCount(recipientId: string): Promise<void> {
    try {
      const unreadCount = await Notification.countUnread(recipientId);
      
      // Socket.IO経由で未読数を配信
      broadcastEvent(`notification:count:${recipientId}`, {
        unreadCount,
        timestamp: new Date().toISOString()
      });
      
      console.warn('[NOTIFICATION-SERVICE] Unread count updated:', {
        recipient: recipientId,
        unreadCount
      });
      
    } catch (error) {
      console.error('[NOTIFICATION-SERVICE-ERROR] Failed to update unread count:', error);
    }
  }
  
  /**
   * フォロー通知作成
   */
  async createFollowNotification(
    followerId: string,
    followerInfo: { name: string; email: string; avatar?: string },
    targetUserId: string
  ): Promise<INotification | null> {
    return this.createAndDeliver({
      recipient: targetUserId,
      type: 'follow',
      actor: {
        _id: followerId,
        ...followerInfo
      },
      target: {
        type: 'user',
        id: targetUserId,
      },
    });
  }
  
  /**
   * いいね通知作成
   */
  async createLikeNotification(
    likerId: string,
    likerInfo: { name: string; email: string; avatar?: string },
    postId: string,
    postOwnerId: string,
    postPreview?: string
  ): Promise<INotification | null> {
    return this.createAndDeliver({
      recipient: postOwnerId,
      type: 'like',
      actor: {
        _id: likerId,
        ...likerInfo
      },
      target: {
        type: 'post',
        id: postId,
        preview: postPreview
      },
    });
  }
  
  /**
   * コメント通知作成
   */
  async createCommentNotification(
    commenterId: string,
    commenterInfo: { name: string; email: string; avatar?: string },
    postId: string,
    postOwnerId: string,
    commentPreview?: string
  ): Promise<INotification | null> {
    return this.createAndDeliver({
      recipient: postOwnerId,
      type: 'comment',
      actor: {
        _id: commenterId,
        ...commenterInfo
      },
      target: {
        type: 'post',
        id: postId,
        preview: commentPreview
      },
    });
  }
  
  /**
   * システム通知作成
   */
  async createSystemNotification(
    recipientId: string,
    message: string,
    targetId?: string,
    targetType?: 'post' | 'comment' | 'user'
  ): Promise<INotification> {
    return this.createAndDeliver({
      recipient: recipientId,
      type: 'system',
      actor: {
        _id: '000000000000000000000000', // システムID
        name: 'System',
        email: 'system@blankinai.com',
        avatar: '/system-avatar.png'
      },
      target: {
        type: targetType || 'user',
        id: targetId || recipientId,
      },
      message,
    });
  }
  
  /**
   * 通知を既読にする
   */
  async markAsRead(notificationIds: string[], recipientId: string): Promise<{ updatedCount: number }> {
    try {
      const result = await Notification.markAsRead(notificationIds, recipientId);
      
      // 未読数を更新
      await this.updateUnreadCount(recipientId);
      
      console.warn('[NOTIFICATION-SERVICE] Marked as read:', {
        count: result.modifiedCount,
        recipient: recipientId
      });
      
      return { updatedCount: result.modifiedCount };
      
    } catch (error) {
      console.error('[NOTIFICATION-SERVICE-ERROR] Failed to mark as read:', error);
      throw error;
    }
  }
  
  /**
   * 全て既読にする
   */
  async markAllAsRead(recipientId: string): Promise<{ updatedCount: number }> {
    try {
      const result = await Notification.markAllAsRead(recipientId);
      
      // 未読数を0に更新
      broadcastEvent(`notification:count:${recipientId}`, {
        unreadCount: 0,
        timestamp: new Date().toISOString()
      });
      
      console.warn('[NOTIFICATION-SERVICE] Marked all as read:', {
        count: result.modifiedCount,
        recipient: recipientId
      });
      
      return { updatedCount: result.modifiedCount };
      
    } catch (error) {
      console.error('[NOTIFICATION-SERVICE-ERROR] Failed to mark all as read:', error);
      throw error;
    }
  }
  
  /**
   * 通知を削除
   */
  async deleteNotification(notificationId: string, recipientId: string): Promise<boolean> {
    try {
      const notification = await Notification.findOne({
        _id: notificationId,
        recipient: recipientId
      });
      
      if (!notification) {
        console.warn('[NOTIFICATION-SERVICE] Notification not found:', notificationId);
        return false;
      }
      
      await notification.softDelete();
      
      // 未読数を更新
      if (!notification.isRead) {
        await this.updateUnreadCount(recipientId);
      }
      
      console.warn('[NOTIFICATION-SERVICE] Notification deleted:', notificationId);
      return true;
      
    } catch (error) {
      console.error('[NOTIFICATION-SERVICE-ERROR] Failed to delete notification:', error);
      throw error;
    }
  }
  
  /**
   * 期限切れ通知のクリーンアップ
   */
  async cleanupExpired(): Promise<number> {
    try {
      const result = await Notification.deleteExpired();
      
      console.warn('[NOTIFICATION-SERVICE] Expired notifications cleaned up:', {
        count: result.deletedCount,
        timestamp: new Date().toISOString()
      });
      
      return result.deletedCount;
      
    } catch (error) {
      console.error('[NOTIFICATION-SERVICE-ERROR] Failed to cleanup expired:', error);
      throw error;
    }
  }
}

// デフォルトエクスポート
export default NotificationService.getInstance();