import { NextRequest, NextResponse } from 'next/server';
import { dbAll, dbGet, dbRun } from '@/lib/db';
import { uploadToB2, deleteFromB2, extractKey, getSignedUrlForFile } from '@/lib/b2';
import { getAdmin } from '@/lib/auth';

/**
 * 规范化资源 URL：
 * - 完整 URL（外部链接）：直接返回
 * - B2 proxy 路径（/api/proxy/videos/xxx.mp4）：直接返回
 * - 旧格式（videos/xxx.mp4 或 /videos/xxx.mp4）：补上 /api/proxy/ 前缀
 * - 其他相对路径：补上 /api/proxy/ 前缀
 */
function normalizeUrl(url: string | null | undefined): string {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  if (url.startsWith('/api/proxy/')) return url;
  if (url.startsWith('/')) return `/api/proxy${url}`;
  return `/api/proxy/${url}`;
}

// GET /api/videos — 获取视频列表
export async function GET(_req: NextRequest) {
  try {
    const videos = await dbAll(`
      SELECT id, title, description, video_url, cover_url, duration, views, tags, featured, created_at
      FROM videos ORDER BY featured DESC, created_at DESC
    `);

    const formatted = videos.map((v: any) => ({
      ...v,
      video_url: normalizeUrl(v.video_url),
      cover_url: normalizeUrl(v.cover_url),
      tags: JSON.parse(v.tags || '[]'),
      featured: !!v.featured,
    }));

    return NextResponse.json({ videos: formatted });
  } catch (err: any) {
    console.error('[GET /api/videos] Error:', err.message, err.stack);
    return NextResponse.json({ error: '获取视频列表失败', detail: err.message }, { status: 500 });
  }
}

// POST /api/videos — 上传新视频
export async function POST(req: NextRequest) {
  try {
    const admin = await getAdmin(req as unknown as Request);
    if (!admin) return NextResponse.json({ error: '未授权' }, { status: 401 });

    const formData = await req.formData();
    const title = (formData.get('title') as string)?.trim();
    const description = (formData.get('description') as string) || '';
    const tags = (formData.get('tags') as string) || '[]';
    const duration = parseInt(formData.get('duration') as string) || 0;
    const featured = formData.get('featured') === '1';

    // 前端直传 B2 后传入的 B2 key
    const b2VideoKey = (formData.get('presigned_video_key') as string)?.trim() || '';
    const b2CoverKey = (formData.get('presigned_cover_key') as string)?.trim() || '';
    // 外部链接
    const externalVideoUrl = (formData.get('external_video_url') as string)?.trim() || '';
    const externalCoverUrl = (formData.get('external_cover_url') as string)?.trim() || '';
    // 上传文件
    const videoFile = formData.get('video') as File | null;
    const coverFile = formData.get('cover') as File | null;

    if (!title) return NextResponse.json({ error: '标题不能为空' }, { status: 400 });

    // 视频来源优先级：B2 key > 外部链接 > 上传文件
    let videoUrl = b2VideoKey || externalVideoUrl || '';
    if (!videoUrl && videoFile && videoFile.size > 0) {
      const key = await uploadToB2(`videos/${Date.now()}-${videoFile.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`, videoFile, videoFile.type);
      videoUrl = key;
    }

    // 封面来源优先级：B2 key > 外部链接 > 上传文件
    let coverUrl = b2CoverKey || externalCoverUrl || '';
    if (!coverUrl && coverFile && coverFile.size > 0) {
      const key = await uploadToB2(`covers/${Date.now()}-${coverFile.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`, coverFile, coverFile.type);
      coverUrl = key;
    }

    if (!videoUrl) {
      return NextResponse.json({ error: '请填写视频链接（支持哔哩哔哩、腾讯视频等外部链接）' }, { status: 400 });
    }

    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 10);

    await dbRun(
      `INSERT INTO videos (id, title, description, video_url, cover_url, duration, views, tags, featured)
       VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)`,
      [id, title, description, videoUrl, coverUrl, duration, tags, featured ? 1 : 0]
    );

    return NextResponse.json({ success: true, id, videoUrl: normalizeUrl(videoUrl), coverUrl: normalizeUrl(coverUrl) });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message || '上传失败' }, { status: 500 });
  }
}

// PUT /api/videos — 更新视频
export async function PUT(req: NextRequest) {
  try {
    const admin = await getAdmin(req as unknown as Request);
    if (!admin) return NextResponse.json({ error: '未授权' }, { status: 401 });

    const formData = await req.formData();
    const id = formData.get('id') as string;
    const title = (formData.get('title') as string)?.trim();
    const description = (formData.get('description') as string) || '';
    const tags = (formData.get('tags') as string) || '[]';
    const featured = formData.get('featured') === '1';

    if (!id) return NextResponse.json({ error: '缺少视频ID' }, { status: 400 });

    const oldVideo: any = await dbGet('SELECT video_url, cover_url FROM videos WHERE id = ?', [id]);

    await dbRun(
      `UPDATE videos SET title = ?, description = ?, tags = ?, featured = ? WHERE id = ?`,
      [title, description, tags, featured ? 1 : 0, id]
    );

    // 新封面上传
    const coverFile = formData.get('cover') as File | null;
    if (coverFile && coverFile.size > 0) {
      if (oldVideo?.cover_url && !oldVideo.cover_url.startsWith('http')) {
        try { await deleteFromB2(extractKey(oldVideo.cover_url)); } catch {}
      }
      const key = await uploadToB2(`covers/${Date.now()}-${coverFile.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`, coverFile, coverFile.type);
      await dbRun('UPDATE videos SET cover_url = ? WHERE id = ?', [key, id]);
    }

    // 新视频上传
    const videoFile = formData.get('video') as File | null;
    if (videoFile && videoFile.size > 0) {
      if (oldVideo?.video_url && !oldVideo.video_url.startsWith('http')) {
        try { await deleteFromB2(extractKey(oldVideo.video_url)); } catch {}
      }
      const key = await uploadToB2(`videos/${Date.now()}-${videoFile.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`, videoFile, videoFile.type);
      await dbRun('UPDATE videos SET video_url = ? WHERE id = ?', [key, id]);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message || '更新失败' }, { status: 500 });
  }
}

// PATCH /api/videos — 部分更新
export async function PATCH(req: NextRequest) {
  try {
    const admin = await getAdmin(req as unknown as Request);
    if (!admin) return NextResponse.json({ error: '未授权' }, { status: 401 });

    const { id, featured } = await req.json();
    if (!id) return NextResponse.json({ error: '缺少视频ID' }, { status: 400 });

    if (typeof featured === 'boolean') {
      await dbRun('UPDATE videos SET featured = ? WHERE id = ?', [featured ? 1 : 0, id]);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: '更新失败' }, { status: 500 });
  }
}

// DELETE /api/videos
export async function DELETE(req: Request) {
  try {
    const admin = await getAdmin(req);
    if (!admin) return NextResponse.json({ error: '未授权' }, { status: 401 });

    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: '缺少视频ID' }, { status: 400 });

    const video: any = await dbGet('SELECT video_url, cover_url FROM videos WHERE id = ?', [id]);

    // 删除 B2 文件
    if (video) {
      if (video.video_url && !video.video_url.startsWith('http')) {
        try { await deleteFromB2(extractKey(video.video_url)); } catch {}
      }
      if (video.cover_url && !video.cover_url.startsWith('http')) {
        try { await deleteFromB2(extractKey(video.cover_url)); } catch {}
      }
    }

    await dbRun('DELETE FROM videos WHERE id = ?', [id]);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: '删除失败' }, { status: 500 });
  }
}
