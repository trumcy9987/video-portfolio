import { NextRequest, NextResponse } from 'next/server';
import { dbAll, dbRun, dbGet } from '@/lib/db';
import { getAdmin } from '@/lib/auth';

// GET /api/admin/comments
export async function GET(_req: NextRequest) {
  try {
    const admin = await getAdmin(_req as unknown as Request);
    if (!admin) return NextResponse.json({ error: '未授权' }, { status: 401 });

    const comments = await dbAll(`
      SELECT c.*, v.title as video_title, v.id as video_id
      FROM comments c
      LEFT JOIN videos v ON c.video_id = v.id
      ORDER BY c.created_at DESC
    `);

    return NextResponse.json({ comments });
  } catch {
    return NextResponse.json({ error: '获取失败' }, { status: 500 });
  }
}

// DELETE /api/admin/comments
export async function DELETE(req: Request) {
  try {
    const admin = await getAdmin(req);
    if (!admin) return NextResponse.json({ error: '未授权' }, { status: 401 });

    const { commentId } = await req.json();
    if (!commentId) return NextResponse.json({ error: '缺少评论ID' }, { status: 400 });

    const comment = await dbGet('SELECT id FROM comments WHERE id = ?', [commentId]);
    if (!comment) return NextResponse.json({ error: '评论不存在' }, { status: 404 });

    await dbRun('DELETE FROM comments WHERE id = ?', [commentId]);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: '删除失败' }, { status: 500 });
  }
}
