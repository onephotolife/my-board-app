'use client';

import { memo, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import List from '@mui/material/List';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Skeleton from '@mui/material/Skeleton';
import dynamic from 'next/dynamic';

import type { UnifiedPost } from '@/types/post';

// PostItemを動的インポート
const PostItem = dynamic(() => import('./PostItem'), {
  loading: () => <PostItemSkeleton />,
  ssr: false,
});

interface VirtualizedPostListProps {
  posts: UnifiedPost[];
  onEdit: (post: UnifiedPost) => void;
  onDelete: (id: string) => void;
}

// スケルトンコンポーネント
const PostItemSkeleton = memo(function PostItemSkeleton() {
  return (
    <Box sx={{ p: 2 }}>
      <Skeleton variant="text" width="60%" height={32} />
      <Skeleton variant="text" width="40%" height={20} sx={{ mb: 1 }} />
      <Skeleton variant="rectangular" width="100%" height={60} />
    </Box>
  );
});

const VirtualizedPostList = memo(function VirtualizedPostList({ 
  posts, 
  onEdit, 
  onDelete 
}: VirtualizedPostListProps) {
  const [visiblePosts, setVisiblePosts] = useState<Post[]>([]);
  const [loadedCount, setLoadedCount] = useState(10);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const isLoadingRef = useRef(false);

  // 初期表示は10件
  useEffect(() => {
    setVisiblePosts(posts.slice(0, 10));
    setLoadedCount(10);
  }, [posts]);

  // 追加の投稿を読み込む
  const loadMorePosts = useCallback(() => {
    if (isLoadingRef.current || loadedCount >= posts.length) return;
    
    isLoadingRef.current = true;
    
    // 遅延を入れて段階的に読み込み
    requestAnimationFrame(() => {
      const nextBatch = posts.slice(loadedCount, loadedCount + 10);
      setVisiblePosts(prev => [...prev, ...nextBatch]);
      setLoadedCount(prev => prev + 10);
      isLoadingRef.current = false;
    });
  }, [posts, loadedCount]);

  // Intersection Observerで無限スクロール
  useEffect(() => {
    if (!sentinelRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMorePosts();
        }
      },
      {
        rootMargin: '100px', // 100px手前で読み込み開始
        threshold: 0.1,
      }
    );

    observer.observe(sentinelRef.current);

    return () => {
      observer.disconnect();
    };
  }, [loadMorePosts]);

  // メモ化されたリストアイテム
  const listItems = useMemo(() => {
    return visiblePosts.map((post, index) => (
      <Box key={post._id}>
        <PostItem
          post={post}
          onEdit={onEdit}
          onDelete={onDelete}
        />
        {index < visiblePosts.length - 1 && <Divider />}
      </Box>
    ));
  }, [visiblePosts, onEdit, onDelete]);

  return (
    <List sx={{ width: '100%', bgcolor: 'background.paper' }}>
      {listItems}
      
      {/* ローディングインジケーター */}
      {loadedCount < posts.length && (
        <>
          <PostItemSkeleton />
          <div 
            ref={sentinelRef} 
            style={{ height: 1, visibility: 'hidden' }}
            aria-hidden="true"
          />
        </>
      )}
      
      {/* 全件表示完了メッセージ */}
      {loadedCount >= posts.length && posts.length > 0 && (
        <Box sx={{ textAlign: 'center', py: 2, color: 'text.secondary' }}>
          全ての投稿を表示しました
        </Box>
      )}
    </List>
  );
});

export default VirtualizedPostList;