import { NextRequest, NextResponse } from 'next/server';
import { dbGet, dbRun, dbAll } from '@/lib/db';
import { getAdmin } from '@/lib/auth';

// GET /api/videos/[id]/comments
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const comments = await dbAll(
      'SELECT * FROM comments WHERE video_id = ? ORDER BY created_at DESC',
      [id]
    );
    return NextResponse.json({ comments });
  } catch {
    return NextResponse.json({ error: '获取评论失败' }, { status: 500 });
  }
}

// POST /api/videos/[id]/comments
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { content, nickname, contact } = await req.json();

    if (!content?.trim()) {
      return NextResponse.json({ error: '留言内容不能为空' }, { status: 400 });
    }
    if (content.length > 1000) {
      return NextResponse.json({ error: '留言内容不能超过1000字' }, { status: 400 });
    }

    const video = await dbGet('SELECT id FROM videos WHERE id = ?', [id]);
    if (!video) return NextResponse.json({ error: '视频不存在' }, { status: 404 });

    const commentId = Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
    const now = new Date().toISOString();

    await dbRun(
      `INSERT INTO comments (id, video_id, content, nickname, contact, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [commentId, id, content.trim(), (nickname || '').trim(), (contact || '').trim(), now]
    );

    const comment = await dbGet('SELECT * FROM comments WHERE id = ?', [commentId]);
    return NextResponse.json({ success: true, comment });
  } catch (err: any) {
    return NextResponse.json({ error: '提交评论失败' }, { status: 500 });
  }
}

// DELETE /api/videos/[id]/comments
export async function DELETE(
  req: NextRequest,
  _params: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getAdmin(req as unknown as Request);
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
