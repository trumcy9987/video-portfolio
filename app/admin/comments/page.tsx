'use client';

import { useState, useEffect } from 'react';

interface Comment {
  id: string;
  video_id: string;
  content: string;
  nickname: string;
  contact: string;
  created_at: string;
  video_title: string | null;
}

export default function CommentsPage() {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    fetchComments();
  }, []);

  const fetchComments = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/comments', { credentials: 'include' });
      const data = await res.json();
      setComments(data.comments || []);
    } catch {
      setComments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!confirm('确定要删除这条评论吗？')) return;

    setDeleting(commentId);
    try {
      const res = await fetch('/api/admin/comments', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commentId }),
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success) {
        setComments(prev => prev.filter(c => c.id !== commentId));
      } else {
        alert(data.error || '删除失败');
      }
    } catch {
      alert('网络错误');
    } finally {
      setDeleting(null);
    }
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-8">
        <h2 className="font-display text-2xl">评论管理</h2>
        <span className="text-sm text-text3 font-mono">共 {comments.length} 条</span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-20 text-text3">
          <p>暂无评论</p>
        </div>
      ) : (
        <div className="space-y-4">
          {comments.map(comment => (
            <div
              key={comment.id}
              className="bg-surface border border-border rounded-lg p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  {/* 视频标题 */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs text-text3 font-mono">视频：</span>
                    {comment.video_title ? (
                      <a
                        href={`/video/${comment.video_id}`}
                        className="text-sm text-accent hover:underline truncate"
                      >
                        {comment.video_title}
                      </a>
                    ) : (
                      <span className="text-sm text-text3">（视频已删除）</span>
                    )}
                  </div>

                  {/* 评论内容 */}
                  <p className="text-sm text-text1 leading-relaxed whitespace-pre-wrap break-words">
                    {comment.content}
                  </p>

                  {/* 评论信息 */}
                  <div className="flex items-center gap-4 mt-3 text-xs text-text3">
                    <span>
                      昵称：{comment.nickname || '匿名'}
                    </span>
                    {comment.contact && (
                      <span>
                        联系方式：{comment.contact}
                      </span>
                    )}
                    <span>
                      {formatDate(comment.created_at)}
                    </span>
                  </div>
                </div>

                {/* 删除按钮 */}
                <button
                  onClick={() => handleDelete(comment.id)}
                  disabled={deleting === comment.id}
                  className="shrink-0 px-3 py-1.5 bg-red/10 text-red text-xs rounded hover:bg-red hover:text-white transition-colors disabled:opacity-50"
                >
                  {deleting === comment.id ? '删除中...' : '删除'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
