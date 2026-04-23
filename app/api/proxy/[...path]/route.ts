/**
 * 媒体文件代理路由
 * 
 * 从 Backblaze B2 私有 Bucket 流式传输文件到客户端
 * 前端通过 /api/proxy/videos/xxx.mp4 访问
 * 
 * 注意：B2 bucket 类型为 allPrivate，文件不能直接公开访问
 * 因此需要通过此代理路由来提供文件访问
 * 
 * 优化：如果未来将 bucket 改为 allPublic，可以改为 302 重定向直接访问
 */

import { NextRequest, NextResponse } from 'next/server';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

function getS3Client() {
  // 确保 endpoint 包含协议
  let endpoint = process.env.B2_ENDPOINT;
  if (endpoint && !endpoint.startsWith('http')) {
    endpoint = `https://${endpoint}`;
  }
  endpoint = endpoint || 'https://s3.us-east-005.backblazeb2.com';

  return new S3Client({
    endpoint,
    region: process.env.B2_REGION || 'us-east-005',
    credentials: {
      accessKeyId: process.env.B2_KEY_ID || '',
      secretAccessKey: process.env.B2_APPLICATION_KEY || '',
    },
    forcePathStyle: true,
  });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const key = path.join('/');

  if (!process.env.B2_KEY_ID || !process.env.B2_APPLICATION_KEY || !process.env.B2_BUCKET_NAME) {
    return NextResponse.json({ error: 'B2 storage not configured' }, { status: 500 });
  }

  try {
    const client = getS3Client();
    const response = await client.send(new GetObjectCommand({
      Bucket: process.env.B2_BUCKET_NAME,
      Key: key,
    }));

    const headers = new Headers();
    headers.set('Content-Type', response.ContentType || 'application/octet-stream');
    headers.set('Content-Length', String(response.ContentLength || 0));
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    headers.set('ETag', response.ETag || '');

    // B2 返回的 body 是一个 stream (ReadableStream in browsers, or a Node stream)
    const body = response.Body as ReadableStream;

    return new NextResponse(body, {
      status: 200,
      headers,
    });
  } catch (err: any) {
    if (err?.$metadata?.httpStatusCode === 404 || err?.name === 'NoSuchKey') {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }
    console.error('B2 proxy error:', err);
    return NextResponse.json({ error: 'Failed to fetch file' }, { status: 500 });
  }
}
