import { NextRequest, NextResponse } from 'next/server';

import { requireEmailVerifiedSession, ApiAuthError, createApiErrorResponse } from '@/lib/api-auth';
import dbConnect from '@/lib/mongodb';
import User from '@/lib/models/User';

// GET: プロフィール取得
export async function GET(req: NextRequest) {
  try {
    // 🔒 25人天才エンジニア会議による緊急修正: メール確認済みセッション必須
    const session = await requireEmailVerifiedSession();

    // データベース接続
    await dbConnect();

    // ユーザー情報を取得
    const user = await User.findOne({ email: session.user.email })
      .select('-password')
      .lean();

    if (!user) {
      return NextResponse.json(
        { error: 'ユーザーが見つかりません' },
        { status: 404 }
      );
    }

    // レスポンス用のユーザーオブジェクトを作成
    const userProfile = {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      bio: user.bio || '',
      avatar: user.avatar || '',
      location: user.location || '',
      occupation: user.occupation || '',
      education: user.education || '',
      website: user.website || '',
      emailVerified: user.emailVerified,
      lastProfileUpdate: user.lastProfileUpdate,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    return NextResponse.json({ user: userProfile }, { status: 200 });
  } catch (error) {
    // 🔒 API認証エラーの適切なハンドリング
    if (error instanceof ApiAuthError) {
      return createApiErrorResponse(error);
    }
    
    console.error('Profile GET error:', error);
    return NextResponse.json(
      { error: 'プロフィールの取得に失敗しました' },
      { status: 500 }
    );
  }
}

// PUT: プロフィール更新
export async function PUT(req: NextRequest) {
  try {
    // 🔒 25人天才エンジニア会議による緊急修正: メール確認済みセッション必須
    const session = await requireEmailVerifiedSession();

    // リクエストボディを取得
    const body = await req.json();
    const { name, bio, location, occupation, education, website } = body;
    

    // バリデーション
    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { error: '名前は必須です' },
        { status: 400 }
      );
    }

    if (name.trim().length === 0) {
      return NextResponse.json(
        { error: '名前を入力してください' },
        { status: 400 }
      );
    }

    if (name.length > 50) {
      return NextResponse.json(
        { error: '名前は50文字以内で入力してください' },
        { status: 400 }
      );
    }

    if (bio && typeof bio !== 'string') {
      return NextResponse.json(
        { error: '自己紹介の形式が正しくありません' },
        { status: 400 }
      );
    }

    if (bio && bio.length > 200) {
      return NextResponse.json(
        { error: '自己紹介は200文字以内で入力してください' },
        { status: 400 }
      );
    }

    // 追加フィールドのバリデーション
    if (location && typeof location !== 'string') {
      return NextResponse.json(
        { error: '場所の形式が正しくありません' },
        { status: 400 }
      );
    }

    if (location && location.length > 100) {
      return NextResponse.json(
        { error: '場所は100文字以内で入力してください' },
        { status: 400 }
      );
    }

    if (occupation && typeof occupation !== 'string') {
      return NextResponse.json(
        { error: '職業の形式が正しくありません' },
        { status: 400 }
      );
    }

    if (occupation && occupation.length > 100) {
      return NextResponse.json(
        { error: '職業は100文字以内で入力してください' },
        { status: 400 }
      );
    }

    if (education && typeof education !== 'string') {
      return NextResponse.json(
        { error: '学歴の形式が正しくありません' },
        { status: 400 }
      );
    }

    if (education && education.length > 100) {
      return NextResponse.json(
        { error: '学歴は100文字以内で入力してください' },
        { status: 400 }
      );
    }

    if (website && typeof website !== 'string') {
      return NextResponse.json(
        { error: 'ウェブサイトの形式が正しくありません' },
        { status: 400 }
      );
    }

    if (website && website.length > 0 && !/^https?:\/\/.+/.test(website)) {
      return NextResponse.json(
        { error: '有効なURLを入力してください' },
        { status: 400 }
      );
    }

    // データベース接続
    await dbConnect();

    // 各フィールドの値を適切に処理
    const bioValue = bio !== undefined && bio !== null ? String(bio).trim() : '';
    const locationValue = location !== undefined && location !== null ? String(location).trim() : undefined;
    const occupationValue = occupation !== undefined && occupation !== null ? String(occupation).trim() : undefined;
    const educationValue = education !== undefined && education !== null ? String(education).trim() : undefined;
    const websiteValue = website !== undefined && website !== null ? String(website).trim() : undefined;
    
    console.log('[DEBUG] Update request:', {
      email: session.user.email,
      name: name.trim(),
      bio: bioValue,
      location: locationValue,
      occupation: occupationValue,
      education: educationValue,
      website: websiteValue
    });

    // 更新するフィールドを動的に構築
    const updateFields: any = {
      name: name.trim(),
      bio: bioValue,
      lastProfileUpdate: new Date(),
      updatedAt: new Date(),
    };

    // オプションフィールドは値がある場合のみ更新
    if (locationValue !== undefined) updateFields.location = locationValue;
    if (occupationValue !== undefined) updateFields.occupation = occupationValue;
    if (educationValue !== undefined) updateFields.education = educationValue;
    if (websiteValue !== undefined) updateFields.website = websiteValue;

    // ユーザー情報を更新
    const result = await User.updateOne(
      { email: session.user.email },
      { $set: updateFields }
    );
    
    console.log('[DEBUG] MongoDB update result:', {
      acknowledged: result.acknowledged,
      modifiedCount: result.modifiedCount,
      matchedCount: result.matchedCount
    });
    
    // 更新後のユーザー情報を取得
    const updatedUser = await User.findOne({ email: session.user.email }).select('-password');
    
    console.log('[DEBUG] Updated user bio:', updatedUser?.bio);

    if (!updatedUser) {
      return NextResponse.json(
        { error: 'ユーザーが見つかりません' },
        { status: 404 }
      );
    }


    // レスポンス用のユーザーオブジェクトを作成
    const userProfile = {
      id: updatedUser._id.toString(),
      email: updatedUser.email,
      name: updatedUser.name,
      bio: updatedUser.bio !== undefined && updatedUser.bio !== null ? updatedUser.bio : '',
      avatar: updatedUser.avatar || '',
      location: updatedUser.location || '',
      occupation: updatedUser.occupation || '',
      education: updatedUser.education || '',
      website: updatedUser.website || '',
      emailVerified: updatedUser.emailVerified,
      lastProfileUpdate: updatedUser.lastProfileUpdate,
      createdAt: updatedUser.createdAt,
      updatedAt: updatedUser.updatedAt,
    };
    

    return NextResponse.json(
      { 
        message: 'プロフィールを更新しました',
        user: userProfile 
      },
      { status: 200 }
    );
  } catch (error) {
    // 🔒 API認証エラーの適切なハンドリング
    if (error instanceof ApiAuthError) {
      return createApiErrorResponse(error);
    }
    
    console.error('Profile PUT error:', error);
    return NextResponse.json(
      { error: 'プロフィールの更新に失敗しました' },
      { status: 500 }
    );
  }
}