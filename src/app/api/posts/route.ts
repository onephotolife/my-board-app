import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Post from '@/models/Post';

export async function GET() {
  try {
    await dbConnect();
    const posts = await Post.find({}).sort({ createdAt: -1 });
    return NextResponse.json({ success: true, data: posts });
  } catch (error) {
    console.error('Error in GET /api/posts:', error);
    
    // MongoDB接続エラーの詳細情報をログに出力
    if (error instanceof Error) {
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: process.env.NODE_ENV === 'production' 
          ? 'Failed to fetch posts' 
          : (error instanceof Error ? error.message : 'Failed to fetch posts')
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const body = await request.json();
    
    const post = await Post.create(body);
    return NextResponse.json(
      { success: true, data: post },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error in POST /api/posts:', error);
    
    if (error && typeof error === 'object' && 'name' in error && error.name === 'ValidationError' && 'errors' in error) {
      const validationError = error as {errors: Record<string, {message: string}>};
      const messages = Object.values(validationError.errors).map((err) => err.message);
      return NextResponse.json(
        { success: false, error: messages.join(', ') },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: 'Failed to create post' },
      { status: 500 }
    );
  }
}