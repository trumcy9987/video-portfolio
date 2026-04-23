import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

// Backblaze B2 S3-compatible 配置
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

// ── B2 Native API ────────────────────────────────────────────────

// 缓存认证信息（B2 token 有效期 24h）
let _b2Auth: { apiUrl: string; authToken: string; downloadUrl: string; bucketId: string; expiresAt: number } | null = null;
// 缓存下载授权 token（有效期内可复用，避免频繁调用）
let _dlAuth: { token: string; expiresAt: number } | null = null;

async function b2Auth() {
  const now = Date.now();
  if (_b2Auth && _b2Auth.expiresAt > now) return _b2Auth;

  const keyId = process.env.B2_KEY_ID!;
  const appKey = process.env.B2_APPLICATION_KEY!;
  const credentials = Buffer.from(`${keyId}:${appKey}`).toString('base64');

  const res = await fetch('https://api.backblazeb2.com/b2api/v2/b2_authorize_account', {
    headers: { Authorization: `Basic ${credentials}` },
  });
  if (!res.ok) throw new Error(`B2 auth failed: ${res.status}`);
  const data = await res.json();
  _b2Auth = {
    apiUrl: data.apiUrl,
    authToken: data.authorizationToken,
    downloadUrl: data.downloadUrl,
    bucketId: process.env.B2_BUCKET_ID || data.allowed?.bucketId || '',
    expiresAt: now + 23 * 60 * 60 * 1000,
  };
  // 重置下载 token 缓存
  _dlAuth = null;
  return _b2Auth;
}

// 获取下载授权 token（b2_get_download_authorization，有效期最长 7 天）
async function b2DownloadAuth(): Promise<string> {
  const now = Date.now();
  if (_dlAuth && _dlAuth.expiresAt > now) return _dlAuth.token;

  const { apiUrl, authToken, bucketId } = await b2Auth();
  const res = await fetch(`${apiUrl}/b2api/v2/b2_get_download_authorization`, {
    method: 'POST',
    headers: { Authorization: authToken, 'Content-Type': 'application/json' },
    body: JSON.stringify({ bucketId, fileNamePrefix: '', validDurationInSeconds: 604800 }), // 7 天
  });
  if (!res.ok) throw new Error(`b2_get_download_authorization failed: ${res.status}`);
  const data = await res.json();
  _dlAuth = { token: data.authorizationToken, expiresAt: now + 6 * 24 * 60 * 60 * 1000 }; // 6 天缓存
  return _dlAuth.token;
}

// 获取 B2 Native 上传 URL（服务端调用，返回 uploadUrl + authToken）
export async function getB2UploadUrl(): Promise<{ uploadUrl: string; authToken: string }> {
  const { apiUrl, authToken, bucketId } = await b2Auth();
  const res = await fetch(`${apiUrl}/b2api/v2/b2_get_upload_url`, {
    method: 'POST',
    headers: {
      Authorization: authToken,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ bucketId }),
  });
  if (!res.ok) throw new Error(`b2_get_upload_url failed: ${res.status}`);
  const data = await res.json();
  return { uploadUrl: data.uploadUrl, authToken: data.authorizationToken };
}

// 获取文件下载 URL（带下载授权 token，7 天有效）
export async function getSignedUrlForFile(key: string): Promise<string> {
  const { downloadUrl } = await b2Auth();
  const token = await b2DownloadAuth();
  // B2 下载 URL 格式：https://f005.backblazeb2.com/file/video-website/{key}?Authorization=token
  return `${downloadUrl}/file/${BUCKET}/${key}?Authorization=${token}`;
}

// ── 服务端上传（AWS SDK，仅用于小文件）───────────────────────────

export async function uploadToB2(key: string, file: File | Buffer, contentType?: string): Promise<string> {
  const buffer = file instanceof File ? Buffer.from(await file.arrayBuffer()) : file;
  const type = contentType || (file instanceof File ? file.type : 'application/octet-stream');
  await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: buffer, ContentType: type }));
  return key;
}

export async function deleteFromB2(key: string): Promise<void> {
  await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}

/**
 * 从 URL 或 key 中提取 B2 对象 key
 * 兼容：完整 B2 URL（/file/bucket/key）、旧格式（/api/proxy/key）、纯 key
 */
export function extractKey(urlOrKey: string): string {
  // 统一处理：去掉可能的前缀
  let val = urlOrKey.trim();

  // 去掉前导斜杠（/api/proxy/settings/xxx 或 /cdn/settings/xxx 或 /file/...）
  if (val.startsWith('/')) {
    // 如果是 /api/proxy/xxx 格式，提取 api/proxy/ 之后的部分
    if (val.startsWith('/api/proxy/')) {
      val = val.slice('/api/proxy/'.length);
    } else {
      val = val.replace(/^\/+ /, '');
    }
  }

  // 现在 val 要么是 http(s)://... 要么是相对 key
  if (val.startsWith('http')) {
    try {
      const parts = new URL(val).pathname.split('/').filter(Boolean);
      // B2 URL: ["file","video-website","settings","hero-background.jpeg"]
      // 跳过 file + bucket（各占1个），从索引2之后取
      if (parts.length > 2) return parts.slice(2).join('/');
    } catch {}
    return urlOrKey;
  }

  // 纯 key（可能是 video-website/xxx 或 settings/xxx）
  // 如果包含 bucket 名，去掉它
  if (val.startsWith('video-website/')) {
    val = val.slice('video-website/'.length);
  }

  return val;
}