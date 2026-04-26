'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { assetUrl } from '@/lib/utils';

interface Settings {
  site_name: string;
  site_logo: string;
}

// 模块级缓存 + 5分钟过期
let settingsCache: { data: Settings | null; timestamp: number } = { data: null, timestamp: 0 };
const CACHE_TTL = 5 * 60 * 1000; // 5分钟

export default function NavBar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [settings, setSettings] = useState<Settings>({ site_name: 'FILM PORTFOLIO', site_logo: '' });
  const [logoLoaded, setLogoLoaded] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    // 检查缓存是否有效
    const now = Date.now();
    if (settingsCache.data && (now - settingsCache.timestamp) < CACHE_TTL) {
      setSettings(settingsCache.data);
      return;
    }

    fetch('/api/admin/settings')
      .then(r => r.json())
      .then(d => {
        const s = d.settings || { site_name: 'FILM PORTFOLIO', site_logo: '' };
        settingsCache = { data: s, timestamp: now };
        setSettings(s);
      });
  }, []);

  // 解析名称：FILM PORTFOLIO → FILM + PORTFOLIO
  const nameParts = (settings.site_name || 'FILM PORTFOLIO').split(' ');
  const mainName = nameParts[0] || 'FILM';
  const subName = nameParts.slice(1).join(' ') || 'PORTFOLIO';

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
      scrolled ? 'bg-bg/90 backdrop-blur-md border-b border-border' : 'bg-transparent'
    }`}>
      <div className="max-w-7xl mx-auto px-6 lg:px-20 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-12 h-12 rounded-full flex items-center justify-center overflow-hidden transition-all duration-300">
            {settings.site_logo ? (
              <img 
                src={assetUrl(settings.site_logo)} 
                alt="Logo" 
                onLoad={() => setLogoLoaded(true)}
                onError={() => setLogoLoaded(false)}
                className={`w-full h-full object-contain group-hover:[filter:brightness(0)_invert(1)] transition-all duration-300 ${logoLoaded ? 'opacity-100' : 'opacity-0'}`} 
              />
            ) : (
              <span className="text-accent font-display text-sm font-bold group-hover:text-white transition-all duration-300">影</span>
            )}
          </div>
          <span className="font-display text-lg tracking-wider hidden sm:block">
            {mainName} <span className="text-text3 font-sans text-sm ml-1">{subName}</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-8">
          <Link href="/admin/login" className="text-xs text-text3 hover:text-text1 transition-colors font-mono">LOGIN</Link>
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="md:hidden w-8 h-8 flex flex-col items-center justify-center gap-1.5"
        >
          <span className={`w-5 h-px bg-text1 transition-all duration-300 ${menuOpen ? 'rotate-45 translate-y-[3.5px]' : ''}`} />
          <span className={`w-5 h-px bg-text1 transition-all duration-300 ${menuOpen ? '-rotate-45 -translate-y-[3.5px]' : ''}`} />
        </button>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="md:hidden bg-surface/95 backdrop-blur-md border-t border-border animate-slide-up">
          <div className="px-6 py-6 flex flex-col gap-4">
            <Link href="/admin/login" onClick={() => setMenuOpen(false)} className="text-text3 hover:text-text1 py-2">登录</Link>
          </div>
        </div>
      )}
    </nav>
  );
}
