/**
 * 統一Post型定義（フェーズ2: 型システム統一）
 * 全コンポーネント・API層で共通使用する標準型定義
 * 
 * @created 2025-08-28
 * @phase Phase 2 - Type System Unification
 */

/**
 * 投稿者情報の統一型定義
 * MongoDB User DocumentのサブセットまたはPopulate結果
 */
export interface UnifiedAuthor {
  _id: string;           // MongoDB ObjectId (24文字16進数文字列)
  name: string;          // ユーザー表示名
  email: string;         // メールアドレス
  avatar?: string;       // アバターURL（オプション）
}

/**
 * 統一Post型定義
 * フロントエンド・バックエンド間で一貫性を保証
 */
export interface UnifiedPost {
  // 基本識別子
  _id: string;           // MongoDB ObjectId (必須・一意)
  
  // コンテンツフィールド
  title: string;         // タイトル（最大100文字）
  content: string;       // 本文（最大1000文字）
  
  // 著者情報（統一構造）
  author: UnifiedAuthor; // ネストされた著者情報
  authorInfo?: UnifiedAuthor; // 後方互換性のためのエイリアス
  
  // メタデータ
  category?: string;     // カテゴリ（general/tech/question等）
  tags?: string[];       // タグ配列
  status: 'published' | 'draft' | 'deleted'; // 投稿ステータス
  
  // エンゲージメント指標
  likes?: string[];      // いいねしたユーザーIDの配列
  views?: number;        // 閲覧数
  
  // タイムスタンプ（ISO 8601形式）
  createdAt: string;     // 作成日時
  updatedAt: string;     // 更新日時
  
  // UI制御フラグ（クライアントサイド用）
  canEdit?: boolean;     // 編集権限フラグ
  canDelete?: boolean;   // 削除権限フラグ
  isLikedByUser?: boolean; // 現在のユーザーがいいね済みか
  isNew?: boolean;       // 新規投稿フラグ（リアルタイム更新用）
}

/**
 * API応答の型定義
 */
export interface PostAPIResponse {
  success: boolean;
  data?: UnifiedPost | UnifiedPost[];
  error?: string;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

/**
 * 投稿作成リクエストの型定義
 */
export interface CreatePostRequest {
  title: string;
  content: string;
  category?: string;
  tags?: string[];
}

/**
 * 投稿更新リクエストの型定義
 */
export interface UpdatePostRequest {
  title?: string;
  content?: string;
  category?: string;
  tags?: string[];
  status?: 'published' | 'draft' | 'deleted';
}

/**
 * ランタイム型検証ヘルパー
 * API応答の型安全性を保証
 */
export function isUnifiedPost(obj: any): obj is UnifiedPost {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj._id === 'string' &&
    obj._id.length === 24 && // MongoDB ObjectId形式
    typeof obj.title === 'string' &&
    typeof obj.content === 'string' &&
    typeof obj.author === 'object' &&
    obj.author !== null &&
    typeof obj.author._id === 'string' &&
    typeof obj.author.name === 'string' &&
    typeof obj.author.email === 'string' &&
    typeof obj.createdAt === 'string' &&
    typeof obj.updatedAt === 'string' &&
    ['published', 'draft', 'deleted'].includes(obj.status)
  );
}

/**
 * レガシーPost型から統一型への変換
 * 後方互換性のためのマイグレーション関数
 */
export function normalizePostToUnified(post: any): UnifiedPost {
  // 著者情報の正規化
  let author: UnifiedAuthor;
  
  if (typeof post.author === 'string') {
    // レガシー形式: authorが文字列の場合
    author = {
      _id: post.author,
      name: 'Unknown User',
      email: 'unknown@example.com'
    };
  } else if (post.authorInfo) {
    // authorInfoフィールドが存在する場合
    author = {
      _id: post.authorInfo._id || post.author?._id || post._id,
      name: post.authorInfo.name || 'Unknown User',
      email: post.authorInfo.email || 'unknown@example.com',
      avatar: post.authorInfo.avatar
    };
  } else if (post.author && typeof post.author === 'object') {
    // authorがオブジェクトの場合
    author = {
      _id: post.author._id || post._id,
      name: post.author.name || 'Unknown User',
      email: post.author.email || 'unknown@example.com',
      avatar: post.author.avatar
    };
  } else {
    // フォールバック
    author = {
      _id: post._id,
      name: 'Unknown User',
      email: 'unknown@example.com'
    };
  }
  
  // 統一型への変換
  return {
    _id: post._id,
    title: post.title || '',
    content: post.content || '',
    author,
    authorInfo: author, // 後方互換性
    category: post.category || 'general',
    tags: Array.isArray(post.tags) ? post.tags : [],
    status: post.status || 'published',
    likes: Array.isArray(post.likes) ? post.likes : [],
    views: typeof post.views === 'number' ? post.views : 0,
    createdAt: post.createdAt || new Date().toISOString(),
    updatedAt: post.updatedAt || new Date().toISOString(),
    canEdit: post.canEdit || false,
    canDelete: post.canDelete || false,
    isLikedByUser: post.isLikedByUser || false,
    isNew: post.isNew || false
  };
}

/**
 * 投稿配列の重複除去
 * React key重複エラー防止用
 */
export function deduplicatePosts(posts: UnifiedPost[]): UnifiedPost[] {
  const seen = new Set<string>();
  return posts.filter(post => {
    if (seen.has(post._id)) {
      return false;
    }
    seen.add(post._id);
    return true;
  });
}