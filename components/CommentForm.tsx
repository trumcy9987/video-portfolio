'use client';

import { useState, useRef, useEffect } from 'react';

interface CommentFormProps {
  videoId: string;
  onSubmitted: () => void;
}

export default function CommentForm({ videoId, onSubmitted }: CommentFormProps) {
  const [content, setContent] = useState('');
  const [nickname, setNickname] = useState('');
  const [contact, setContact] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = async () => {
    if (!content.trim()) {
      setMessage('请输入留言内容');
      return;
    }
    if (content.length > 1000) {
      setMessage('留言不能超过1000字');
      return;
    }

    setSubmitting(true);
    setMessage('');

    try {
      const res = await fetch(`/api/videos/${videoId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: content.trim(),
          nickname: nickname.trim(),
          contact: contact.trim(),
        }),
      });
      const data = await res.json();

      if (data.success) {
        setContent('');
        setNickname('');
        setContact('');
        setMessage('留言成功！');
        onSubmitted();
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage(data.error || '提交失败');
      }
    } catch {
      setMessage('网络错误，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-surface border border-border rounded p-6">
      <h4 className="font-display text-lg mb-5 flex items-center gap-2">
        <span className="w-1 h-5 bg-accent inline-block" />
        发表留言
      </h4>

      {/* 留言内容 */}
      <textarea
        ref={textareaRef}
        value={content}
        onChange={e => setContent(e.target.value)}
        placeholder="分享你的看法..."
        maxLength={1000}
        rows={4}
        className="w-full bg-muted/50 border border-border rounded p-4 text-sm text-text1 placeholder:text-text3 resize-none focus:border-accent/40 transition-colors"
      />
      <div className="text-right text-xs text-text3 mt-1 mb-4">{content.length}/1000</div>

      {/* 称呼和联系方式 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
        <input
          value={nickname}
          onChange={e => setNickname(e.target.value)}
          placeholder="你的称呼（选填）"
          maxLength={50}
          className="bg-muted/50 border border-border rounded px-4 py-2.5 text-sm text-text1 placeholder:text-text3 focus:border-accent/40 transition-colors"
        />
        <input
          value={contact}
          onChange={e => setContact(e.target.value)}
          placeholder="联系方式（选填）"
          maxLength={100}
          className="bg-muted/50 border border-border rounded px-4 py-2.5 text-sm text-text1 placeholder:text-text3 focus:border-accent/40 transition-colors"
        />
      </div>

      {/* 提交 */}
      <div className="flex items-center justify-between">
        <span className={`text-sm transition-colors duration-300 ${
          message.includes('成功') ? 'text-green' : 'text-red'
        }`}>
          {message}
        </span>
        <button
          onClick={handleSubmit}
          disabled={submitting || !content.trim()}
          className="px-6 py-2.5 bg-accent text-bg text-sm font-medium rounded hover:bg-accent-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {submitting ? '提交中...' : '发布留言'}
        </button>
      </div>
    </div>
  );
}