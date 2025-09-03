/**
 * 監査ログ機能の拡充版
 * 全重要操作の記録とアラート機能
 */

import mongoose from 'mongoose';

import { AuditLog } from './audit-log';

export enum AuditEvent {
  // 認証イベント
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILURE = 'LOGIN_FAILURE',
  LOGOUT = 'LOGOUT',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  PASSWORD_CHANGE = 'PASSWORD_CHANGE',
  PASSWORD_RESET = 'PASSWORD_RESET',
  EMAIL_VERIFICATION = 'EMAIL_VERIFICATION',
  
  // 投稿イベント
  POST_CREATE = 'POST_CREATE',
  POST_UPDATE = 'POST_UPDATE',
  POST_DELETE = 'POST_DELETE',
  POST_VIEW = 'POST_VIEW',
  
  // ユーザーイベント
  USER_REGISTER = 'USER_REGISTER',
  USER_UPDATE = 'USER_UPDATE',
  USER_DELETE = 'USER_DELETE',
  PROFILE_UPDATE = 'PROFILE_UPDATE',
  
  // セキュリティイベント
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  CSRF_VIOLATION = 'CSRF_VIOLATION',
  XSS_ATTEMPT = 'XSS_ATTEMPT',
  SQL_INJECTION_ATTEMPT = 'SQL_INJECTION_ATTEMPT',
  PATH_TRAVERSAL_ATTEMPT = 'PATH_TRAVERSAL_ATTEMPT',
  UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS',
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
  
  // 管理イベント
  ADMIN_ACTION = 'ADMIN_ACTION',
  CONFIG_CHANGE = 'CONFIG_CHANGE',
  PERMISSION_CHANGE = 'PERMISSION_CHANGE',
  
  // システムイベント
  SYSTEM_ERROR = 'SYSTEM_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  API_ERROR = 'API_ERROR',
}

export type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface AuditLogEntry {
  event: AuditEvent;
  userId?: string;
  email?: string;
  ip?: string;
  userAgent?: string;
  data?: any;
  severity?: Severity;
  metadata?: {
    sessionId?: string;
    requestId?: string;
    targetUserId?: string;
    targetResourceId?: string;
    oldValue?: any;
    newValue?: any;
    errorMessage?: string;
    stackTrace?: string;
  };
}

export class AuditLogger {
  private static alertCallbacks: ((event: AuditEvent, details: AuditLogEntry) => void)[] = [];
  
  /**
   * 監査ログの記録
   */
  static async log(entry: AuditLogEntry): Promise<void> {
    try {
      // セキュリティレベルの自動判定
      const severity = entry.severity || this.getSeverity(entry.event);
      
      // ログエントリの作成
      const logEntry = await AuditLog.create({
        event: entry.event,
        userId: entry.userId,
        email: entry.email,
        ip: entry.ip,
        userAgent: entry.userAgent,
        timestamp: new Date(),
        severity,
        details: {
          ...entry.data,
          metadata: entry.metadata,
        },
      });
      
      // 高優先度イベントのアラート
      if (severity === 'HIGH' || severity === 'CRITICAL') {
        await this.sendAlert(entry.event, entry);
      }
      
      // 統計情報の更新
      await this.updateStatistics(entry.event, entry.userId);
      
      console.warn(`[AUDIT] ${entry.event}:`, {
        userId: entry.userId,
        email: entry.email,
        severity,
        timestamp: new Date().toISOString(),
      });
      
    } catch (error) {
      console.error('[AUDIT] Failed to create log:', error);
      // ログ記録失敗をフォールバックログに記録
      this.fallbackLog(entry, error);
    }
  }
  
  /**
   * セキュリティレベルの判定
   */
  private static getSeverity(event: AuditEvent): Severity {
    const severityMap: Record<AuditEvent, Severity> = {
      // LOW
      [AuditEvent.LOGIN_SUCCESS]: 'LOW',
      [AuditEvent.LOGOUT]: 'LOW',
      [AuditEvent.POST_VIEW]: 'LOW',
      [AuditEvent.EMAIL_VERIFICATION]: 'LOW',
      
      // MEDIUM
      [AuditEvent.POST_CREATE]: 'MEDIUM',
      [AuditEvent.POST_UPDATE]: 'MEDIUM',
      [AuditEvent.POST_DELETE]: 'MEDIUM',
      [AuditEvent.USER_UPDATE]: 'MEDIUM',
      [AuditEvent.PROFILE_UPDATE]: 'MEDIUM',
      [AuditEvent.PASSWORD_CHANGE]: 'MEDIUM',
      
      // HIGH
      [AuditEvent.LOGIN_FAILURE]: 'HIGH',
      [AuditEvent.RATE_LIMIT_EXCEEDED]: 'HIGH',
      [AuditEvent.UNAUTHORIZED_ACCESS]: 'HIGH',
      [AuditEvent.PASSWORD_RESET]: 'HIGH',
      [AuditEvent.USER_DELETE]: 'HIGH',
      [AuditEvent.PERMISSION_CHANGE]: 'HIGH',
      
      // CRITICAL
      [AuditEvent.CSRF_VIOLATION]: 'CRITICAL',
      [AuditEvent.XSS_ATTEMPT]: 'CRITICAL',
      [AuditEvent.SQL_INJECTION_ATTEMPT]: 'CRITICAL',
      [AuditEvent.PATH_TRAVERSAL_ATTEMPT]: 'CRITICAL',
      [AuditEvent.SUSPICIOUS_ACTIVITY]: 'CRITICAL',
      [AuditEvent.SYSTEM_ERROR]: 'CRITICAL',
      [AuditEvent.DATABASE_ERROR]: 'CRITICAL',
      
      // デフォルト
      [AuditEvent.USER_REGISTER]: 'MEDIUM',
      [AuditEvent.SESSION_EXPIRED]: 'LOW',
      [AuditEvent.ADMIN_ACTION]: 'HIGH',
      [AuditEvent.CONFIG_CHANGE]: 'HIGH',
      [AuditEvent.API_ERROR]: 'MEDIUM',
    };
    
    return severityMap[event] || 'MEDIUM';
  }
  
  /**
   * アラート送信
   */
  private static async sendAlert(event: AuditEvent, details: AuditLogEntry): Promise<void> {
    console.warn(`🚨 [SECURITY ALERT] ${event}:`, {
      userId: details.userId,
      email: details.email,
      ip: details.ip,
      severity: details.severity,
      timestamp: new Date().toISOString(),
      data: details.data,
    });
    
    // 登録されたコールバックを実行
    for (const callback of this.alertCallbacks) {
      try {
        callback(event, details);
      } catch (error) {
        console.error('[AUDIT] Alert callback error:', error);
      }
    }
    
    // TODO: メール通知、Slack通知などの実装
  }
  
  /**
   * 統計情報の更新
   */
  private static async updateStatistics(event: AuditEvent, userId?: string): Promise<void> {
    // 1時間以内の同一イベントをカウント
    if (userId) {
      const oneHourAgo = new Date(Date.now() - 3600000);
      const count = await AuditLog.countDocuments({
        event,
        userId,
        timestamp: { $gte: oneHourAgo },
      });
      
      // 異常なアクティビティの検出
      const thresholds: Partial<Record<AuditEvent, number>> = {
        [AuditEvent.LOGIN_FAILURE]: 5,
        [AuditEvent.RATE_LIMIT_EXCEEDED]: 10,
        [AuditEvent.POST_CREATE]: 50,
        [AuditEvent.POST_DELETE]: 20,
      };
      
      const threshold = thresholds[event];
      if (threshold && count > threshold) {
        await this.log({
          event: AuditEvent.SUSPICIOUS_ACTIVITY,
          userId,
          severity: 'CRITICAL',
          data: {
            originalEvent: event,
            count,
            threshold,
            timeWindow: '1 hour',
          },
        });
      }
    }
  }
  
  /**
   * フォールバックログ（ファイルベース）
   */
  private static fallbackLog(entry: AuditLogEntry, error: any): void {
    const fallbackEntry = {
      ...entry,
      error: error?.message || 'Unknown error',
      timestamp: new Date().toISOString(),
    };
    
    // コンソールに出力（本番環境では外部サービスに送信）
    console.error('[AUDIT FALLBACK]:', JSON.stringify(fallbackEntry));
  }
  
  /**
   * アラートコールバックの登録
   */
  static registerAlertCallback(callback: (event: AuditEvent, details: AuditLogEntry) => void): void {
    this.alertCallbacks.push(callback);
  }
  
  /**
   * 監査ログの検索
   */
  static async search(criteria: {
    event?: AuditEvent;
    userId?: string;
    email?: string;
    severity?: Severity;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<any[]> {
    const query: any = {};
    
    if (criteria.event) query.event = criteria.event;
    if (criteria.userId) query.userId = criteria.userId;
    if (criteria.email) query.email = criteria.email;
    if (criteria.severity) query.severity = criteria.severity;
    
    if (criteria.startDate || criteria.endDate) {
      query.timestamp = {};
      if (criteria.startDate) query.timestamp.$gte = criteria.startDate;
      if (criteria.endDate) query.timestamp.$lte = criteria.endDate;
    }
    
    return AuditLog
      .find(query)
      .sort({ timestamp: -1 })
      .limit(criteria.limit || 100)
      .lean();
  }
  
  /**
   * 監査ログの集計
   */
  static async aggregate(pipeline: any[]): Promise<any[]> {
    return AuditLog.aggregate(pipeline);
  }
  
  /**
   * 古いログの削除（保持期間: 90日）
   */
  static async cleanup(retentionDays = 90): Promise<number> {
    const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
    const result = await AuditLog.deleteMany({
      timestamp: { $lt: cutoffDate },
      severity: { $ne: 'CRITICAL' }, // CRITICALログは保持
    });
    
    return result.deletedCount || 0;
  }
}

// エクスポート
export const auditLogger = AuditLogger;