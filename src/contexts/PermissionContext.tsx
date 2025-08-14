'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { UserRole, Permission, UserPermissions } from '@/lib/permissions/types';
import { 
  canEditPost, 
  canDeletePost, 
  hasPermission as checkPermission,
  getUserPermissions 
} from '@/lib/permissions/utils';

interface PermissionContextType {
  userRole: UserRole;
  permissions: Permission[];
  isLoading: boolean;
  
  // 権限チェック関数
  hasPermission: (permission: Permission) => boolean;
  canEdit: (resourceOwnerId: string) => boolean;
  canDelete: (resourceOwnerId: string) => boolean;
  isOwner: (resourceOwnerId: string) => boolean;
  
  // ユーザー情報
  userId: string | null;
  userPermissions: UserPermissions | null;
}

const PermissionContext = createContext<PermissionContextType | undefined>(undefined);

export function PermissionProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const [userRole, setUserRole] = useState<UserRole>(UserRole.GUEST);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [userPermissions, setUserPermissions] = useState<UserPermissions | null>(null);

  useEffect(() => {
    const fetchUserPermissions = async () => {
      if (session?.user?.email) {
        try {
          // APIからユーザー情報を取得
          const response = await fetch('/api/user/permissions');
          if (response.ok) {
            const data = await response.json();
            setUserRole(data.role || UserRole.USER);
            setUserId(data.userId);
            
            const perms = getUserPermissions(data.userId, data.role || UserRole.USER);
            setPermissions(perms.permissions);
            setUserPermissions(perms);
          } else {
            // デフォルトユーザー権限
            setUserRole(UserRole.USER);
            setPermissions(getUserPermissions('', UserRole.USER).permissions);
          }
        } catch (error) {
          console.error('Error fetching user permissions:', error);
          setUserRole(UserRole.USER);
        }
      } else {
        // 未認証ユーザー
        setUserRole(UserRole.GUEST);
        setPermissions(getUserPermissions('', UserRole.GUEST).permissions);
        setUserId(null);
        setUserPermissions(null);
      }
    };

    fetchUserPermissions();
  }, [session]);

  // 権限チェック関数
  const hasPermission = (permission: Permission): boolean => {
    return checkPermission(userRole, permission);
  };

  const canEdit = (resourceOwnerId: string): boolean => {
    if (!userId) return false;
    return canEditPost(userId, userRole, resourceOwnerId);
  };

  const canDelete = (resourceOwnerId: string): boolean => {
    if (!userId) return false;
    return canDeletePost(userId, userRole, resourceOwnerId);
  };

  const isOwner = (resourceOwnerId: string): boolean => {
    if (!userId) return false;
    return userId === resourceOwnerId;
  };

  const value: PermissionContextType = {
    userRole,
    permissions,
    isLoading: status === 'loading',
    hasPermission,
    canEdit,
    canDelete,
    isOwner,
    userId,
    userPermissions
  };

  return (
    <PermissionContext.Provider value={value}>
      {children}
    </PermissionContext.Provider>
  );
}

export function usePermissions() {
  const context = useContext(PermissionContext);
  if (context === undefined) {
    throw new Error('usePermissions must be used within a PermissionProvider');
  }
  return context;
}