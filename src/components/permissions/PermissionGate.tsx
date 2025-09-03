'use client';

import type { ReactNode } from 'react';

import { usePermissions } from '@/contexts/PermissionContext';
import type { Permission } from '@/lib/permissions/types';

interface PermissionGateProps {
  children: ReactNode;
  permission?: Permission;
  resourceOwnerId?: string;
  fallback?: ReactNode;
  requireOwner?: boolean;
  requireAny?: Permission[];
  requireAll?: Permission[];
}

/**
 * 権限ベースでコンポーネントの表示を制御
 */
export function PermissionGate({
  children,
  permission,
  resourceOwnerId,
  fallback = null,
  requireOwner = false,
  requireAny = [],
  requireAll = []
}: PermissionGateProps) {
  const { hasPermission, isOwner, isLoading } = usePermissions();

  if (isLoading) {
    return null;
  }

  let hasAccess = true;

  // 単一権限チェック
  if (permission) {
    hasAccess = hasAccess && hasPermission(permission);
  }

  // 所有者チェック
  if (requireOwner && resourceOwnerId) {
    hasAccess = hasAccess && isOwner(resourceOwnerId);
  }

  // いずれかの権限を持っているかチェック
  if (requireAny.length > 0) {
    const hasAny = requireAny.some(perm => hasPermission(perm));
    hasAccess = hasAccess && hasAny;
  }

  // すべての権限を持っているかチェック
  if (requireAll.length > 0) {
    const hasAll = requireAll.every(perm => hasPermission(perm));
    hasAccess = hasAccess && hasAll;
  }

  return hasAccess ? <>{children}</> : <>{fallback}</>;
}

interface CanEditProps {
  resourceOwnerId: string;
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * 編集権限がある場合のみ表示
 */
export function CanEdit({ resourceOwnerId, children, fallback = null }: CanEditProps) {
  const { canEdit, isLoading } = usePermissions();

  if (isLoading) return null;

  return canEdit(resourceOwnerId) ? <>{children}</> : <>{fallback}</>;
}

interface CanDeleteProps {
  resourceOwnerId: string;
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * 削除権限がある場合のみ表示
 */
export function CanDelete({ resourceOwnerId, children, fallback = null }: CanDeleteProps) {
  const { canDelete, isLoading } = usePermissions();

  if (isLoading) return null;

  return canDelete(resourceOwnerId) ? <>{children}</> : <>{fallback}</>;
}

interface IsOwnerProps {
  resourceOwnerId: string;
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * リソースの所有者の場合のみ表示
 */
export function IsOwner({ resourceOwnerId, children, fallback = null }: IsOwnerProps) {
  const { isOwner, isLoading } = usePermissions();

  if (isLoading) return null;

  return isOwner(resourceOwnerId) ? <>{children}</> : <>{fallback}</>;
}