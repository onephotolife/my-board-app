import Link from 'next/link';
import { notFound } from 'next/navigation';

import { connectDB } from '@/lib/db/mongodb-local';
import Post from '@/lib/models/Post';
import { normalizeTag } from '@/app/utils/hashtag';

export const revalidate = 60;

export default async function TagPage({ params }: { params: { tag: string } }) {
  const { tag } = params;
  const key = normalizeTag(tag);
  if (!key) return notFound();

  await connectDB();
  const posts = await Post.find({ tags: key }).sort({ createdAt: -1 }).limit(50).lean();

  return (
    <div style={{ padding: 16 }}>
      <h1>#{key} の投稿</h1>
      {posts.length === 0 ? (
        <p>まだ投稿がありません。</p>
      ) : (
        <ul>
          {posts.map(
            (p: { _id: string | { toString(): string }; title?: string; content?: string }) => {
              const id = typeof p._id === 'string' ? p._id : p._id.toString();
              const title = p.title || (p.content ? p.content.slice(0, 80) : '(無題)');
              return (
                <li key={id}>
                  <Link href={`/posts/${id}`}>{title}</Link>
                </li>
              );
            }
          )}
        </ul>
      )}
    </div>
  );
}
