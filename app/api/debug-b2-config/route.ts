import { NextResponse } from 'next/server';
import { S3Client, GetObjectCommand, ListBucketsCommand, HeadBucketCommand } from '@aws-sdk/client-s3';

export async function GET() {
  const result: any = {
    timestamp: new Date().toISOString(),
    env: {},
    errors: [],
  };

  // 检查环境变量
  const envVars = ['B2_KEY_ID', 'B2_APPLICATION_KEY', 'B2_ENDPOINT', 'B2_REGION', 'B2_BUCKET_NAME', 'B2_BUCKET_ID'];
  for (const key of envVars) {
    const value = process.env[key];
    if (value) {
      if (key.includes('KEY') || key.includes('SECRET')) {
        result.env[key] = value.substring(0, 4) + '***' + value.substring(value.length - 4);
      } else {
        result.env[key] = value;
      }
    } else {
      result.env[key] = '(not set)';
      result.errors.push(`Missing environment variable: ${key}`);
    }
  }

  if (result.errors.length > 0) {
    return NextResponse.json(result, { status: 500 });
  }

  try {
    // 确保 endpoint 包含协议
    let rawEndpoint = process.env.B2_ENDPOINT || 's3.us-east-005.backblazeb2.com';
    const endpoint = rawEndpoint.startsWith('http') ? rawEndpoint : `https://${rawEndpoint}`;

    // 创建 S3 客户端
    const client = new S3Client({
      endpoint,
      region: process.env.B2_REGION || 'us-east-005',
      credentials: {
        accessKeyId: process.env.B2_KEY_ID!,
        secretAccessKey: process.env.B2_APPLICATION_KEY!,
      },
      forcePathStyle: true,
    });

    // 测试 HeadBucket
    try {
      await client.send(new HeadBucketCommand({
        Bucket: process.env.B2_BUCKET_NAME,
      }));
      result.bucketCheck = { success: true, bucket: process.env.B2_BUCKET_NAME };
    } catch (err: any) {
      result.bucketCheck = { success: false, error: err.message, code: err.$metadata?.httpStatusCode };
      result.errors.push(`Bucket check failed: ${err.message}`);
    }

    // 测试 ListBuckets
    try {
      const buckets = await client.send(new ListBucketsCommand({}));
      result.listBuckets = {
        success: true,
        buckets: buckets.Buckets?.map((b: any) => b.Name) || []
      };
    } catch (err: any) {
      result.listBuckets = { success: false, error: err.message };
    }

    // 测试 GetObject (使用一个已知的文件)
    const testKeys = [
      'videos/1776671060612-video_1776240223.mp4',
      'covers/1776671060612-cover.jpg',
      'test/1776687416521-test.txt'
    ];

    result.testFiles = [];
    for (const key of testKeys) {
      try {
        const response = await client.send(new GetObjectCommand({
          Bucket: process.env.B2_BUCKET_NAME,
          Key: key,
        }));
        result.testFiles.push({
          key,
          success: true,
          contentType: response.ContentType,
          contentLength: response.ContentLength,
        });
      } catch (err: any) {
        result.testFiles.push({
          key,
          success: false,
          error: err.message,
          code: err.$metadata?.httpStatusCode,
          name: err.name,
        });
      }
    }

    result.endpointInfo = {
      raw: rawEndpoint,
      withProtocol: endpoint,
      isValidUrl: endpoint.startsWith('https://') || false,
    };

  } catch (err: any) {
    result.fatalError = err.message;
    result.errors.push(err.message);
  }

  const status = result.errors.length > 0 && !result.testFiles?.some((f: any) => f.success) ? 500 : 200;
  return NextResponse.json(result, { status });
}
