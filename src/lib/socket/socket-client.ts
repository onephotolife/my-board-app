import type { Socket } from 'socket.io-client';
import { io } from 'socket.io-client';

import type { 
  SNSPost, 
  Notification, 
  PostEngagement 
} from '@/types/sns';

// Socket.ioイベントタイプ定義
export interface ServerToClientEvents {
  'connect': () => void;
  'disconnect': () => void;
  'error': (error: Error) => void;
  'timeline:new-post': (data: { post: SNSPost }) => void;
  'notification:new': (data: { notification: Notification }) => void;
  'notification:update-count': (data: { unreadCount: number }) => void;
  'post:engagement-update': (data: { postId: string; engagement: PostEngagement }) => void;
  'user:status-change': (data: { userId: string; status: 'online' | 'offline' }) => void;
}

export interface ClientToServerEvents {
  'subscribe:timeline': (data: { userId: string }) => void;
  'subscribe:notifications': (data: { userId: string }) => void;
  'unsubscribe:timeline': (data: { userId: string }) => void;
  'unsubscribe:notifications': (data: { userId: string }) => void;
  'heartbeat': () => void;
}

// Socket接続オプション
const SOCKET_OPTIONS = {
  path: '/api/socket',
  transports: ['websocket', 'polling'] as const,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 20000,
  autoConnect: false, // 手動で接続を管理
};

class SocketClient {
  private socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;
  private userId: string | null = null;
  private connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error' = 'disconnected';
  private listeners: Map<string, Set<Function>> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  // シングルトンパターン
  private static instance: SocketClient;
  
  private constructor() {}

  static getInstance(): SocketClient {
    if (!SocketClient.instance) {
      SocketClient.instance = new SocketClient();
    }
    return SocketClient.instance;
  }

  // Socket接続の初期化
  connect(userId: string, token?: string): Socket {
    if (this.socket?.connected && this.userId === userId) {
      console.log('[Socket] Already connected for user:', userId);
      return this.socket;
    }

    // 既存の接続をクリーンアップ
    if (this.socket) {
      this.disconnect();
    }

    this.userId = userId;
    this.connectionStatus = 'connecting';

    // Socket.io接続の作成
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || '';
    const options = {
      ...SOCKET_OPTIONS,
      auth: token ? { token } : undefined,
      query: { userId },
    };

    this.socket = io(socketUrl, options);
    
    // イベントハンドラーの設定
    this.setupEventHandlers();
    
    // 接続開始
    this.socket.connect();
    
    return this.socket;
  }

  // イベントハンドラーの設定
  private setupEventHandlers(): void {
    if (!this.socket) return;

    // 接続イベント
    this.socket.on('connect', () => {
      console.log('[Socket] Connected successfully');
      this.connectionStatus = 'connected';
      this.emit('status:changed', { status: 'connected' });
      this.startHeartbeat();
      
      // 自動サブスクライブ
      if (this.userId) {
        this.subscribeToUserEvents(this.userId);
      }
    });

    // 切断イベント
    this.socket.on('disconnect', () => {
      console.log('[Socket] Disconnected');
      this.connectionStatus = 'disconnected';
      this.emit('status:changed', { status: 'disconnected' });
      this.stopHeartbeat();
    });

    // エラーイベント
    this.socket.on('error', (error) => {
      console.error('[Socket] Error:', error);
      this.connectionStatus = 'error';
      this.emit('status:changed', { status: 'error', error });
    });
  }

  // ユーザーイベントへのサブスクライブ
  private subscribeToUserEvents(userId: string): void {
    if (!this.socket) return;
    
    this.socket.emit('subscribe:timeline', { userId });
    this.socket.emit('subscribe:notifications', { userId });
    
    console.log('[Socket] Subscribed to user events:', userId);
  }

  // ハートビート開始
  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      if (this.socket?.connected) {
        this.socket.emit('heartbeat');
      }
    }, 30000); // 30秒ごと
  }

  // ハートビート停止
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // カスタムイベントリスナー管理
  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)?.add(callback);
  }

  off(event: string, callback: Function): void {
    this.listeners.get(event)?.delete(callback);
  }

  emit(event: string, data?: any): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => callback(data));
    }
  }

  // Socket.ioイベントリスナー追加
  addEventListener<K extends keyof ServerToClientEvents>(
    event: K,
    callback: ServerToClientEvents[K]
  ): void {
    if (this.socket) {
      this.socket.on(event, callback as any);
    }
  }

  // Socket.ioイベントリスナー削除
  removeEventListener<K extends keyof ServerToClientEvents>(
    event: K,
    callback: ServerToClientEvents[K]
  ): void {
    if (this.socket) {
      this.socket.off(event, callback as any);
    }
  }

  // Socket.ioイベント送信
  emitEvent<K extends keyof ClientToServerEvents>(
    event: K,
    data: Parameters<ClientToServerEvents[K]>[0]
  ): void {
    if (this.socket?.connected) {
      this.socket.emit(event, data as any);
    } else {
      console.warn('[Socket] Cannot emit event - not connected:', event);
    }
  }

  // 接続の切断
  disconnect(): void {
    if (this.socket) {
      // アンサブスクライブ
      if (this.userId) {
        this.socket.emit('unsubscribe:timeline', { userId: this.userId });
        this.socket.emit('unsubscribe:notifications', { userId: this.userId });
      }
      
      this.stopHeartbeat();
      this.socket.disconnect();
      this.socket = null;
      this.userId = null;
      this.connectionStatus = 'disconnected';
      this.listeners.clear();
      
      console.log('[Socket] Disconnected and cleaned up');
    }
  }

  // 接続状態の取得
  getConnectionStatus(): string {
    return this.connectionStatus;
  }

  // 接続確認
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  // Socketインスタンスの取得
  getSocket(): Socket | null {
    return this.socket;
  }
}

// エクスポート
export const socketClient = SocketClient.getInstance();

// React Hook用のヘルパー関数
export function useSocketClient() {
  return socketClient;
}