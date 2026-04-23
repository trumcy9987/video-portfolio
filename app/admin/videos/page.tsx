'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { formatDate, formatNumber, formatDuration, assetUrl } from '@/lib/utils';

interface Video {
  id: string;
  title: string;
  cover_url: string;
  duration: number;
  views: number;
  tags: string[];
  featured: boolean;
  created_at: string;
}

export default function VideosPage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const router = useRouter();

  const fetchVideos = () => {
    fetch('/api/videos', { credentials: 'include' })
      .then(r => r.json())
      .then(d => { setVideos(d.videos || []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { fetchVideos(); }, []);

  const handleDelete = async () => {
    if (!deleteId) return;
    await fetch('/api/videos', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: deleteId }),
      credentials: 'include',
    });
    setDeleteId(null);
    fetchVideos();
  };

  const handleToggleFeatured = async (id: string, current: boolean) => {
    await fetch('/api/videos', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, featured: !current }),
      credentials: 'include',
    });
    fetchVideos();
  };

  const filtered = videos.filter(v =>
    v.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <h2 className="font-display text-2xl">视频管理</h2>
        <Link href="/admin/upload" className="px-5 py-2.5 bg-accent text-bg text-sm font-medium rounded hover:bg-accent-2 transition-colors">
          + 上传视频
        </Link>
      </div>

      {/* 搜索 */}
      <div className="mb-5">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="搜索视频标题..."
          className="w-full sm:w-80 bg-surface border border-border rounded px-4 py-2.5 text-sm text-text1 placeholder:text-text3 focus:border-accent/40 transition-colors"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-text3">暂无视频</p>
          <Link href="/admin/upload" className="text-accent text-sm mt-2 inline-block hover:underline">上传第一个视频 →</Link>
        </div>
      ) : (
        <div className="bg-surface border border-border rounded overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border text-left text-xs text-text3 font-mono">
                <th className="px-4 py-3 w-24">封面</th>
                <th className="px-4 py-3">标题</th>
                <th className="px-4 py-3 w-20">时长</th>
                <th className="px-4 py-3 w-20">播放量</th>
                <th className="px-4 py-3 w-16">精选</th>
                <th className="px-4 py-3 w-28">发布时间</th>
                <th className="px-4 py-3 w-36">操作</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((video, i) => (
                <tr key={video.id} className={`border-b border-border/30 hover:bg-muted/20 transition-colors ${i % 2 === 0 ? '' : 'bg-muted/5'}`}>
                  <td className="px-4 py-3">
                    {video.cover_url ? (
                      <img src={assetUrl(video.cover_url)} alt="" className="w-16 h-10 object-cover rounded" />
                    ) : (
                      <div className="w-16 h-10 bg-muted rounded flex items-center justify-center text-xs text-text3">无图</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium truncate max-w-xs">{video.title}</p>
                    <p className="text-xs text-text3 mt-0.5">{video.tags.join(' · ')}</p>
                  </td>
                  <td className="px-4 py-3 font-mono text-sm text-text2">
                    {video.duration > 0 ? formatDuration(video.duration) : '—'}
                  </td>
                  <td className="px-4 py-3 font-mono text-sm text-text2">
                    {formatNumber(video.views)}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleToggleFeatured(video.id, video.featured); }}
                      className={`w-12 h-6 rounded-full relative transition-all duration-200 cursor-pointer ${
                        video.featured
                          ? 'bg-accent'
                          : 'bg-gray-800'
                      }`}
                      title={video.featured ? '点击关闭精选' : '点击开启精选'}
                    >
                      <span className={`absolute top-1 w-4 h-4 rounded-full shadow transition-all duration-200 ${
                        video.featured
                          ? 'left-7 bg-white'
                          : 'left-1 bg-accent'
                      }`} />
                    </button>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-text3">
                    {formatDate(video.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <a href={`/video/${video.id}`} target="_blank" className="text-xs text-text3 hover:text-accent transition-colors">预览</a>
                      <a href={`/admin/edit/${video.id}`} className="text-xs text-text3 hover:text-accent transition-colors">编辑</a>
                      <button onClick={() => setDeleteId(video.id)} className="text-xs text-text3 hover:text-red transition-colors">删除</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 删除确认 */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-surface border border-border rounded p-6 w-full max-w-sm mx-4 animate-scale-in">
            <h3 className="font-display text-lg mb-2">确认删除</h3>
            <p className="text-text2 text-sm mb-6">删除后不可恢复，确定要删除这个视频吗？</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 py-2 border border-border rounded text-sm text-text2 hover:border-accent/50 transition-colors">
                取消
              </button>
              <button onClick={handleDelete} className="flex-1 py-2 bg-red text-white rounded text-sm hover:opacity-80 transition-opacity">
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
