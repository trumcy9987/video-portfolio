import NavBar from '@/components/NavBar';
import HomeClient from '@/components/HomeClient';
import { dbAll, dbGet } from '@/lib/db';
import { extractKey } from '@/lib/b2';
import { assetUrl } from '@/lib/utils';

export const revalidate = 60;

export default async function HomePage() {
  // 服务端直接查数据库，获取精选视频
  const rawVideos: any[] = await dbAll(
    'SELECT * FROM videos WHERE featured = 1 ORDER BY created_at DESC'
  );

  const videos = rawVideos.map(v => ({
    id: v.id,
    title: v.title,
    cover_url: assetUrl(v.cover_url),
    duration: v.duration || 0,
    views: v.views || 0,
    tags: JSON.parse(v.tags || '[]'),
    featured: true,
  }));

  // 查询 settings
  const siteName = await dbGet<{ value: string }>("SELECT value FROM settings WHERE key = 'site_name'");
  const siteLogo = await dbGet<{ value: string }>("SELECT value FROM settings WHERE key = 'site_logo'");
  const heroBg = await dbGet<{ value: string }>("SELECT value FROM settings WHERE key = 'hero_background'");

  const settings = {
    site_name: siteName?.value || 'FILM PORTFOLIO',
    site_logo: siteLogo?.value ? assetUrl(extractKey(siteLogo.value)) : '',
    hero_background: heroBg?.value ? assetUrl(extractKey(heroBg.value)) : '',
  };

  return (
    <main className="min-h-screen">
      <NavBar />
      <HomeClient videos={videos} settings={settings} />
    </main>
  );
}
