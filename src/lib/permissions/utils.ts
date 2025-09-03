import type { 
  PermissionCheck,
  UserPermissions 
} from './types';
import { 
  UserRole, 
  Permission, 
  ROLE_PERMISSIONS 
} from './types';

/**
 * ユーザーが特定の権限を持っているかチェック
 */
export function hasPermission(
  userRole: UserRole,
  permission: Permission
): boolean {
  const rolePermissions = ROLE_PERMISSIONS[userRole] || [];
  return rolePermissions.includes(permission);
}

/**
 * ユーザーがリソースのオーナーかチェック
 */
export function isResourceOwner(
  userId: string,
  resourceOwnerId: string
): boolean {
  return userId === resourceOwnerId;
}

/**
 * アクション実行権限をチェック
 */
export function canPerformAction(check: PermissionCheck): boolean {
  // 管理者は常に全権限
  if (check.role === UserRole.ADMIN) {
    return true;
  }

  // 基本権限チェック
  const hasBasicPermission = hasPermission(check.role, check.permission);
  
  // 所有者限定権限の場合
  if (check.permission.includes(':own')) {
    // リソース所有者IDが提供されていない場合はfalse
    if (!check.resourceOwnerId) {
      return false;
    }
    // 所有者かつ権限を持っている場合のみtrue
    return hasBasicPermission && isResourceOwner(check.userId, check.resourceOwnerId);
  }

  return hasBasicPermission;
}

/**
 * ユーザーの全権限を取得
 */
export function getUserPermissions(
  userId: string,
  role: UserRole
): UserPermissions {
  return {
    userId,
    role,
    permissions: ROLE_PERMISSIONS[role] || []
  };
}

/**
 * 投稿の編集権限をチェック
 */
export function canEditPost(
  userId: string,
  role: UserRole,
  postAuthorId: string
): boolean {
  // 管理者・モデレーターは全投稿編集可能
  if (role === UserRole.ADMIN || role === UserRole.MODERATOR) {
    return true;
  }
  
  // 一般ユーザーは自分の投稿のみ
  return canPerformAction({
    userId,
    role,
    resourceOwnerId: postAuthorId,
    permission: Permission.POST_UPDATE_OWN
  });
}

/**
 * 投稿の削除権限をチェック
 */
export function canDeletePost(
  userId: string,
  role: UserRole,
  postAuthorId: string
): boolean {
  // 管理者・モデレーターは全投稿削除可能
  if (role === UserRole.ADMIN || role === UserRole.MODERATOR) {
    return true;
  }
  
  // 一般ユーザーは自分の投稿のみ
  return canPerformAction({
    userId,
    role,
    resourceOwnerId: postAuthorId,
    permission: Permission.POST_DELETE_OWN
  });
}

/**
 * 管理画面アクセス権限をチェック
 */
export function canAccessAdminPanel(role: UserRole): boolean {
  return hasPermission(role, Permission.ADMIN_ACCESS);
}

/**
 * モデレーター機能アクセス権限をチェック
 */
export function canAccessModeratorTools(role: UserRole): boolean {
  return hasPermission(role, Permission.MODERATOR_ACCESS) || 
         hasPermission(role, Permission.ADMIN_ACCESS);
}