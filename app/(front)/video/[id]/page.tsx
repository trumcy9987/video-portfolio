import { notFound } from 'next/navigation';
import VideoDetailClient from '@/components/VideoDetailClient';
import { dbGet, dbAll } from '@/lib/db';
import { assetUrl } from '@/lib/utils';

export const revalidate = 60;

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function VideoDetailPage({ params }: PageProps) {
  const { id } = await params;

  // 服务端直接查数据库
  const rawVideo: any = await dbGet('SELECT * FROM videos WHERE id = ?', [id]);

  if (!rawVideo) {
    notFound();
  }

  const video = {
    id: rawVideo.id,
    title: rawVideo.title,
    description: rawVideo.description || '',
    video_url: assetUrl(rawVideo.video_url),
    cover_url: assetUrl(rawVideo.cover_url),
    duration: rawVideo.duration || 0,
    views: rawVideo.views || 0,
    tags: JSON.parse(rawVideo.tags || '[]'),
    created_at: rawVideo.created_at,
  };

  const comments = await dbAll(
    'SELECT * FROM comments WHERE video_id = ? ORDER BY created_at DESC',
    [id]
  );

  return (
    <VideoDetailClient video={video} comments={comments} />
  );
}
