'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
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

export default function VideoDetailPage() {
  const params = useParams();
  const videoId = params.id as string;

  const [video, setVideo] = useState<Video | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);

  // 外部URL直接用，Blob URL需要加 / 前缀
  const getMediaUrl = (url: string) => url.startsWith('http') ? url : `/${url}`;

  const fetchData = async () => {
    try {
      const res = await fetch(`/api/videos/${videoId}`);
      if (!res.ok) return;
      const data = await res.json();
      setVideo(data.video);
      setComments(data.comments || []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [videoId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
      </div>
    );
  }

  if (!video) {
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
            {video.video_url ? (
              // 外部视频链接（如B站）使用iframe嵌入
              video.video_url.includes('bilibili.com/video/') ? (
                <iframe
                  src={video.video_url.includes('BV')
                    ? `https://player.bilibili.com/player.html?bvid=${video.video_url.match(/BV[A-Za-z0-9]+/)?.[0]}&autoplay=0`
                    : video.video_url
                  }
                  className="absolute inset-0 w-full h-full border-0"
                  allowFullScreen
                />
              ) : video.video_url.startsWith('http') ? (
                <video
                  className="absolute inset-0 w-full h-full object-contain bg-black"
                  controls
                  preload="metadata"
                  poster={video.cover_url ? assetUrl(video.cover_url) : undefined}
                >
                  <source src={video.video_url} type="video/mp4" />
                  你的浏览器不支持视频播放
                </video>
              ) : (
                <video
                  className="absolute inset-0 w-full h-full object-contain bg-black"
                  controls
                  preload="metadata"
                  poster={video.cover_url ? assetUrl(video.cover_url) : undefined}
                >
                  <source src={assetUrl(video.video_url)} type="video/mp4" />
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
              {video.title}
            </h1>

            {/* 元信息 */}
            <div className="flex items-center gap-6 text-sm text-text2 mb-6">
              <span className="flex items-center gap-1.5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                {formatNumber(video.views)} 次播放
              </span>
              {video.duration > 0 && (
                <span className="font-mono">{formatDuration(video.duration)}</span>
              )}
              <span className="font-mono">{formatDate(video.created_at)}</span>
            </div>

            {/* 标签 */}
            {video.tags.length > 0 && (
              <div className="flex gap-2 flex-wrap mb-6">
                {video.tags.map(tag => (
                  <span key={tag} className="tag">{tag}</span>
                ))}
              </div>
            )}

            {/* 描述 */}
            {video.description && (
              <div className="text-text2 leading-relaxed whitespace-pre-wrap border-l-2 border-border pl-4">
                {video.description}
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

              <CommentForm videoId={videoId} onSubmitted={fetchData} />

              {/* 评论列表 */}
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
