import { NextRequest, NextResponse } from 'next/server';
import { dbGet, dbRun, dbAll } from '@/lib/db';
import { generateId } from '@/lib/utils';

/**
 * 规范化资源 URL
 */
function normalizeUrl(url: string | null | undefined): string {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  if (url.startsWith('/api/proxy/')) return url;
  if (url.startsWith('/')) return `/api/proxy${url}`;
  return `/api/proxy/${url}`;
}

// GET /api/videos/[id] — 获取单个视频
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const video: any = await dbGet('SELECT * FROM videos WHERE id = ?', [id]);

    if (!video) {
      return NextResponse.json({ error: '视频不存在' }, { status: 404 });
    }

    // 播放量 +1 和播放日志（独立 try/catch，不影响视频数据返回）
    try {
      const referer = req.headers.get('referer') || '';
      if (!referer.includes('/admin')) {
        await dbRun('UPDATE videos SET views = views + 1 WHERE id = ?', [id]);
        video.views = (video.views || 0) + 1;
        const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '';
        await dbRun(
          'INSERT INTO play_logs (id, video_id, ip) VALUES (?, ?, ?)',
          [generateId(), id, ip]
        );
      }
    } catch (playErr: any) {
      console.error('[PLAY_LOG] Failed to record view:', playErr);
    }

    const comments = await dbAll(
      'SELECT * FROM comments WHERE video_id = ? ORDER BY created_at DESC',
      [id]
    );

    return NextResponse.json({
      video: {
        ...video,
        video_url: normalizeUrl(video.video_url),
        cover_url: normalizeUrl(video.cover_url),
        tags: JSON.parse(video.tags || '[]'),
        featured: !!video.featured,
      },
      comments,
    });
  } catch (err: any) {
    console.error('[API] /api/videos/[id] error:', err);
    return NextResponse.json({ error: '获取视频失败', detail: err.message }, { status: 500 });
  }
}
