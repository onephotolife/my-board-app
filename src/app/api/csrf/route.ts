import type { NextRequest } from 'next/server';

import { handleCSRFTokenGeneration } from '@/lib/security/csrf-middleware';

/**
 * CSRFトークン取得エンドポイント
 * クライアントが初期化時にトークンを取得するために使用
 * 
 * 新しいCSRFSyncManagerを使用してサーバーサイドで
 * トークンを管理し、セッションと紐付けて保存する
 */
export async function GET(request: NextRequest) {
  return handleCSRFTokenGeneration(request);
}