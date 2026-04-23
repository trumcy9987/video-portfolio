import { NextResponse } from 'next/server';
import { dbGet, dbAll } from '@/lib/db';
import { getAdmin } from '@/lib/auth';

// GET /api/admin/stats
export async function GET(req: Request) {
  try {
    const admin = await getAdmin(req);
    if (!admin) return NextResponse.json({ error: '未授权' }, { status: 401 });

    const totalVideos = ((await dbGet('SELECT COUNT(*) as c FROM videos')) as any)?.c || 0;
    const totalViews = ((await dbGet('SELECT COALESCE(SUM(views), 0) as c FROM videos')) as any)?.c || 0;
    const totalComments = ((await dbGet('SELECT COUNT(*) as c FROM comments')) as any)?.c || 0;

    // 今日播放量：按视频+日期去重
    const todayViews = ((await dbGet(`
      SELECT COUNT(DISTINCT video_id || '-' || DATE(created_at)) as c
      FROM play_logs WHERE DATE(created_at) = CURRENT_DATE
    `)) as any)?.c || 0;

    // 最近7天播放趋势（按 play_logs 分组）
    const weeklyRaw: any[] = await dbAll(`
      SELECT DATE(created_at) as date, COUNT(DISTINCT video_id) as views
      FROM play_logs
      WHERE created_at >= NOW() - INTERVAL '7 days'
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `);

    // 热门视频 TOP 10
    const topVideos: any[] = await dbAll(`
      SELECT v.id, v.title, v.cover_url, v.views, COUNT(c.id) as comment_count
      FROM videos v
      LEFT JOIN comments c ON v.id = c.video_id
      GROUP BY v.id
      ORDER BY v.views DESC
      LIMIT 10
    `);

    return NextResponse.json({
      totalVideos,
      totalViews,
      totalComments,
      todayViews,
      weeklyStats: weeklyRaw.map((r: any) => ({
        date: r.date,
        views: Number(r.views) || 0,
      })),
      topVideos,
    });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: '获取统计失败' }, { status: 500 });
  }
}
