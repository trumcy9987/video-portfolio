'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { formatDate, formatNumber, assetUrl } from '@/lib/utils';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalVideos: 0,
    totalViews: 0,
    totalComments: 0,
    todayViews: 0,
    weeklyStats: [] as { date: string; views: number }[],
    topVideos: [] as any[],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/stats', { credentials: 'include' })
      .then(r => r.json())
      .then(data => { setStats(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const cards = [
    { label: '视频总数', value: stats.totalVideos, icon: 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z', color: 'accent' },
    { label: '总播放量', value: formatNumber(stats.totalViews), icon: 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z M12 9a3 3 0 100 6 3 3 0 000-6z', color: 'accent-2' },
    { label: '留言总数', value: stats.totalComments, icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z', color: 'green' },
    { label: '今日播放', value: formatNumber(stats.todayViews), icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6', color: 'text2' },
  ];

  return (
    <div>
      <h2 className="font-display text-2xl mb-8">仪表盘</h2>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {loading ? (
          Array(4).fill(0).map((_, i) => (
            <div key={i} className="bg-surface border border-border rounded p-5 animate-pulse">
              <div className="h-10 bg-muted rounded mb-3" />
              <div className="h-4 bg-muted rounded w-1/2" />
            </div>
          ))
        ) : (
          cards.map((card, i) => (
            <div
              key={card.label}
              className="bg-surface border border-border rounded p-5 hover:border-accent/30 transition-colors"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <div className="flex items-start justify-between mb-3">
                <span className={`text-${card.color} opacity-60`}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d={card.icon} />
                  </svg>
                </span>
              </div>
              <p className="text-3xl font-display font-bold text-text1">{card.value}</p>
              <p className="text-xs text-text3 mt-1 font-mono">{card.label}</p>
            </div>
          ))
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 播放趋势 */}
        <div className="bg-surface border border-border rounded p-6">
          <h3 className="font-display text-base mb-5 flex items-center gap-2">
            <span className="w-1 h-4 bg-accent inline-block" />
            播放趋势
          </h3>
          {stats.weeklyStats.length > 0 ? (
            <div className="space-y-3">
              {stats.weeklyStats.map((s, i) => {
                const max = Math.max(...stats.weeklyStats.map(x => x.views), 1);
                const pct = Math.max((s.views / max) * 100, 4);
                return (
                  <div key={s.date} className="flex items-center gap-3">
                    <span className="text-xs text-text3 w-16 font-mono shrink-0">{formatDate(s.date, 'MM-DD')}</span>
                    <div className="flex-1 bg-muted rounded-full h-6 overflow-hidden">
                      <div
                        className="h-full bg-accent/60 rounded-full progress-bar"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs text-text2 w-10 text-right font-mono">{s.views}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-text3 text-sm text-center py-8">暂无数据</p>
          )}
        </div>

        {/* TOP 视频 */}
        <div className="bg-surface border border-border rounded p-6">
          <h3 className="font-display text-base mb-5 flex items-center gap-2">
            <span className="w-1 h-4 bg-accent-2 inline-block" />
            热门视频 TOP 10
          </h3>
          {stats.topVideos.length > 0 ? (
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {stats.topVideos.map((v: any, i: number) => (
                <div key={v.id} className="flex items-center gap-3 py-2 border-b border-border/30 last:border-0">
                  <span className="text-xs font-mono text-text3 w-5 shrink-0">{i + 1}</span>
                  {v.cover_url ? (
                    <img src={assetUrl(v.cover_url)} alt="" className="w-12 h-8 object-cover rounded" />
                  ) : (
                    <div className="w-12 h-8 bg-muted rounded flex items-center justify-center text-xs text-text3">无图</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{v.title}</p>
                    <p className="text-xs text-text3 font-mono">{formatNumber(v.views)} 播放 · {v.comment_count} 评论</p>
                  </div>
                  <a href={`/video/${v.id}`} target="_blank" className="text-text3 hover:text-accent text-xs shrink-0">
                    查看 →
                  </a>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-text3 text-sm text-center py-8">暂无数据</p>
          )}
        </div>
      </div>

      {/* 快捷入口 */}
      <div className="mt-6 flex gap-3 flex-wrap">
        <Link href="/admin/upload" className="px-5 py-2.5 bg-accent text-bg text-sm font-medium rounded hover:bg-accent-2 transition-colors">
          + 上传新视频
        </Link>
        <Link href="/admin/videos" className="px-5 py-2.5 border border-border text-text2 text-sm rounded hover:border-accent/50 hover:text-accent transition-colors">
          管理视频列表
        </Link>
      </div>
    </div>
  );
}