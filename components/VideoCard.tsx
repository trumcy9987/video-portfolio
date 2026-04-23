'use client';

import { useState } from 'react';
import Link from 'next/link';
import { formatDate, formatNumber, formatDuration, assetUrl } from '@/lib/utils';

interface VideoCardProps {
  video: {
    id: string;
    title: string;
    cover_url: string;
    duration: number;
    views: number;
    tags: string[];
  };
  index: number;
  featured?: boolean;
}

export default function VideoCard({ video, index, featured = false }: VideoCardProps) {
  const [loaded, setLoaded] = useState(false);
  const coverUrl = video.cover_url || '';

  return (
    <Link
      href={`/video/${video.id}`}
      className={`group block relative rounded overflow-hidden card-glow transition-all duration-300 ${
        featured ? 'col-span-2 row-span-2' : ''
      }`}
      style={{ animationDelay: `${index * 80}ms` }}
    >
      {/* 16:9 容器 */}
      <div className="relative w-full pt-[56.25%] bg-surface overflow-hidden">
        {coverUrl ? (
          <img
            src={assetUrl(coverUrl)}
            alt={video.title}
            className={`absolute inset-0 w-full h-full object-cover transition-all duration-700 group-hover:scale-105 ${
              loaded ? 'opacity-100' : 'opacity-0'
            }`}
            onLoad={() => setLoaded(true)}
          />
        ) : null}

        {/* 默认占位 */}
        {!coverUrl && (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-surface to-muted">
            <span className="text-text3 font-display text-2xl">{video.title[0]}</span>
          </div>
        )}

        {/* 渐变遮罩 */}
        <div className="absolute inset-0 bg-gradient-to-t from-bg/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

        {/* 播放按钮 */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
          <div className="w-14 h-14 rounded-full bg-accent/90 backdrop-blur-sm flex items-center justify-center play-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M8 5v14l11-7z" fill="#0A0A0C" />
            </svg>
          </div>
        </div>

        {/* 时长标签 */}
        {video.duration > 0 && (
          <div className="absolute bottom-3 right-3 px-2 py-0.5 bg-bg/80 backdrop-blur-sm rounded text-xs font-mono text-text2">
            {formatDuration(video.duration)}
          </div>
        )}

        {/* 播放量 */}
        <div className="absolute bottom-3 left-3 text-xs font-mono text-text3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          {formatNumber(video.views)} 次播放
        </div>
      </div>

      {/* 标题区域 */}
      <div className="p-4 bg-surface">
        <h3 className={`font-display leading-snug line-clamp-2 group-hover:text-accent transition-colors duration-300 ${
          featured ? 'text-xl lg:text-2xl' : 'text-base'
        }`}>
          {video.title}
        </h3>
        {video.tags.length > 0 && (
          <div className="flex gap-2 mt-3 flex-wrap">
            {video.tags.slice(0, 3).map(tag => (
              <span key={tag} className="tag">{tag}</span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
