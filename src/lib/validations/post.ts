import { z } from 'zod';

// カテゴリーの定義
export const PostCategory = {
  GENERAL: 'general',
  TECH: 'tech',
  QUESTION: 'question',
  DISCUSSION: 'discussion',
  ANNOUNCEMENT: 'announcement',
} as const;

export type PostCategoryType = typeof PostCategory[keyof typeof PostCategory];

// カテゴリーの日本語ラベル
export const PostCategoryLabels: Record<PostCategoryType, string> = {
  general: '一般',
  tech: '技術',
  question: '質問',
  discussion: '議論',
  announcement: 'お知らせ',
};

// 基本的な投稿スキーマ
export const postSchema = z.object({
  title: z.string()
    .min(1, 'タイトルを入力してください')
    .max(100, 'タイトルは100文字以内で入力してください')
    .regex(/^[^<>]*$/, '使用できない文字が含まれています'),
  
  content: z.string()
    .min(1, '本文を入力してください')
    .max(1000, '本文は1000文字以内で入力してください'),
  
  tags: z.array(z.string().max(20, 'タグは20文字以内で入力してください'))
    .max(5, 'タグは最大5個までです')
    .optional()
    .default([]),
  
  category: z.enum(['general', 'tech', 'question', 'discussion', 'announcement'])
    .default('general'),
});

// 投稿作成用スキーマ
export const createPostSchema = postSchema;

// 投稿更新用スキーマ（部分更新を許可）
export const updatePostSchema = postSchema.partial();

// 投稿フィルター用スキーマ
export const postFilterSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(50).default(10),
  category: z.enum(['all', 'general', 'tech', 'question', 'discussion', 'announcement']).optional(),
  tag: z.string().optional(),
  search: z.string().optional(),
  author: z.string().optional(),
  sort: z.enum(['createdAt', '-createdAt', 'updatedAt', '-updatedAt', 'views', '-views']).default('-createdAt'),
});

// 型のエクスポート
export type PostInput = z.infer<typeof postSchema>;
export type CreatePostInput = z.infer<typeof createPostSchema>;
export type UpdatePostInput = z.infer<typeof updatePostSchema>;
export type PostFilter = z.infer<typeof postFilterSchema>;

// バリデーション関数
export const validatePost = (data: unknown): { success: boolean; data?: PostInput; errors?: z.ZodError } => {
  try {
    const validatedData = postSchema.parse(data);
    return { success: true, data: validatedData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, errors: error };
    }
    throw error;
  }
};

// サニタイズ関数
export const sanitizePostInput = (input: string): string => {
  // 基本的なHTMLタグを除去
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/on\w+\s*=\s*"[^"]*"/gi, '')
    .replace(/on\w+\s*=\s*'[^']*'/gi, '')
    .trim();
};

// 文字数カウント関数（改行を考慮）
export const countCharacters = (text: string): number => {
  return text.replace(/\r\n/g, '\n').length;
};

// エラーメッセージのフォーマット
export const formatValidationErrors = (errors: z.ZodError): Record<string, string> => {
  const formatted: Record<string, string> = {};
  
  errors.issues.forEach((issue) => {
    const path = issue.path.join('.');
    formatted[path] = issue.message;
  });
  
  return formatted;
};