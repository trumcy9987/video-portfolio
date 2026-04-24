/**
 * Cloudflare Worker — Backblaze B2 Cache Proxy
 *
 * 功能：
 *   1. 从 B2 私有 Bucket (S3 API) 获取文件
 *   2. 使用 Cloudflare Cache API 缓存响应
 *   3. 支持 Range 请求（视频拖动进度条）
 *   4. 图片缓存 1 年，视频缓存 7 天
 *   5. CORS: Access-Control-Allow-Origin: *
 *
 * 环境变量：
 *   B2_KEY_ID     — Backblaze Application Key ID
 *   B2_APP_KEY    — Backblaze Application Key
 *   B2_BUCKET     — Bucket 名称
 *   B2_ENDPOINT   — S3 兼容 Endpoint (e.g. https://s3.us-east-005.backblazeb2.com)
 *   B2_REGION     — Region (default: us-east-005)
 */

const SERVICE = 's3';

export default {
  async fetch(request, env) {
    // ── CORS preflight ──
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    const url = new URL(request.url);
    const objectKey = decodeURIComponent(url.pathname.slice(1));

    if (!objectKey) {
      return jsonRes({ error: 'No path specified' }, 400);
    }

    if (!env.B2_KEY_ID || !env.B2_APP_KEY || !env.B2_BUCKET || !env.B2_ENDPOINT) {
      return jsonRes({ error: 'B2 storage not configured' }, 500);
    }

    const region = env.B2_REGION || 'us-east-005';
    const endpoint = env.B2_ENDPOINT.replace(/\/$/, '');
    const bucket = env.B2_BUCKET;
    const b2Url = `${endpoint}/${bucket}/${objectKey}`;

    const rangeHeader = request.headers.get('Range');

    // ── 缓存逻辑（Range 请求不走缓存） ──
    const cache = caches.default;
    let cacheKey;
    try {
      cacheKey = new Request(url.toString(), { method: 'GET' });
    } catch (_) {
      cacheKey = request;
    }

    if (!rangeHeader) {
      try {
        const cached = await cache.match(cacheKey);
        if (cached) {
          return new Response(cached.body, {
            status: cached.status,
            statusText: cached.statusText,
            headers: addCors(cached.headers),
          });
        }
      } catch (_) { /* cache miss, continue */ }
    }

    // ── 从 B2 获取 ──
    let b2Response;
    try {
      const signedHeaders = await signRequest({
        method: 'GET',
        url: b2Url,
        headers: rangeHeader ? { Range: rangeHeader } : {},
        accessKeyId: env.B2_KEY_ID,
        secretAccessKey: env.B2_APP_KEY,
        region,
        service: SERVICE,
      });
      b2Response = await fetch(b2Url, { method: 'GET', headers: signedHeaders });
    } catch (err) {
      return jsonRes({ error: 'Failed to connect to B2: ' + (err.message || err) }, 502);
    }

    if (b2Response.status === 404 || b2Response.status === 403) {
      return jsonRes({ error: 'File not found or access denied' }, b2Response.status);
    }

    if (!b2Response.ok && b2Response.status !== 206) {
      return jsonRes({ error: `B2 returned ${b2Response.status}` }, b2Response.status);
    }

    // ── 构建响应 ──
    const contentType = b2Response.headers.get('Content-Type') || 'application/octet-stream';
    const isVideo = contentType.startsWith('video/');
    const isImage = contentType.startsWith('image/');

    const respHeaders = new Headers();
    respHeaders.set('Content-Type', contentType);

    if (isVideo) {
      respHeaders.set('Cache-Control', 'public, max-age=604800');
    } else if (isImage) {
      respHeaders.set('Cache-Control', 'public, max-age=31536000, immutable');
    } else {
      respHeaders.set('Cache-Control', 'public, max-age=86400');
    }

    const passthrough = ['Content-Length', 'Content-Range', 'ETag', 'Accept-Ranges', 'Last-Modified'];
    for (const h of passthrough) {
      const v = b2Response.headers.get(h);
      if (v) respHeaders.set(h, v);
    }

    addCors(respHeaders);

    // ── 完整响应 → 缓存 ──
    if (!rangeHeader && b2Response.ok) {
      const body = await b2Response.arrayBuffer();
      const toCache = new Response(body, { status: 200, headers: respHeaders });
      try {
        const ttl = isVideo ? 604800 : isImage ? 31536000 : 86400;
        await cache.put(cacheKey, toCache.clone());
      } catch (_) { /* cache put failure is fine */ }
      return toCache;
    }

    // Range / non-200 → 流式转发，不缓存
    return new Response(b2Response.body, {
      status: b2Response.status,
      statusText: b2Response.statusText,
      headers: respHeaders,
    });
  },
};

// ── AWS Signature V4 (Cloudflare Worker 版本，使用 Web Crypto) ──

async function signRequest({ method, url, headers = {}, accessKeyId, secretAccessKey, region, service }) {
  const u = new URL(url);
  const now = new Date();
  const dateStamp = isoDate(now);
  const amzDate = iso8601(now);

  const scope = `${dateStamp}/${region}/${service}/aws4_request`;

  const host = u.host;
  const signedHeaderKeys = ['host'];
  const canonicalHeaders = `host:${host}\n`;

  // 签名 payload
  const payloadHash = 'UNSIGNED-PAYLOAD';

  // Canonical URI & Query
  const canonicalUri = u.pathname;
  const canonicalQuerystring = u.searchParams.toString();

  const canonicalRequest = [
    method,
    canonicalUri,
    canonicalQuerystring,
    canonicalHeaders,
    signedHeaderKeys.join(';'),
    payloadHash,
  ].join('\n');

  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    scope,
    await sha256Hex(canonicalRequest),
  ].join('\n');

  const signingKey = await getSigningKey(secretAccessKey, dateStamp, region, service);
  const signature = await hmacHex(signingKey, stringToSign);

  const authHeader = [
    `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${scope}`,
    `SignedHeaders=${signedHeaderKeys.join(';')}`,
    `Signature=${signature}`,
  ].join(', ');

  return {
    ...headers,
    Host: host,
    'X-Amz-Date': amzDate,
    'X-Amz-Content-SHA256': payloadHash,
    Authorization: authHeader,
  };
}

async function getSigningKey(key, dateStamp, region, service) {
  const kDate = await hmac('AWS4' + key, dateStamp);
  const kRegion = await hmac(kDate, region);
  const kService = await hmac(kRegion, service);
  return hmac(kService, 'aws4_request');
}

async function sha256Hex(data) {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(data));
  return bufToHex(hash);
}

async function hmac(key, data) {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    typeof key === 'string' ? new TextEncoder().encode(key) : key,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  return crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(data));
}

async function hmacHex(key, data) {
  return bufToHex(await hmac(key, data));
}

function bufToHex(buf) {
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

function isoDate(d) {
  return d.toISOString().slice(0, 10).replace(/-/g, '');
}

function iso8601(d) {
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
}

// ── 响应辅助 ──

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
    'Access-Control-Allow-Headers': 'Range, Origin, Accept, Content-Type',
    'Access-Control-Expose-Headers': 'Content-Range, Content-Length, ETag, Accept-Ranges',
  };
}

function addCors(headers) {
  for (const [k, v] of Object.entries(corsHeaders())) {
    if (!headers.has(k)) headers.set(k, v);
  }
  return headers;
}

function jsonRes(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders() },
  });
}
