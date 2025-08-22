import { connectDB } from '@/lib/db/mongodb-local';
import Post from '@/lib/models/Post';
import User from '@/lib/models/User';

export interface CreatePostData {
  title: string;
  content: string;
  category: string;
  tags?: string[];
  status?: 'published' | 'draft' | 'deleted';
}

export async function createTestPost(authorId: string, postData: CreatePostData) {
  await connectDB();
  
  // 著者情報を取得
  const author = await User.findById(authorId);
  if (!author) {
    throw new Error('Author not found');
  }

  const post = await Post.create({
    title: postData.title,
    content: postData.content,
    category: postData.category,
    tags: postData.tags || [],
    status: postData.status || 'published',
    author: {
      _id: author._id,
      name: author.name,
      email: author.email,
    },
    views: 0,
    likes: [],
  });

  return post.toJSON();
}

export async function deleteTestPost(postId: string) {
  await connectDB();
  await Post.findByIdAndDelete(postId);
}

export async function updateTestPost(postId: string, updateData: Partial<CreatePostData>) {
  await connectDB();
  
  const updatedPost = await Post.findByIdAndUpdate(
    postId,
    {
      ...updateData,
      updatedAt: new Date(),
    },
    { new: true }
  );

  return updatedPost?.toJSON();
}

export async function likePost(postId: string, userId: string) {
  await connectDB();
  
  const post = await Post.findById(postId);
  if (!post) {
    throw new Error('Post not found');
  }

  if (!post.likes.includes(userId)) {
    post.likes.push(userId);
    await post.save();
  }

  return post.toJSON();
}

export async function unlikePost(postId: string, userId: string) {
  await connectDB();
  
  const post = await Post.findById(postId);
  if (!post) {
    throw new Error('Post not found');
  }

  post.likes = post.likes.filter(id => id !== userId);
  await post.save();

  return post.toJSON();
}

export async function incrementPostViews(postId: string) {
  await connectDB();
  
  const post = await Post.findByIdAndUpdate(
    postId,
    { $inc: { views: 1 } },
    { new: true }
  );

  return post?.toJSON();
}

export async function flagPost(postId: string) {
  await connectDB();
  
  const post = await Post.findByIdAndUpdate(
    postId,
    { status: 'flagged' },
    { new: true }
  );

  return post?.toJSON();
}

export async function softDeletePost(postId: string) {
  await connectDB();
  
  const post = await Post.findById(postId);
  if (!post) {
    throw new Error('Post not found');
  }

  await post.softDelete();
  return post.toJSON();
}

export async function createMultipleTestPosts(authorId: string, count: number, baseData: CreatePostData) {
  const posts = [];
  
  for (let i = 0; i < count; i++) {
    const postData = {
      ...baseData,
      title: `${baseData.title} ${i + 1}`,
      content: `${baseData.content} - Post ${i + 1}`,
    };
    
    const post = await createTestPost(authorId, postData);
    posts.push(post);
  }

  return posts;
}

export async function deleteMultipleTestPosts(postIds: string[]) {
  for (const postId of postIds) {
    await deleteTestPost(postId);
  }
}

export async function getPostsByCategory(category: string) {
  await connectDB();
  
  const posts = await Post.find({ 
    category, 
    status: 'published' 
  }).lean();

  return posts;
}

export async function getPostsByTag(tag: string) {
  await connectDB();
  
  const posts = await Post.find({ 
    tags: { $in: [tag] }, 
    status: 'published' 
  }).lean();

  return posts;
}

export async function searchPosts(query: string) {
  await connectDB();
  
  const posts = await Post.find({
    $text: { $search: query },
    status: 'published'
  }).lean();

  return posts;
}