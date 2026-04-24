'use client';

import { useState, useEffect } from 'react';
import NavBar from '@/components/NavBar';
import VideoCard from '@/components/VideoCard';
import { assetUrl } from '@/lib/utils';

interface Video {
  id: string;
  title: string;
  cover_url: string;
  duration: number;
  views: number;
  tags: string[];
  featured: boolean;
}

interface Settings {
  site_name: string;
  site_logo: string;
  hero_background: string;
}

export default function HomePage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [settings, setSettings] = useState<Settings>({ site_name: 'FILM PORTFOLIO', site_logo: '', hero_background: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/videos').then(r => r.json()),
      fetch('/api/admin/settings').then(r => r.json())
    ])
      .then(([videoData, settingsData]) => {
        setVideos((videoData.videos || []).filter((v: Video) => v.featured));
        setSettings(settingsData.settings || {});
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const scrollToWorks = () => {
    document.getElementById('works')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <main className="min-h-screen">
      <NavBar />

      {/* 英雄区 */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        {/* 背景层 */}
        <div className="absolute inset-0 bg-gradient-to-br from-bg via-surface to-muted" />
        {settings.hero_background && (
          <>
            <img
              src={assetUrl(settings.hero_background)}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
              loading="eager"
              fetchPriority="high"
            />
            <div className="absolute inset-0 bg-bg/70" />
          </>
        )}
        <div className="hero-gradient absolute inset-0" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-accent-2/5 rounded-full blur-3xl" />

        <div className="relative z-10 text-center px-6">
          <p className="opacity-0 animate-fade-in-up text-text3 font-mono text-xs tracking-[0.3em] uppercase mb-6">Personal Film Portfolio</p>
          <h1 className="opacity-0 animate-fade-in-up delay-200 font-display text-5xl sm:text-6xl lg:text-7xl font-bold leading-tight mb-6">
            用镜头<br />
            <span className="text-gradient">讲述故事</span>
          </h1>
          <p className="opacity-0 animate-fade-in-up delay-400 text-text2 text-base sm:text-lg max-w-lg mx-auto mb-10">
            每一帧画面，都是一段独特的记忆。<br className="hidden sm:block" />
            这里收录了我的视觉创作与思考。
          </p>
          <div className="opacity-0 animate-fade-in-up delay-600">
            <button
              onClick={scrollToWorks}
              className="inline-flex items-center gap-2 px-8 py-3 border border-accent/50 text-accent text-sm tracking-wider hover:bg-accent hover:text-bg transition-all duration-300 rounded"
            >
              浏览作品
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 5v14M5 12l7 7 7-7" />
              </svg>
            </button>
          </div>
        </div>
      </section>

      {/* 作品区 */}
      <div id="works" className="max-w-7xl mx-auto px-6 lg:px-20 pt-24 pb-20">
        <div className="flex items-center gap-4 mb-12">
          <h2 className="font-display text-2xl">精选作品</h2>
          <div className="flex-1 h-px bg-border" />
          <span className="text-text3 text-xs font-mono">FEATURED WORKS</span>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
          </div>
        ) : videos.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {videos.map((video, i) => (
              <div key={video.id} className="opacity-0 animate-fade-in-up" style={{ animationDelay: `${i * 80}ms` }}>
                <VideoCard video={video} index={i} />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <p className="text-text3 font-display text-xl">暂无作品，敬请期待</p>
            <p className="text-text3/50 text-sm mt-3">作品正在整理中...</p>
          </div>
        )}
      </div>

      {/* 页脚 */}
      <footer className="border-t border-border">
        <div className="max-w-7xl mx-auto px-6 lg:px-20 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-text3 text-xs font-mono">© {new Date().getFullYear()} Film Portfolio. All rights reserved.</span>
          <span className="text-text3 text-xs">Powered by Next.js</span>
        </div>
      </footer>
    </main>
  );
}
