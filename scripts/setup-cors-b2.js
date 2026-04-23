/**
 * 使用 Backblaze B2 Native API 配置 CORS 规则
 * 运行: node scripts/setup-cors-b2.js
 */

const https = require('https');

const KEY_ID = process.env.B2_KEY_ID || '0058712efa9b6b30000000002';
const APPLICATION_KEY = process.env.B2_APPLICATION_KEY || 'K005bcwhYhGbQmkiRy4pe4DV4PjKEiI';

async function b2Request(options, body = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 400) {
            reject(new Error(parsed.message || data));
          } else {
            resolve(parsed);
          }
        } catch (e) {
          reject(new Error(data));
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function main() {
  console.log('🔑 步骤 1: 授权获取 API URL 和 Token...\n');

  // 1. 授权
  const auth = Buffer.from(`${KEY_ID}:${APPLICATION_KEY}`).toString('base64');
  const authorizeRes = await b2Request({
    hostname: 'api.backblazeb2.com',
    path: '/b2api/v2/b2_authorize_account',
    method: 'GET',
    headers: {
      'Authorization': `Basic ${auth}`
    }
  });

  console.log('✅ 授权成功');
  console.log(`   API URL: ${authorizeRes.apiUrl}`);
  console.log(`   Account ID: ${authorizeRes.accountId}`);

  const apiUrl = new URL(authorizeRes.apiUrl);
  const bucketId = '387741221eef9ac99bd60b13'; // video-website bucket ID

  // 2. 获取 Bucket 信息
  console.log('\n📋 步骤 2: 获取当前 Bucket 信息...\n');
  const bucketInfo = await b2Request({
    hostname: apiUrl.hostname,
    path: '/b2api/v2/b2_list_buckets',
    method: 'POST',
    headers: {
      'Authorization': authorizeRes.authorizationToken,
      'Content-Type': 'application/json'
    }
  }, JSON.stringify({
    accountId: authorizeRes.accountId,
    bucketId: bucketId
  }));

  const bucket = bucketInfo.buckets.find(b => b.bucketId === bucketId);
  if (bucket) {
    console.log(`   Bucket 名称: ${bucket.bucketName}`);
    console.log(`   当前 CORS 规则: ${JSON.stringify(bucket.corsRules || '未配置', null, 2)}`);
  }

  // 3. 更新 CORS 规则
  console.log('\n📝 步骤 3: 更新 CORS 规则...\n');
  const corsRules = [
    {
      corsRuleName: 's3-upload-rule',
      allowedOrigins: ['*'],  // 允许所有来源，方便调试
      allowedOperations: [
        // S3 兼容 API 操作（前端使用 presigned URL）
        's3_get',
        's3_put',
        's3_head',
        's3_delete',
        // B2 Native API 操作
        'b2_upload_file',
        'b2_upload_part',
        'b2_download_file_by_id',
        'b2_download_file_by_name'
      ],
      allowedHeaders: ['*'],
      exposeHeaders: ['ETag', 'x-amz-request-id', 'x-amz-id-2', 'x-bz-content-sha1', 'x-bz-file-id'],
      maxAgeSeconds: 3600
    }
  ];

  console.log('新 CORS 规则:', JSON.stringify(corsRules, null, 2));

  const updateRes = await b2Request({
    hostname: apiUrl.hostname,
    path: '/b2api/v2/b2_update_bucket',
    method: 'POST',
    headers: {
      'Authorization': authorizeRes.authorizationToken,
      'Content-Type': 'application/json'
    }
  }, JSON.stringify({
    accountId: authorizeRes.accountId,
    bucketId: bucketId,
    corsRules: corsRules
  }));

  console.log('\n✅ CORS 配置成功！');
  console.log('更新后的 Bucket:', JSON.stringify(updateRes, null, 2));
}

main().catch(err => {
  console.error('\n❌ 错误:', err.message || err);
  process.exit(1);
});
