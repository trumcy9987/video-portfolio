import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

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

// POST: { filename, base64Data, contentType }
export async function POST(req: NextRequest) {
  try {
    const { filename, base64Data, contentType } = await req.json();
    if (!filename || !base64Data) {
      return NextResponse.json({ error: 'missing filename or base64Data' }, { status: 400 });
    }

    const buffer = Buffer.from(base64Data, 'base64');
    const key = filename.startsWith('settings/') ? filename : `settings/${filename}`;

    await s3.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType || 'image/webp',
    }));

    return NextResponse.json({ success: true, key, size: buffer.length });
  } catch (err: any) {
    console.error('[b2-upload] Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}