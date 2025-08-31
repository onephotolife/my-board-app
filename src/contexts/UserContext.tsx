'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

// 型定義
export interface UserProfile {
  id: string;
  email: string;
  name: string;
  bio: string;
  avatar?: string;
  emailVerified?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ProfileUpdateData {
  name: string;
  bio: string;
}

export interface PasswordChangeData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface UserContextType {
  user: UserProfile | null;
  loading: boolean;
  error: string | null;
  updateProfile: (data: ProfileUpdateData) => Promise<{ success: boolean; message?: string }>;
  changePassword: (data: PasswordChangeData) => Promise<{ success: boolean; message?: string }>;
  refreshUser: () => Promise<void>;
  clearError: () => void;
}

// Contextの作成
const UserContext = createContext<UserContextType | undefined>(undefined);

// Provider Props
interface UserProviderProps {
  children: ReactNode;
  initialData?: any | null;
}

// Provider Component
export function UserProvider({ children, initialData }: UserProviderProps) {
  const { data: session, status, update: updateSession } = useSession();
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(
    initialData?.user || null
  );
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState<string | null>(null);

  // ユーザー情報の取得
  const fetchUserProfile = useCallback(async () => {
    // initialDataがある場合は、初回フェッチをスキップ
    if (initialData?.user && !user) {
      console.log('[PERF] Using initial user data, skipping API call');
      setUser(initialData.user);
      setLoading(false);
      return;
    }

    if (!session?.user?.email) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('/api/profile', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        // 404の場合は新規ユーザーとして扱う
        if (response.status === 404 && session?.user) {
          setUser({
            id: session.user.id || '',
            email: session.user.email || '',
            name: session.user.name || '',
            bio: '',
            emailVerified: null,
          });
          setError(null);
          return;
        }
        throw new Error('プロフィールの取得に失敗しました');
      }

      const data = await response.json();
      setUser(data.user);
      setError(null);
    } catch (err) {
      console.error('Error fetching user profile:', err);
      // セッション情報から最小限のユーザー情報を設定
      if (session?.user) {
        setUser({
          id: session.user.id || '',
          email: session.user.email || '',
          name: session.user.name || '',
          bio: '',
          emailVerified: null,
        });
      }
      // エラーログは残すが、ユーザーには表示しない（開発時のみ）
      if (process.env.NODE_ENV === 'development') {
        setError(err instanceof Error ? err.message : 'プロフィールの取得に失敗しました');
      }
    } finally {
      setLoading(false);
    }
  }, [session, initialData]);

  // プロフィール更新
  const updateProfile = useCallback(async (data: ProfileUpdateData) => {
    try {
      setError(null);
      
      // バリデーション
      if (!data.name || data.name.trim().length === 0) {
        throw new Error('名前は必須です');
      }
      if (data.name.length > 50) {
        throw new Error('名前は50文字以内で入力してください');
      }
      if (data.bio !== undefined && data.bio !== null && data.bio.length > 200) {
        throw new Error('自己紹介は200文字以内で入力してください');
      }

      // bioが存在しない場合は空文字列を設定
      const requestData = {
        name: data.name,
        bio: data.bio !== undefined ? data.bio : ''
      };

      const response = await fetch('/api/profile-test', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'プロフィールの更新に失敗しました');
      }

      // APIから返されたユーザー情報でローカル状態を更新
      if (result.user) {
        setUser(result.user);
      } else {
        // フォールバック: APIがユーザー情報を返さない場合は送信データで更新
        setUser(prev => prev ? { ...prev, ...requestData } : null);
      }
      
      // NextAuthセッションを更新
      await updateSession({
        ...session,
        user: {
          ...session?.user,
          name: data.name,
        },
      });

      // 更新後に最新データを取得して確実に同期
      await fetchUserProfile();

      return { success: true, message: 'プロフィールを更新しました' };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'プロフィールの更新に失敗しました';
      setError(message);
      return { success: false, message };
    }
  }, [session, updateSession, fetchUserProfile]);

  // パスワード変更
  const changePassword = useCallback(async (data: PasswordChangeData) => {
    try {
      setError(null);

      // バリデーション
      if (!data.currentPassword || !data.newPassword || !data.confirmPassword) {
        throw new Error('すべてのフィールドを入力してください');
      }
      if (data.newPassword.length < 8) {
        throw new Error('新しいパスワードは8文字以上である必要があります');
      }
      if (data.newPassword !== data.confirmPassword) {
        throw new Error('新しいパスワードが一致しません');
      }
      if (data.currentPassword === data.newPassword) {
        throw new Error('新しいパスワードは現在のパスワードと異なる必要があります');
      }

      const response = await fetch('/api/profile/password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword: data.currentPassword,
          newPassword: data.newPassword,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'パスワードの変更に失敗しました');
      }

      return { success: true, message: 'パスワードを変更しました' };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'パスワードの変更に失敗しました';
      setError(message);
      return { success: false, message };
    }
  }, []);

  // ユーザー情報のリフレッシュ
  const refreshUser = useCallback(async () => {
    await fetchUserProfile();
  }, [fetchUserProfile]);

  // エラーのクリア
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // セッション変更時の処理
  useEffect(() => {
    if (status === 'authenticated') {
      fetchUserProfile();
    } else if (status === 'unauthenticated') {
      setUser(null);
      setLoading(false);
    }
  }, [status, fetchUserProfile]);

  const value: UserContextType = {
    user,
    loading,
    error,
    updateProfile,
    changePassword,
    refreshUser,
    clearError,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

// カスタムフック
export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}

// 認証が必要なページ用のフック
export function useRequireAuth(redirectUrl = '/auth/signin') {
  const { user, loading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push(`${redirectUrl}?callbackUrl=${encodeURIComponent(window.location.pathname)}`);
    }
  }, [user, loading, router, redirectUrl]);

  return { user, loading, isAuthenticated: !!user };
}