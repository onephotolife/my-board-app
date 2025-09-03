import type { Document, Model } from 'mongoose';
import mongoose, { Schema } from 'mongoose';

const DOMPurifyImp = require('isomorphic-dompurify');
const DOMPurify = DOMPurifyImp.default || DOMPurifyImp;

// 通知インターフェース
export interface INotification extends Document {
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
  message: string;
  isRead: boolean;
  readAt?: Date;
  metadata?: {
    ipAddress?: string;
    userAgent?: string;
    clientVersion?: string;
  };
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
  // メソッド
  markAsRead(): Promise<INotification>;
  softDelete(): Promise<INotification>;
  generateMessage(): string;
}

// Notificationスキーマの定義
const NotificationSchema = new Schema<INotification>(
  {
    recipient: {
      type: String,
      required: [true, '受信者IDは必須です'],
      index: true,
      validate: {
        validator: function(v: string) {
          return /^[0-9a-fA-F]{24}$/.test(v); // ObjectId形式
        },
        message: '無効な受信者IDです',
      },
    },
    type: {
      type: String,
      enum: ['follow', 'like', 'comment', 'system'],
      required: [true, '通知タイプは必須です'],
      index: true,
    },
    actor: {
      _id: { 
        type: String, 
        required: [true, 'アクター IDは必須です'],
        validate: {
          validator: function(v: string) {
            return /^[0-9a-fA-F]{24}$/.test(v); // ObjectId形式
          },
          message: '無効なアクターIDです',
        },
      },
      name: { 
        type: String, 
        required: [true, 'アクター名は必須です'],
        maxlength: [50, '名前は50文字以内'],
      },
      email: { 
        type: String, 
        required: [true, 'メールアドレスは必須です'],
        validate: {
          validator: function(v: string) {
            return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
          },
          message: '無効なメールアドレス形式です',
        },
      },
      avatar: String,
    },
    target: {
      type: {
        type: String,
        enum: ['post', 'comment', 'user'],
        required: [true, 'ターゲットタイプは必須です'],
      },
      id: {
        type: String,
        required: [true, 'ターゲットIDは必須です'],
        validate: {
          validator: function(v: string) {
            return /^[0-9a-fA-F]{24}$/.test(v); // ObjectId形式
          },
          message: '無効なターゲットIDです',
        },
      },
      preview: {
        type: String,
        maxlength: [100, 'プレビューは100文字以内'],
      },
    },
    message: {
      type: String,
      required: [true, 'メッセージは必須です'],
      maxlength: [200, 'メッセージは200文字以内'],
      validate: {
        validator: function(v: string) {
          console.log('[NOTIFICATION-MODEL-DEBUG] Message validation:', {
            message: v.substring(0, 50),
            length: v.length,
            timestamp: new Date().toISOString()
          });
          
          // 基本的な長さチェックのみ実行（XSSサニタイズはAPI層で処理）
          return v.trim().length > 0 && v.length <= 200;
        },
        message: 'メッセージを入力してください（200文字以内）',
      },
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
      default: null,
    },
    metadata: {
      ipAddress: String,
      userAgent: String,
      clientVersion: String,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
      default: function() {
        // タイプに応じた有効期限を設定
        const now = new Date();
        const type = this.type;
        
        switch(type) {
          case 'system':
            return new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000); // 1年
          case 'follow':
          case 'like':
          case 'comment':
          default:
            return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30日
        }
      },
    },
  },
  {
    timestamps: true,
    optimisticConcurrency: true, // 楽観的ロック
  }
);

// 複合インデックス（パフォーマンス最適化）
NotificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });
NotificationSchema.index({ recipient: 1, type: 1, createdAt: -1 });
NotificationSchema.index({ type: 1, createdAt: -1 }); // 分析用
NotificationSchema.index({ 'actor._id': 1, createdAt: -1 }); // アクター別

// TTLインデックス（古い通知の自動削除）
NotificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// 静的メソッド
NotificationSchema.statics.findByRecipient = function(recipientId: string, page = 1, limit = 20, isRead?: boolean) {
  const skip = (page - 1) * limit;
  const query: any = { recipient: recipientId };
  
  if (isRead !== undefined) {
    query.isRead = isRead;
  }
  
  return this.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
};

NotificationSchema.statics.countUnread = function(recipientId: string) {
  return this.countDocuments({ 
    recipient: recipientId, 
    isRead: false 
  });
};

NotificationSchema.statics.markAllAsRead = function(recipientId: string) {
  return this.updateMany(
    { 
      recipient: recipientId,
      isRead: false 
    },
    { 
      $set: { 
        isRead: true,
        readAt: new Date()
      } 
    }
  );
};

NotificationSchema.statics.markAsRead = function(notificationIds: string[], recipientId: string) {
  return this.updateMany(
    { 
      _id: { $in: notificationIds },
      recipient: recipientId,
      isRead: false 
    },
    { 
      $set: { 
        isRead: true,
        readAt: new Date()
      } 
    }
  );
};

NotificationSchema.statics.deleteExpired = function() {
  const now = new Date();
  return this.deleteMany({ expiresAt: { $lt: now } });
};

// インスタンスメソッド
NotificationSchema.methods.markAsRead = function() {
  if (!this.isRead) {
    this.isRead = true;
    this.readAt = new Date();
    return this.save();
  }
  return Promise.resolve(this);
};

NotificationSchema.methods.softDelete = function() {
  // 即座に期限切れに設定
  this.expiresAt = new Date();
  return this.save();
};

NotificationSchema.methods.generateMessage = function() {
  const { type, actor, target } = this;
  
  switch(type) {
    case 'follow':
      return `${actor.name}さんがあなたをフォローしました`;
    case 'like':
      return `${actor.name}さんがあなたの投稿にいいねしました`;
    case 'comment':
      return `${actor.name}さんがあなたの投稿にコメントしました`;
    case 'system':
      return this.message; // システム通知はそのまま使用
    default:
      return '新しい通知があります';
  }
};

// 仮想プロパティ
NotificationSchema.virtual('isExpired').get(function() {
  return this.expiresAt && this.expiresAt < new Date();
});

NotificationSchema.virtual('timeAgo').get(function() {
  const now = new Date();
  const diff = now.getTime() - this.createdAt.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}日前`;
  if (hours > 0) return `${hours}時間前`;
  if (minutes > 0) return `${minutes}分前`;
  return 'たった今';
});

// JSON変換時の設定
NotificationSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    
    // セキュリティ情報の除外
    delete ret.metadata?.ipAddress;
    
    return ret;
  },
});

// 保存前のフック（バリデーション強化）
NotificationSchema.pre('save', function(next) {
  // メッセージの前後空白トリミング
  if (this.isModified('message')) {
    this.message = this.message.trim();
  }
  
  // メッセージ自動生成（未設定の場合）
  if (!this.message || this.message === '') {
    this.message = this.generateMessage();
  }
  
  // 有効期限設定の確認
  if (!this.expiresAt) {
    const now = new Date();
    switch(this.type) {
      case 'system':
        this.expiresAt = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000); // 1年
        break;
      default:
        this.expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30日
    }
  }
  
  next();
});

// デバッグログ用ミドルウェア
NotificationSchema.pre('save', function(next) {
  console.log('[NOTIFICATION-DEBUG] Saving notification:', {
    type: this.type,
    recipient: this.recipient,
    actor: this.actor._id,
    target: this.target,
    isRead: this.isRead,
    expiresAt: this.expiresAt,
    timestamp: new Date().toISOString()
  });
  next();
});

// モデルのエクスポート
const Notification: Model<INotification> = mongoose.models.Notification || mongoose.model<INotification>('Notification', NotificationSchema);

export default Notification;