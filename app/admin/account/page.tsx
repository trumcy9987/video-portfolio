'use client';

import { useState } from 'react';

export default function AccountPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const handleSave = async () => {
    if (!username.trim() && !password && !confirmPwd) {
      setMessage('请至少修改一项');
      return;
    }
    if (password && password !== confirmPwd) {
      setMessage('两次密码不一致');
      return;
    }

    setSaving(true);
    setMessage('');

    try {
      const res = await fetch('/api/admin/account', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim() || '', password, confirm_password: confirmPwd }),
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success) {
        setMessage('账号设置已保存');
        setUsername('');
        setPassword('');
        setConfirmPwd('');
      } else {
        setMessage(data.error || '保存失败');
      }
    } catch {
      setMessage('网络错误');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl">
      <h2 className="font-display text-2xl mb-8">账号设置</h2>

      <div className="space-y-5">
        <div>
          <label className="text-sm text-text2 mb-2 block font-mono tracking-wider">修改管理员账号</label>
          <input
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="输入新用户名"
            maxLength={50}
            className="w-full bg-surface border border-border rounded px-4 py-2.5 text-sm text-text1 placeholder:text-text3 focus:border-accent/40 transition-colors"
          />
        </div>
        <div>
          <label className="text-sm text-text2 mb-2 block font-mono tracking-wider">输入新密码</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="输入新密码"
            className="w-full bg-surface border border-border rounded px-4 py-2.5 text-sm text-text1 placeholder:text-text3 focus:border-accent/40 transition-colors"
          />
        </div>
        <div>
          <label className="text-sm text-text2 mb-2 block font-mono tracking-wider">确认新密码</label>
          <input
            type="password"
            value={confirmPwd}
            onChange={e => setConfirmPwd(e.target.value)}
            placeholder="再次输入新密码"
            className="w-full bg-surface border border-border rounded px-4 py-2.5 text-sm text-text1 placeholder:text-text3 focus:border-accent/40 transition-colors"
          />
        </div>
        {message && <p className={message.includes('已保存') ? 'text-green text-sm' : 'text-red text-sm'}>{message}</p>}
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-8 py-3 bg-accent text-bg font-medium rounded hover:bg-accent-2 transition-colors disabled:opacity-50"
        >
          {saving ? '保存中...' : '保存账号设置'}
        </button>
      </div>
    </div>
  );
}
