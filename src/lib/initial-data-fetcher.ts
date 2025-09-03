/**
 * 初期データ並列フェッチャー
 * Provider階層のウォーターフォール初期化を解決するため、
 * 必要なAPIリクエストを並列実行します
 */

import type { Session } from 'next-auth';

export interface InitialData {
  userProfile: any | null;
  permissions: any | null;
  csrfToken: string | null;
  fetchTime?: number;
}

/**
 * 初期データを並列で取得
 * Promise.allSettledを使用して部分的失敗を許容
 */
export async function fetchInitialData(session?: Session | null): Promise<InitialData | null> {
  if (!session) {
    console.warn('[PERF] No session, skipping initial data fetch');
    return null;
  }

  console.time('[PERF] Parallel initial data fetch');
  const startTime = performance.now();

  try {
    // 3つのAPIを並列実行
    const [userProfileResult, permissionsResult, csrfTokenResult] = await Promise.allSettled([
      // UserProfile取得
      fetch('/api/profile', {
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      }).then(async (res) => {
        if (!res.ok && res.status !== 404) {
          console.warn(`[API] /api/profile returned ${res.status}`);
          return null;
        }
        if (res.status === 404) {
          // 新規ユーザーの場合
          return {
            user: {
              id: session.user?.id || '',
              email: session.user?.email || '',
              name: session.user?.name || '',
              bio: '',
              emailVerified: null,
            }
          };
        }
        return res.json();
      }).catch((err) => {
        console.error('[API] /api/profile error:', err);
        return null;
      }),

      // Permissions取得
      fetch('/api/user/permissions', {
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      }).then(async (res) => {
        if (!res.ok) {
          console.warn(`[API] /api/user/permissions returned ${res.status}`);
          return null;
        }
        return res.json();
      }).catch((err) => {
        console.error('[API] /api/user/permissions error:', err);
        return null;
      }),

      // CSRFトークン取得（セッションにトークンがない場合のみ）
      // 改善: 条件付き取得でリクエスト数削減
      // Note: sessionにcsrfTokenプロパティは存在しないため、常に取得
      fetch('/api/csrf', { // /api/csrf/tokenではなく/api/csrfを使用
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        }).then(async (res) => {
          if (!res.ok) {
            console.warn(`[API] /api/csrf returned ${res.status}`);
            return null;
          }
          const data = await res.json();
          return data.token || null; // tokenフィールドを使用
        }).catch((err) => {
          console.error('[API] /api/csrf error:', err);
          return null;
        }),
    ]);

    const fetchTime = performance.now() - startTime;
    console.timeEnd('[PERF] Parallel initial data fetch');
    console.warn(`[PERF] Initial data fetched in ${fetchTime.toFixed(2)}ms`);

    // 結果の処理
    const result: InitialData = {
      userProfile: userProfileResult.status === 'fulfilled' ? userProfileResult.value : null,
      permissions: permissionsResult.status === 'fulfilled' ? permissionsResult.value : null,
      csrfToken: csrfTokenResult.status === 'fulfilled' ? csrfTokenResult.value : null,
      fetchTime,
    };

    // デバッグログ
    if (process.env.NODE_ENV === 'development') {
      console.warn('[DEBUG] Initial data fetch results:', {
        userProfile: result.userProfile ? 'Success' : 'Failed',
        permissions: result.permissions ? 'Success' : 'Failed',
        csrfToken: result.csrfToken ? 'Success' : 'Failed',
        fetchTime: `${fetchTime.toFixed(2)}ms`,
      });
    }

    return result;
  } catch (error) {
    console.error('[ERROR] Initial data fetch failed:', error);
    return null;
  }
}

/**
 * クライアントサイドでの初期データ取得
 * Providerコンポーネントから呼び出される
 */
export async function fetchInitialDataClient(): Promise<InitialData | null> {
  // クライアントサイドではセッション情報を直接取得できないため、
  // 認証済みを前提として実行
  console.warn('[PERF] Starting client-side initial data fetch');
  
  return fetchInitialData({ 
    user: { email: 'authenticated' },
    expires: new Date().toISOString()
  } as Session);
}