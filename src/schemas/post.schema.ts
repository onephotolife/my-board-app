import { z } from 'zod';

/**
 * フェーズ3: Zod統合型定義
 * UnifiedPost型のZodスキーマ定義
 */

// 著者スキーマ
export const UnifiedAuthorSchema = z.object({
  _id: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid MongoDB ObjectId format'),
  name: z.string().min(1).max(50),
  email: z.string().email(),
  avatar: z.string().url().nullable().optional(),
});

// 投稿ステータス
export const PostStatusSchema = z.enum(['published', 'draft', 'deleted']);

// 統一投稿スキーマ
export const UnifiedPostSchema = z.object({
  // 基本識別子
  _id: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid MongoDB ObjectId format'),
  
  // コンテンツフィールド
  title: z.string().min(1).max(100),
  content: z.string().min(1).max(1000),
  
  // 著者情報（統一構造）
  author: UnifiedAuthorSchema,
  authorInfo: UnifiedAuthorSchema.optional(), // 後方互換性
  
  // メタデータ
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  status: PostStatusSchema,
  
  // エンゲージメント指標
  likes: z.array(z.string().regex(/^[a-f\d]{24}$/i)).optional(),
  views: z.number().int().min(0).optional(),
  
  // タイムスタンプ
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  
  // UI制御フラグ
  canEdit: z.boolean().optional(),
  canDelete: z.boolean().optional(),
  isLikedByUser: z.boolean().optional(),
  isNew: z.boolean().optional(),
});

// 投稿作成リクエストスキーマ
export const CreatePostRequestSchema = z.object({
  title: z.string().min(1).max(100),
  content: z.string().min(1).max(1000),
  category: z.string().optional(),
  tags: z.array(z.string()).max(10).optional(),
});

// 投稿更新リクエストスキーマ
export const UpdatePostRequestSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  content: z.string().min(1).max(1000).optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).max(10).optional(),
  status: PostStatusSchema.optional(),
});

// ページネーションパラメータスキーマ
export const PostFilterSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  category: z.string().optional(),
  tag: z.string().optional(),
  search: z.string().optional(),
  author: z.string().regex(/^[a-f\d]{24}$/i).optional(),
  sort: z.enum(['-createdAt', 'createdAt', '-likes', 'likes', '-views', 'views']).default('-createdAt'),
});

// Socket.IOイベントスキーマ
export const PostEventSchema = z.object({
  post: UnifiedPostSchema.optional(),
  postId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
  userId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
  likes: z.array(z.string().regex(/^[a-f\d]{24}$/i)).optional(),
  views: z.number().int().min(0).optional(),
});

// MongoDBドキュメントからの変換関数
export function parseMongoDocument(doc: unknown): z.infer<typeof UnifiedPostSchema> | null {
  try {
    // MongoDB特有のフィールド変換
    if (typeof doc === 'object' && doc !== null) {
      const transformed = {
        ...doc,
        // ObjectIdの文字列変換
        _id: typeof (doc as any)._id === 'object' ? (doc as any)._id.toString() : (doc as any)._id,
        // Dateの文字列変換
        createdAt: (doc as any).createdAt instanceof Date 
          ? (doc as any).createdAt.toISOString() 
          : (doc as any).createdAt,
        updatedAt: (doc as any).updatedAt instanceof Date 
          ? (doc as any).updatedAt.toISOString() 
          : (doc as any).updatedAt,
        // AuthorフィールドのObjectId変換
        author: typeof (doc as any).author === 'object' && (doc as any).author !== null
          ? {
              ...(doc as any).author,
              _id: typeof (doc as any).author._id === 'object' 
                ? (doc as any).author._id.toString() 
                : (doc as any).author._id
            }
          : (doc as any).author,
        // likesフィールドのObjectId配列変換
        likes: Array.isArray((doc as any).likes)
          ? (doc as any).likes.map((id: any) => typeof id === 'object' ? id.toString() : id)
          : [],
      };
      
      return UnifiedPostSchema.parse(transformed);
    }
    return null;
  } catch (error) {
    console.error('Failed to parse MongoDB document:', error);
    return null;
  }
}

// バリデーション結果の型
export type ValidationResult<T> = {
  success: true;
  data: T;
} | {
  success: false;
  error: z.ZodError;
};

// バリデーションヘルパー関数
export function validatePost(data: unknown): ValidationResult<z.infer<typeof UnifiedPostSchema>> {
  const result = UnifiedPostSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

export function validateCreateRequest(data: unknown): ValidationResult<z.infer<typeof CreatePostRequestSchema>> {
  const result = CreatePostRequestSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

export function validateUpdateRequest(data: unknown): ValidationResult<z.infer<typeof UpdatePostRequestSchema>> {
  const result = UpdatePostRequestSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

export function validatePostFilter(data: unknown): ValidationResult<z.infer<typeof PostFilterSchema>> {
  const result = PostFilterSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

// 型エクスポート
export type UnifiedPost = z.infer<typeof UnifiedPostSchema>;
export type UnifiedAuthor = z.infer<typeof UnifiedAuthorSchema>;
export type CreatePostRequest = z.infer<typeof CreatePostRequestSchema>;
export type UpdatePostRequest = z.infer<typeof UpdatePostRequestSchema>;
export type PostFilter = z.infer<typeof PostFilterSchema>;
export type PostEvent = z.infer<typeof PostEventSchema>;