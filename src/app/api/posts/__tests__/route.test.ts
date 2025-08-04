import { GET, POST } from '../route';
import { NextRequest } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Post from '@/models/Post';

// モック
jest.mock('@/lib/mongodb');
jest.mock('@/models/Post');

describe('POST /api/posts', () => {
  const mockDbConnect = dbConnect as jest.MockedFunction<typeof dbConnect>;
  const mockPostCreate = Post.create as jest.Mock;
  const mockPostFind = Post.find as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockDbConnect.mockResolvedValue(undefined as unknown as ReturnType<typeof dbConnect>);
  });

  describe('GET', () => {
    it('returns all posts sorted by createdAt in descending order', async () => {
      const mockPosts = [
        {
          _id: '1',
          title: 'Post 1',
          content: 'Content 1',
          author: 'Author 1',
          createdAt: new Date('2025-08-03T10:00:00Z'),
        },
        {
          _id: '2',
          title: 'Post 2',
          content: 'Content 2',
          author: 'Author 2',
          createdAt: new Date('2025-08-03T11:00:00Z'),
        },
      ];

      const mockSort = jest.fn().mockResolvedValue(mockPosts);
      mockPostFind.mockReturnValue({ sort: mockSort });

      const response = await GET();
      const data = await response.json();

      expect(mockDbConnect).toHaveBeenCalled();
      expect(mockPostFind).toHaveBeenCalled();
      expect(mockSort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(response.status).toBe(200);
      expect(data).toEqual({
        success: true,
        data: mockPosts,
      });
    });

    it('returns 500 on database error', async () => {
      mockDbConnect.mockRejectedValue(new Error('DB Connection failed'));

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({
        success: false,
        error: 'Failed to fetch posts',
      });
    });

    it('returns empty array when no posts exist', async () => {
      const mockSort = jest.fn().mockResolvedValue([]);
      mockPostFind.mockReturnValue({ sort: mockSort });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        success: true,
        data: [],
      });
    });
  });

  describe('POST', () => {
    it('creates a new post with valid data', async () => {
      const requestBody = {
        title: 'New Post',
        content: 'Post content',
        author: 'Test Author',
      };

      const mockCreatedPost = {
        _id: '123',
        ...requestBody,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPostCreate.mockResolvedValue(mockCreatedPost);

      const request = new NextRequest('http://localhost:3000/api/posts', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(mockDbConnect).toHaveBeenCalled();
      expect(mockPostCreate).toHaveBeenCalledWith(requestBody);
      expect(response.status).toBe(201);
      expect(data).toEqual({
        success: true,
        data: mockCreatedPost,
      });
    });

    it('returns 400 for validation errors', async () => {
      const requestBody = {
        title: '', // 空のタイトル
        content: 'Content',
        author: 'Author',
      };

      const validationError = new Error('Validation failed') as Error & {
        name: string;
        errors: Record<string, { message: string }>;
      };
      validationError.name = 'ValidationError';
      validationError.errors = {
        title: { message: 'タイトルは必須です' },
      };

      mockPostCreate.mockRejectedValue(validationError);

      const request = new NextRequest('http://localhost:3000/api/posts', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({
        success: false,
        error: 'タイトルは必須です',
      });
    });

    it('returns 400 for content exceeding 200 characters', async () => {
      const requestBody = {
        title: 'Test',
        content: 'a'.repeat(201), // 201文字
        author: 'Author',
      };

      const validationError = new Error('Validation failed') as Error & {
        name: string;
        errors: Record<string, { message: string }>;
      };
      validationError.name = 'ValidationError';
      validationError.errors = {
        content: { message: '投稿は200文字以内にしてください' },
      };

      mockPostCreate.mockRejectedValue(validationError);

      const request = new NextRequest('http://localhost:3000/api/posts', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('200文字以内');
    });

    it('returns 500 for general errors', async () => {
      const requestBody = {
        title: 'Test',
        content: 'Content',
        author: 'Author',
      };

      mockPostCreate.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/posts', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({
        success: false,
        error: 'Failed to create post',
      });
    });

    it('handles multiple validation errors', async () => {
      const requestBody = {
        title: '',
        content: '',
        author: '',
      };

      const validationError = new Error('Validation failed') as Error & {
        name: string;
        errors: Record<string, { message: string }>;
      };
      validationError.name = 'ValidationError';
      validationError.errors = {
        title: { message: 'タイトルは必須です' },
        content: { message: '投稿内容は必須です' },
        author: { message: '投稿者名は必須です' },
      };

      mockPostCreate.mockRejectedValue(validationError);

      const request = new NextRequest('http://localhost:3000/api/posts', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('タイトルは必須です');
      expect(data.error).toContain('投稿内容は必須です');
      expect(data.error).toContain('投稿者名は必須です');
    });
  });
});