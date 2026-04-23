import { NextRequest, NextResponse } from 'next/server';
import { getAdmin } from '@/lib/auth';
import { uploadToB2, getB2UploadUrl } from '@/lib/b2';

// GET /api/admin/upload-url
// 返回 B2 Native Upload URL + authToken，客户端直传 B2（绕过 Vercel 4.5MB 限制）
export async function GET(request: NextRequest) {
  try {
    const admin = await getAdmin(request as unknown as Request);
    if (!admin) return NextResponse.json({ error: '未授权' }, { status: 401 });

    const key = request.nextUrl.searchParams.get('key');
    if (!key) return NextResponse.json({ error: '缺少 key 参数' }, { status: 400 });
    if (!key.startsWith('videos/') && !key.startsWith('covers/') && !key.startsWith('settings/')) {
      return NextResponse.json({ error: '无效路径' }, { status: 403 });
    }

    // 获取 B2 Native 上传 URL（服务端用 Native API，不需要 AWS SDK 签名）
    const { uploadUrl, authToken } = await getB2UploadUrl();
    console.log('[B2] Upload URL ready for:', key);

    return NextResponse.json({ uploadUrl, authToken });
  } catch (error: any) {
    console.error('[B2] Upload URL error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/admin/upload-url
// 服务端中转（小文件备用，< 4.5MB）
export async function POST(request: NextRequest) {
  try {
    const admin = await getAdmin(request as unknown as Request);
    if (!admin) return NextResponse.json({ error: '未授权' }, { status: 401 });

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const key = formData.get('key') as string | null;

    if (!file) return NextResponse.json({ error: '缺少文件' }, { status: 400 });
    if (!key) return NextResponse.json({ error: '缺少 key' }, { status: 400 });
    if (!key.startsWith('videos/') && !key.startsWith('covers/') && !key.startsWith('settings/')) {
      return NextResponse.json({ error: '无效路径' }, { status: 403 });
    }

    await uploadToB2(key, file);
    const bucketName = process.env.B2_BUCKET_NAME || 'video-website';
    return NextResponse.json({ url: `https://f005.backblazeb2.com/file/${bucketName}/${key}`, key });
  } catch (error: any) {
    console.error('[B2] Upload error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
