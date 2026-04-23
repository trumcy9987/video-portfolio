/**
 * Backblaze B2 存储适配器（S3 兼容模式）
 *
 * 使用 @aws-sdk/client-s3 连接 Backblaze B2
 * Bucket 为 allPrivate，文件通过 /api/proxy/ 路由访问
 */

import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

// ── B2 S3 客户端（懒加载单例） ──
let _s3Client: S3Client | null = null;

function getS3Client(): S3Client {
  if (!_s3Client) {
    const keyId = process.env.B2_KEY_ID;
    const appKey = process.env.B2_APPLICATION_KEY;

    if (!keyId || !appKey) {
      throw new Error(
        '[B2] 缺少环境变量 B2_KEY_ID 或 B2_APPLICATION_KEY，请在 Vercel 项目设置中配置'
      );
    }

    _s3Client = new S3Client({
      endpoint: process.env.B2_ENDPOINT || 'https://s3.us-east-005.backblazeb2.com',
      region: process.env.B2_REGION || 'us-east-005',
      credentials: {
        accessKeyId: keyId,
        secretAccessKey: appKey,
      },
      forcePathStyle: true,
    });
  }
  return _s3Client;
}

function isB2Configured(): boolean {
  return !!(process.env.B2_KEY_ID && process.env.B2_APPLICATION_KEY && process.env.B2_BUCKET_NAME);
}

/**
 * 上传文件到 B2
 * 返回的 url 仅供参考，实际访问通过 /api/proxy/{key}
 */
export async function uploadFile(
  key: string,
  buffer: Buffer,
  contentType: string
): Promise<{ url: string; success: boolean }> {
  if (!isB2Configured()) {
    console.error('[B2] 未配置 B2 存储（B2_KEY_ID / B2_APPLICATION_KEY / B2_BUCKET_NAME）');
    return { url: '', success: false };
  }

  try {
    const client = getS3Client();
    const bucket = process.env.B2_BUCKET_NAME || '';

    await client.send(new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    }));

    // 返回 proxy 路径（前端通过此路径访问私有 bucket 文件）
    const url = `/api/proxy/${key}`;
    return { url, success: true };
  } catch (error) {
    console.error('[B2] 上传失败:', error);
    return { url: '', success: false };
  }
}

/**
 * 从 B2 删除文件
 * @param key 文件 key（如 videos/xxx.mp4）
 */
export async function deleteFile(key: string): Promise<boolean> {
  if (!key || !isB2Configured()) return false;

  try {
    const client = getS3Client();
    const bucket = process.env.B2_BUCKET_NAME || '';

    await client.send(new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    }));

    return true;
  } catch (error) {
    console.error('[B2] 删除失败:', error);
    return false;
  }
}

/**
 * 从 proxy URL 中提取 B2 key
 * /api/proxy/videos/xxx.mp4 → videos/xxx.mp4
 */
export function extractKey(url: string): string {
  if (!url) return '';
  return url.replace(/^\/api\/proxy\//, '');
}

/**
 * 检查 B2 是否已配置
 */
export { isB2Configured as isStorageConfigured };
