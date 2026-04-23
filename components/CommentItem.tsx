'use client';

import { formatDate } from '@/lib/utils';

interface CommentItemProps {
  comment: {
    id: string;
    content: string;
    nickname: string;
    contact: string;
    created_at: string;
  };
}

export default function CommentItem({ comment }: CommentItemProps) {
  const initial = (comment.nickname || '匿')[0].toUpperCase();

  return (
    <div className="flex gap-4 py-5 border-b border-border/50 last:border-0">
      {/* 头像 */}
      <div className="w-9 h-9 rounded-full bg-accent/10 border border-accent/30 flex items-center justify-center shrink-0 text-accent text-sm font-display">
        {initial}
      </div>

      {/* 内容 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 mb-1.5">
          <span className="text-sm font-medium text-text1">{comment.nickname || '匿名访客'}</span>
          <span className="text-xs text-text3 font-mono">{formatDate(comment.created_at)}</span>
        </div>
        <p className="text-sm text-text2 leading-relaxed whitespace-pre-wrap break-words">
          {comment.content}
        </p>
        {comment.contact && (
          <div className="mt-2 flex items-center gap-1.5 text-xs text-text3">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="M22 4L12 13 2 4" />
            </svg>
            {comment.contact}
          </div>
        )}
      </div>
    </div>
  );
}