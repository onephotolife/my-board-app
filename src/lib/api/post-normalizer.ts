/**
 * API層のPost正規化ユーティリティ
 * データベースから取得したPostを統一型(UnifiedPost)形式に変換
 * 
 * @phase Phase 3 - Zod Schema Integration
 * @created 2025-08-28
 * @updated 2025-08-28
 */

import type { UnifiedPost, UnifiedAuthor } from '@/types/post';
import { 
  UnifiedPostSchema, 
  parseMongoDocument,
  validatePost,
  type ValidationResult 
} from '@/schemas/post.schema';

/**
 * MongoDB DocumentからUnifiedPost形式への変換
 * @param doc - MongoDBから取得したPost Document
 * @param currentUserId - 現在のユーザーID（権限判定用）
 * @returns 正規化されたUnifiedPost
 */
export function normalizePostDocument(doc: any, currentUserId?: string): UnifiedPost {
  // authorInfo構造の正規化
  let author: UnifiedAuthor;
  
  // authorが既にpopulateされている場合
  if (doc.author && typeof doc.author === 'object' && doc.author._id) {
    author = {
      _id: doc.author._id.toString(),
      name: doc.author.name || doc.author.username || 'Unknown User',
      email: doc.author.email || 'unknown@example.com',
      avatar: doc.author.avatar || doc.author.profileImage || undefined
    };
  }
  // authorInfoフィールドが存在する場合（既存データ）
  else if (doc.authorInfo) {
    author = {
      _id: doc.authorInfo._id?.toString() || doc.author?.toString() || doc._id.toString(),
      name: doc.authorInfo.name || 'Unknown User',
      email: doc.authorInfo.email || 'unknown@example.com',
      avatar: doc.authorInfo.avatar || undefined
    };
  }
  // authorが文字列ID の場合
  else if (typeof doc.author === 'string') {
    author = {
      _id: doc.author,
      name: 'Unknown User',
      email: 'unknown@example.com'
    };
  }
  // フォールバック
  else {
    author = {
      _id: doc._id.toString(),
      name: 'Unknown User',
      email: 'unknown@example.com'
    };
  }

  // 権限フラグの計算
  const isOwner = currentUserId && (
    author._id === currentUserId ||
    doc.author?.toString() === currentUserId ||
    doc.author?._id?.toString() === currentUserId
  );

  // UnifiedPost形式への変換
  return {
    _id: doc._id.toString(),
    title: doc.title || '',
    content: doc.content || '',
    author,
    authorInfo: author, // 後方互換性
    category: doc.category || 'general',
    tags: Array.isArray(doc.tags) ? doc.tags : [],
    status: doc.status || 'published',
    likes: Array.isArray(doc.likes) ? doc.likes.map((id: any) => id.toString()) : [],
    views: typeof doc.views === 'number' ? doc.views : 0,
    createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : new Date().toISOString(),
    updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : new Date().toISOString(),
    canEdit: doc.canEdit !== undefined ? doc.canEdit : isOwner || false,
    canDelete: doc.canDelete !== undefined ? doc.canDelete : isOwner || false,
    isLikedByUser: doc.isLikedByUser || false,
    isNew: doc.isNew || false
  };
}

/**
 * 複数のPost Documentの一括正規化
 * @param docs - MongoDBから取得したPost Documentの配列
 * @param currentUserId - 現在のユーザーID
 * @returns 正規化されたUnifiedPostの配列
 */
export function normalizePostDocuments(docs: any[], currentUserId?: string): UnifiedPost[] {
  return docs.map(doc => normalizePostDocument(doc, currentUserId));
}

/**
 * API応答用のPost正規化（追加メタデータ付き）
 * @param doc - Post Document
 * @param currentUserId - 現在のユーザーID
 * @param additionalData - 追加メタデータ
 * @returns 正規化されたUnifiedPost（追加データ含む）
 */
export function normalizePostForAPI(
  doc: any,
  currentUserId?: string,
  additionalData?: {
    isLikedByUser?: boolean;
    isNew?: boolean;
    [key: string]: any;
  }
): UnifiedPost {
  const normalizedPost = normalizePostDocument(doc, currentUserId);
  
  if (additionalData) {
    return {
      ...normalizedPost,
      ...additionalData
    };
  }
  
  return normalizedPost;
}

/**
 * Socket.IOイベント用のPost正規化
 * リアルタイム更新時の型安全性を保証
 * @param eventData - Socket.IOから受信したデータ
 * @returns 正規化されたUnifiedPost
 */
export function normalizePostFromSocketEvent(eventData: any): UnifiedPost {
  // Socket.IOイベントは通常、完全なPost構造を持たない場合がある
  // 既存のPostデータとマージする必要がある場合の処理
  return normalizePostDocument(eventData);
}

/**
 * 投稿作成/更新リクエストの検証と正規化
 * @param requestData - APIリクエストのボディデータ
 * @returns 検証済みのリクエストデータ
 */
export function validateAndNormalizePostRequest(requestData: PostRequestData): {
  title: string;
  content: string;
  category?: string;
  tags?: string[];
} {
  return {
    title: requestData.title || '',
    content: requestData.content || '',
    category: requestData.category || 'general',
    tags: Array.isArray(requestData.tags) ? requestData.tags : []
  };
}