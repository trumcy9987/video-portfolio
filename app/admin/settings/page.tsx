'use client';

import { useState, useEffect } from 'react';
import { assetUrl } from '@/lib/utils';

interface Settings {
  site_name: string;
  site_logo: string;
  hero_background: string;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({ site_name: 'FILM PORTFOLIO', site_logo: '', hero_background: '' });
  const [siteName, setSiteName] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [bgFile, setBgFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch('/api/admin/settings', { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
        setSettings(d.settings || {});
        setSiteName(d.settings?.site_name || '');
      });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage('');

    const formData = new FormData();
    if (siteName.trim()) formData.append('site_name', siteName.trim());
    if (logoFile) formData.append('site_logo', logoFile);
    if (bgFile) formData.append('hero_background', bgFile);

    try {
      const res = await fetch('/api/admin/settings', { method: 'POST', body: formData, credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setMessage('设置已保存');
        const fresh = await fetch('/api/admin/settings', { credentials: 'include' }).then(r => r.json());
        setSettings(fresh.settings || {});
        setLogoFile(null);
        setBgFile(null);
      } else {
        setMessage(data.error || '保存失败');
      }
    } catch {
      setMessage('网络错误');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (key: 'site_logo' | 'hero_background') => {
    if (!confirm('确定删除吗？')) return;
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key }),
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success) {
        const fresh = await fetch('/api/admin/settings', { credentials: 'include' }).then(r => r.json());
        setSettings(fresh.settings || {});
      }
    } catch {}
  };

  return (
    <div className="max-w-3xl">
      <h2 className="font-display text-2xl mb-8">网站设置</h2>

      <div className="space-y-8">
        {/* 网站名称 */}
        <div>
          <label className="text-sm text-text2 mb-2 block font-mono tracking-wider">网站名称</label>
          <input
            value={siteName}
            onChange={e => setSiteName(e.target.value)}
            placeholder="FILM PORTFOLIO"
            maxLength={50}
            className="w-full bg-surface border border-border rounded px-4 py-2.5 text-sm text-text1 placeholder:text-text3 focus:border-accent/40 transition-colors"
          />
        </div>

        {/* Logo */}
        <div>
          <label className="text-sm text-text2 mb-2 block font-mono tracking-wider">网站Logo</label>
          <div className="flex items-start gap-4">
            <div className="w-20 h-20 bg-surface border border-border rounded flex items-center justify-center overflow-hidden relative">
              {settings.site_logo ? (
                <>
                  <img src={assetUrl(settings.site_logo)} alt="Logo" className="w-full h-full object-contain" />
                  <button
                    onClick={() => handleDelete('site_logo')}
                    className="absolute top-1 right-1 w-5 h-5 bg-red/80 text-white text-xs rounded flex items-center justify-center hover:bg-red transition-colors"
                    title="删除"
                  >×</button>
                </>
              ) : (
                <span className="font-display text-3xl text-accent">影</span>
              )}
            </div>
            <div className="flex-1">
              <input
                type="file"
                accept="image/*"
                onChange={e => setLogoFile(e.target.files?.[0] || null)}
                className="hidden"
                id="logo-input"
              />
              <label htmlFor="logo-input" className="inline-block px-4 py-2 border border-border rounded text-sm text-text2 cursor-pointer hover:border-accent/50 transition-colors">
                {logoFile ? logoFile.name : '上传新Logo'}
              </label>
              <p className="text-text3 text-xs mt-2">建议尺寸：正方形，如 80x80 像素</p>
            </div>
          </div>
        </div>

        {/* 背景图 */}
        <div>
          <label className="text-sm text-text2 mb-2 block font-mono tracking-wider">首页背景图</label>
          <div className="flex items-start gap-4">
            <div className="w-40 h-24 bg-surface border border-border rounded overflow-hidden relative">
              {settings.hero_background ? (
                <>
                  <img src={assetUrl(settings.hero_background)} alt="背景" className="w-full h-full object-cover" />
                  <button
                    onClick={() => handleDelete('hero_background')}
                    className="absolute top-1 right-1 w-5 h-5 bg-red/80 text-white text-xs rounded flex items-center justify-center hover:bg-red transition-colors"
                    title="删除"
                  >×</button>
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-text3 text-xs">无背景图</div>
              )}
            </div>
            <div className="flex-1">
              <input
                type="file"
                accept="image/*"
                onChange={e => setBgFile(e.target.files?.[0] || null)}
                className="hidden"
                id="bg-input"
              />
              <label htmlFor="bg-input" className="inline-block px-4 py-2 border border-border rounded text-sm text-text2 cursor-pointer hover:border-accent/50 transition-colors">
                {bgFile ? bgFile.name : '上传背景图'}
              </label>
              <p className="text-text3 text-xs mt-2">建议尺寸：1920x1080 或更高，会自动添加半透明遮罩</p>
            </div>
          </div>
        </div>

        {/* 提交 */}
        {message && <p className={message.includes('已保存') ? 'text-green text-sm' : 'text-red text-sm'}>{message}</p>}
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-8 py-3 bg-accent text-bg font-medium rounded hover:bg-accent-2 transition-colors disabled:opacity-50"
        >
          {saving ? '保存中...' : '保存设置'}
        </button>
      </div>
    </div>
  );
}
