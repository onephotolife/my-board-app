import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getToken } from 'next-auth/jwt';
import { connectDB } from '@/lib/db/mongodb-local';
import Post from '@/lib/models/Post';
import User from '@/lib/models/User';
import { createErrorResponse, AuthUser } from '@/lib/middleware/auth';

// 検索パラメータのバリデーション
const searchSchema = z.object({
  q: z.string().min(1, '検索キーワードを入力してください').max(100),
  type: z.enum(['posts', 'users', 'all']).optional().default('posts'),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  author: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  sortBy: z.enum(['relevance', 'date', 'likes', 'views']).optional().default('relevance'),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(50).default(10),
});

export async function GET(req: NextRequest) {
  try {
    // 認証チェック
    const token = await getToken({
      req,
      secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || 'blankinai-member-board-secret-key-2024-production',
    });

    if (!token || !token.emailVerified) {
      return createErrorResponse('認証が必要です', 401, 'UNAUTHORIZED');
    }

    const user: AuthUser = {
      id: token.id as string || token.sub as string,
      email: token.email as string,
      name: token.name as string,
      emailVerified: true,
    };

    // クエリパラメータの取得とバリデーション
    const searchParams = req.nextUrl.searchParams;
    const params = {
      q: searchParams.get('q') || '',
      type: searchParams.get('type') || 'posts',
      category: searchParams.get('category') || undefined,
      tags: searchParams.getAll('tags').filter(Boolean),
      author: searchParams.get('author') || undefined,
      dateFrom: searchParams.get('dateFrom') || undefined,
      dateTo: searchParams.get('dateTo') || undefined,
      sortBy: searchParams.get('sortBy') || 'relevance',
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '10'),
    };

    const validatedParams = searchSchema.parse(params);

    await connectDB();

    const results: any = {
      posts: [],
      users: [],
      total: 0,
    };

    // 投稿の検索
    if (validatedParams.type === 'posts' || validatedParams.type === 'all') {
      const postQuery: any = {
        status: 'published',
      };

      // 全文検索
      if (validatedParams.q) {
        postQuery.$text = {
          $search: validatedParams.q,
          $language: 'japanese',
        };
      }

      // カテゴリフィルター
      if (validatedParams.category && validatedParams.category !== 'all') {
        postQuery.category = validatedParams.category;
      }

      // タグフィルター
      if (validatedParams.tags && validatedParams.tags.length > 0) {
        postQuery.tags = { $in: validatedParams.tags };
      }

      // 著者フィルター
      if (validatedParams.author) {
        postQuery['author._id'] = validatedParams.author;
      }

      // 日付範囲フィルター
      if (validatedParams.dateFrom || validatedParams.dateTo) {
        postQuery.createdAt = {};
        if (validatedParams.dateFrom) {
          postQuery.createdAt.$gte = new Date(validatedParams.dateFrom);
        }
        if (validatedParams.dateTo) {
          postQuery.createdAt.$lte = new Date(validatedParams.dateTo);
        }
      }

      // ソート設定
      let sortOptions: any = {};
      switch (validatedParams.sortBy) {
        case 'relevance':
          if (validatedParams.q) {
            sortOptions = { score: { $meta: 'textScore' } };
          } else {
            sortOptions = { createdAt: -1 };
          }
          break;
        case 'date':
          sortOptions = { createdAt: -1 };
          break;
        case 'likes':
          sortOptions = { 'likes.length': -1 };
          break;
        case 'views':
          sortOptions = { views: -1 };
          break;
      }

      // ページネーション計算
      const skip = (validatedParams.page - 1) * validatedParams.limit;

      // クエリ実行
      let postsQuery = Post.find(postQuery);
      
      // テキスト検索の場合はスコアを追加
      if (validatedParams.q && validatedParams.sortBy === 'relevance') {
        postsQuery = postsQuery.select({ score: { $meta: 'textScore' } });
      }

      const [posts, postCount] = await Promise.all([
        postsQuery
          .sort(sortOptions)
          .skip(skip)
          .limit(validatedParams.limit)
          .lean(),
        Post.countDocuments(postQuery),
      ]);

      // 権限情報を追加
      results.posts = posts.map((post: any) => ({
        ...post,
        canEdit: post.author._id === user.id,
        canDelete: post.author._id === user.id,
        isLikedByUser: post.likes?.includes(user.id) || false,
      }));

      results.total += postCount;
    }

    // ユーザーの検索
    if (validatedParams.type === 'users' || validatedParams.type === 'all') {
      const userQuery: any = {
        status: { $ne: 'banned' },
      };

      if (validatedParams.q) {
        userQuery.$text = {
          $search: validatedParams.q,
          $language: 'japanese',
        };
      }

      const skip = (validatedParams.page - 1) * validatedParams.limit;

      let usersQuery = User.find(userQuery).select('-password');
      
      if (validatedParams.q) {
        usersQuery = usersQuery.select({ score: { $meta: 'textScore' } });
      }

      const [users, userCount] = await Promise.all([
        usersQuery
          .sort(validatedParams.q ? { score: { $meta: 'textScore' } } : { createdAt: -1 })
          .skip(skip)
          .limit(validatedParams.limit)
          .lean(),
        User.countDocuments(userQuery),
      ]);

      results.users = users;
      results.total += userCount;
    }

    // 検索履歴の保存（オプション）
    // TODO: 検索履歴機能の実装

    // レスポンスの構築
    const response: any = {
      success: true,
      data: results,
      query: validatedParams.q,
      filters: {
        type: validatedParams.type,
        category: validatedParams.category,
        tags: validatedParams.tags,
        author: validatedParams.author,
        dateRange: {
          from: validatedParams.dateFrom,
          to: validatedParams.dateTo,
        },
      },
      pagination: {
        page: validatedParams.page,
        limit: validatedParams.limit,
        total: results.total,
        totalPages: Math.ceil(results.total / validatedParams.limit),
        hasNext: validatedParams.page * validatedParams.limit < results.total,
        hasPrev: validatedParams.page > 1,
      },
      sortBy: validatedParams.sortBy,
    };

    // 関連キーワードの提案（簡易実装）
    if (validatedParams.q && results.posts.length > 0) {
      const allTags = new Set<string>();
      results.posts.forEach((post: any) => {
        post.tags?.forEach((tag: string) => allTags.add(tag));
      });
      response.suggestions = Array.from(allTags).slice(0, 5);
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('検索エラー:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: 'バリデーションエラー',
            details: error.flatten().fieldErrors,
          },
        },
        { status: 400 }
      );
    }
    
    return createErrorResponse('検索に失敗しました', 500, 'SEARCH_ERROR');
  }
}

// POST: 検索候補の取得（オートコンプリート）
export async function POST(req: NextRequest) {
  try {
    const token = await getToken({
      req,
      secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || 'blankinai-member-board-secret-key-2024-production',
    });

    if (!token || !token.emailVerified) {
      return createErrorResponse('認証が必要です', 401, 'UNAUTHORIZED');
    }

    const body = await req.json();
    const { query, type = 'posts' } = body;

    if (!query || query.length < 2) {
      return NextResponse.json({
        success: true,
        suggestions: [],
      });
    }

    await connectDB();

    const suggestions: any[] = [];

    if (type === 'posts' || type === 'all') {
      // タイトルの部分一致検索
      const posts = await Post.find(
        {
          status: 'published',
          title: { $regex: query, $options: 'i' },
        },
        { title: 1 }
      )
        .limit(5)
        .lean();

      posts.forEach(post => {
        suggestions.push({
          type: 'post',
          value: post.title,
          id: post._id,
        });
      });

      // タグの部分一致検索
      const tagPosts = await Post.find(
        {
          status: 'published',
          tags: { $regex: query, $options: 'i' },
        },
        { tags: 1 }
      )
        .limit(5)
        .lean();

      const uniqueTags = new Set<string>();
      tagPosts.forEach(post => {
        post.tags?.forEach((tag: string) => {
          if (tag.toLowerCase().includes(query.toLowerCase())) {
            uniqueTags.add(tag);
          }
        });
      });

      Array.from(uniqueTags).slice(0, 5).forEach(tag => {
        suggestions.push({
          type: 'tag',
          value: tag,
        });
      });
    }

    if (type === 'users' || type === 'all') {
      const users = await User.find(
        {
          status: { $ne: 'banned' },
          name: { $regex: query, $options: 'i' },
        },
        { name: 1 }
      )
        .limit(5)
        .lean();

      users.forEach(user => {
        suggestions.push({
          type: 'user',
          value: user.name,
          id: user._id,
        });
      });
    }

    return NextResponse.json({
      success: true,
      suggestions: suggestions.slice(0, 10),
    });

  } catch (error) {
    console.error('オートコンプリートエラー:', error);
    return createErrorResponse('候補の取得に失敗しました', 500, 'AUTOCOMPLETE_ERROR');
  }
}