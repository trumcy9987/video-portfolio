'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();

      if (data.success) {
        router.push('/admin');
      } else {
        setError(data.error || '登录失败');
      }
    } catch {
      setError('网络错误');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 relative">
      {/* 装饰 */}
      <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-accent/3 rounded-full blur-3xl" />

      <div className="w-full max-w-sm relative">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="w-12 h-12 border border-accent flex items-center justify-center text-accent font-display text-xl font-bold mx-auto mb-4">
            影
          </div>
          <h1 className="font-display text-2xl">后台管理</h1>
          <p className="text-text3 text-sm mt-2 font-mono">ADMIN PANEL</p>
        </div>

        {/* 表单 */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-text2 mb-1.5 block font-mono tracking-wider">账号</label>
            <input
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="admin"
              required
              className="w-full bg-surface border border-border rounded px-4 py-3 text-sm text-text1 placeholder:text-text3 focus:border-accent/40 transition-colors"
            />
          </div>
          <div>
            <label className="text-xs text-text2 mb-1.5 block font-mono tracking-wider">密码</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full bg-surface border border-border rounded px-4 py-3 text-sm text-text1 placeholder:text-text3 focus:border-accent/40 transition-colors"
            />
          </div>

          {error && (
            <p className="text-red text-sm">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-accent text-bg font-medium text-sm rounded hover:bg-accent-2 transition-colors disabled:opacity-50"
          >
            {loading ? '登录中...' : '登 录'}
          </button>
        </form>

        <div className="text-center mt-8">
          <a href="/" className="text-text3 text-xs hover:text-text2 transition-colors">← 返回首页</a>
        </div>
      </div>
    </div>
  );
}