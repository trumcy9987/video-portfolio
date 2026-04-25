import { NextRequest, NextResponse } from 'next/server';
import { dbRun, dbGet } from '@/lib/db';
import { generateId } from '@/lib/utils';

// POST /api/videos/[id]/view — 仅增加播放计数
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const video = await dbGet('SELECT id FROM videos WHERE id = ?', [id]);
    if (!video) {
      return NextResponse.json({ error: '视频不存在' }, { status: 404 });
    }

    await dbRun('UPDATE videos SET views = views + 1 WHERE id = ?', [id]);

    // Play log is best-effort: failure should not affect view count
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '';
    try {
      await dbRun(
        'INSERT INTO play_logs (id, video_id, ip) VALUES (?, ?, ?)',
        [generateId(), id, ip]
      );
    } catch (logErr) {
      console.error('[play_logs] insert failed:', logErr);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[view] error:', err);
    return NextResponse.json({ error: '操作失败' }, { status: 500 });
  }
}
