'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import NavBar from '@/components/NavBar';
import CommentForm from '@/components/CommentForm';
import CommentItem from '@/components/CommentItem';
import { formatDate, formatNumber, formatDuration, assetUrl } from '@/lib/utils';

interface Video {
  id: string;
  title: string;
  description: string;
  video_url: string;
  cover_url: string;
  duration: number;
  views: number;
  tags: string[];
  created_at: string;
}

interface Comment {
  id: string;
  content: string;
  nickname: string;
  contact: string;
  created_at: string;
}

interface VideoDetailClientProps {
  video: Video;
  comments: Comment[];
}

export default function VideoDetailClient({ video: initialVideo, comments: initialComments }: VideoDetailClientProps) {
  const videoId = initialVideo.id;

  // 客户端独立维护评论状态（支持评论刷新）
  const [comments, setComments] = useState<Comment[]>(initialComments);

  // 客户端请求增加播放计数（不影响 ISR）
  useEffect(() => {
    const referer = document.referrer || '';
    if (referer.includes('/admin')) return;

    fetch(`/api/videos/${videoId}/view`, { method: 'POST' }).catch(() => {});
  }, [videoId]);

  const refreshData = useCallback(async () => {
    try {
      const res = await fetch(`/api/videos/${videoId}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.comments) setComments(data.comments);
    } catch {}
  }, [videoId]);

  // 外部URL直接用，Blob URL需要加 / 前缀
  const getMediaUrl = (url: string) => url.startsWith('http') ? url : `/${url}`;

  if (!initialVideo) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6">
        <h1 className="font-display text-3xl mb-4">视频不存在</h1>
        <p className="text-text2 mb-8">该视频可能已被删除或不存在</p>
        <Link href="/" className="text-accent hover:underline">← 返回首页</Link>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-bg">
      <NavBar />

      {/* 播放器区域 */}
      <div className="pt-16">
        <div className="relative w-full bg-black">
          <div className="relative w-full max-w-6xl mx-auto" style={{ aspectRatio: '16/9' }}>
            {initialVideo.video_url ? (
              initialVideo.video_url.includes('bilibili.com/video/') ? (
                <iframe
                  src={initialVideo.video_url.includes('BV')
                    ? `https://player.bilibili.com/player.html?bvid=${initialVideo.video_url.match(/BV[A-Za-z0-9]+/)?.[0]}&autoplay=0`
                    : initialVideo.video_url
                  }
                  className="absolute inset-0 w-full h-full border-0"
                  allowFullScreen
                />
              ) : initialVideo.video_url.startsWith('http') ? (
                <video
                  className="absolute inset-0 w-full h-full object-contain bg-black"
                  controls
                  preload="metadata"
                  poster={initialVideo.cover_url || undefined}
                >
                  <source src={initialVideo.video_url} type="video/mp4" />
                  你的浏览器不支持视频播放
                </video>
              ) : (
                <video
                  className="absolute inset-0 w-full h-full object-contain bg-black"
                  controls
                  preload="metadata"
                  poster={initialVideo.cover_url || undefined}
                >
                  <source src={getMediaUrl(initialVideo.video_url)} type="video/mp4" />
                  你的浏览器不支持视频播放
                </video>
              )
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-surface">
                <span className="text-text3">暂无视频</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 视频信息 */}
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex flex-col lg:flex-row gap-10">
          {/* 左侧信息 */}
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-3xl lg:text-4xl font-bold leading-tight mb-4">
              {initialVideo.title}
            </h1>

            <div className="flex items-center gap-6 text-sm text-text2 mb-6">
              <span className="flex items-center gap-1.5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                {formatNumber(initialVideo.views)} 次播放
              </span>
              {initialVideo.duration > 0 && (
                <span className="font-mono">{formatDuration(initialVideo.duration)}</span>
              )}
              <span className="font-mono">{formatDate(initialVideo.created_at)}</span>
            </div>

            {initialVideo.tags.length > 0 && (
              <div className="flex gap-2 flex-wrap mb-6">
                {initialVideo.tags.map(tag => (
                  <span key={tag} className="tag">{tag}</span>
                ))}
              </div>
            )}

            {initialVideo.description && (
              <div className="text-text2 leading-relaxed whitespace-pre-wrap border-l-2 border-border pl-4">
                {initialVideo.description}
              </div>
            )}
          </div>

          {/* 右侧评论区 */}
          <div className="w-full lg:w-[400px] shrink-0">
            <div className="sticky top-20">
              <h3 className="font-display text-lg mb-4 flex items-center gap-2">
                <span className="w-1 h-5 bg-accent inline-block" />
                留言
                <span className="text-text3 text-sm font-sans font-normal">({comments.length})</span>
              </h3>

              <CommentForm videoId={videoId} onSubmitted={refreshData} />

              <div className="mt-6">
                {comments.length > 0 ? (
                  comments.map(c => <CommentItem key={c.id} comment={c} />)
                ) : (
                  <p className="text-text3 text-sm py-8 text-center">还没有留言，成为第一个吧</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
