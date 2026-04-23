import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { uploadToB2 } from '@/lib/b2';
import { dbRun } from '@/lib/db';

const s3 = new S3Client({
  region: process.env.B2_REGION || 'us-east-005',
  credentials: {
    accessKeyId: process.env.B2_KEY_ID!,
    secretAccessKey: process.env.B2_APPLICATION_KEY!,
  },
  endpoint: `https://${process.env.B2_ENDPOINT || 's3.us-east-005.backblazeb2.com'}`,
  forcePathStyle: true,
});
const BUCKET = process.env.B2_BUCKET_NAME || 'video-website';

// GET: 测试 B2 配置
export async function GET() {
  const config = {
    endpoint: process.env.B2_ENDPOINT || 's3.us-east-005.backblazeb2.com',
    region: process.env.B2_REGION || 'us-east-005',
    bucket: BUCKET,
    hasKeyId: !!process.env.B2_KEY_ID,
    hasAppKey: !!process.env.B2_APPLICATION_KEY,
  };
  let uploadTest = null;
  try {
    const testKey = `debug/${Date.now()}-test.txt`;
    await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: testKey, Body: Buffer.from('ok'), ContentType: 'text/plain' }));
    uploadTest = { success: true, key: testKey };
  } catch (err: any) {
    uploadTest = { success: false, error: err.message };
  }
  return NextResponse.json({ timestamp: new Date().toISOString(), config, uploadTest });
}

// POST: 上传背景图到 B2 并更新数据库
// body: { imageData: "data:image/webp;base64,..." }
export async function POST(req: NextRequest) {
  try {
    const { imageData, filename } = await req.json();
    if (!imageData) return NextResponse.json({ error: 'no imageData' }, { status: 400 });

    // 解析 base64
    const base64 = imageData.replace(/^data:[^;]+;base64,/, '');
    const buffer = Buffer.from(base64, 'base64');

    // 扩展名
    let ext = 'webp';
    if (imageData.includes('image/jpeg')) ext = 'jpg';
    else if (imageData.includes('image/png')) ext = 'png';

    const key = `settings/hero-background.${ext}`;
    console.log(`[bg-upload] Uploading ${buffer.length} bytes to ${key}`);

    // 上传到 B2
    await s3.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
    }));
    console.log(`[bg-upload] B2 upload done: ${key}`);

    // 更新数据库
    await dbRun(
      "INSERT INTO settings (key, value, updated_at) VALUES ('hero_background', ?, NOW()) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()",
      [key]
    );
    console.log(`[bg-upload] DB updated: hero_background = ${key}`);

    return NextResponse.json({ success: true, key });
  } catch (err: any) {
    console.error('[bg-upload] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}