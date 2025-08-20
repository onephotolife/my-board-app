// 権限管理の型定義

// ユーザーロール
export enum UserRole {
  ADMIN = 'admin',
  MODERATOR = 'moderator',
  USER = 'user',
  GUEST = 'guest'
}

// アクション権限
export enum Permission {
  // 投稿関連
  POST_CREATE = 'post:create',
  POST_READ = 'post:read',
  POST_UPDATE = 'post:update',
  POST_DELETE = 'post:delete',
  POST_UPDATE_OWN = 'post:update:own',
  POST_DELETE_OWN = 'post:delete:own',
  
  // ユーザー管理
  USER_MANAGE = 'user:manage',
  USER_BAN = 'user:ban',
  USER_VIEW = 'user:view',
  
  // 管理者機能
  ADMIN_ACCESS = 'admin:access',
  MODERATOR_ACCESS = 'moderator:access',
  
  // コメント関連（将来用）
  COMMENT_CREATE = 'comment:create',
  COMMENT_DELETE = 'comment:delete',
  COMMENT_DELETE_OWN = 'comment:delete:own'
}

// ロールごとの権限マッピング
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.ADMIN]: [
    // 管理者は全権限を持つ
    Permission.POST_CREATE,
    Permission.POST_READ,
    Permission.POST_UPDATE,
    Permission.POST_DELETE,
    Permission.POST_UPDATE_OWN,
    Permission.POST_DELETE_OWN,
    Permission.USER_MANAGE,
    Permission.USER_BAN,
    Permission.USER_VIEW,
    Permission.ADMIN_ACCESS,
    Permission.MODERATOR_ACCESS,
    Permission.COMMENT_CREATE,
    Permission.COMMENT_DELETE,
    Permission.COMMENT_DELETE_OWN
  ],
  [UserRole.MODERATOR]: [
    // モデレーターは投稿管理と一部のユーザー管理
    Permission.POST_CREATE,
    Permission.POST_READ,
    Permission.POST_UPDATE,
    Permission.POST_DELETE,
    Permission.POST_UPDATE_OWN,
    Permission.POST_DELETE_OWN,
    Permission.USER_VIEW,
    Permission.MODERATOR_ACCESS,
    Permission.COMMENT_CREATE,
    Permission.COMMENT_DELETE,
    Permission.COMMENT_DELETE_OWN
  ],
  [UserRole.USER]: [
    // 一般ユーザーは自分の投稿のみ管理
    Permission.POST_CREATE,
    Permission.POST_READ,
    Permission.POST_UPDATE_OWN,
    Permission.POST_DELETE_OWN,
    Permission.COMMENT_CREATE,
    Permission.COMMENT_DELETE_OWN
  ],
  [UserRole.GUEST]: [
    // ゲストは読み取りのみ
    Permission.POST_READ
  ]
};

// 権限チェック用の型
export interface PermissionCheck {
  userId: string;
  role: UserRole;
  resourceOwnerId?: string;
  permission: Permission;
}

// ユーザー権限情報
export interface UserPermissions {
  userId: string;
  role: UserRole;
  permissions: Permission[];
}

// リソース所有者チェック
export interface ResourceOwnership {
  resourceId: string;
  ownerId: string;
  resourceType: 'post' | 'comment' | 'user';
}