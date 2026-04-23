/**
 * 测试 Backblaze B2 Presigned URL 生成
 * 运行: node scripts/test-presigned-url.js
 */

const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const https = require('https');

const KEY_ID = process.env.B2_KEY_ID || '0058712efa9b6b30000000002';
const APPLICATION_KEY = process.env.B2_APPLICATION_KEY || 'K005bcwhYhGbQmkiRy4pe4DV4PjKEiI';
const BUCKET = 'video-website';
const REGION = 'us-east-005';

// 测试不同的 endpoint 格式
const endpointFormats = [
  's3.us-east-005.backblazeb2.com',
  'https://s3.us-east-005.backblazeb2.com',
  's3.us-east-005.backblazeb2.com:443'
];

async function testPresignedUrl(endpoint) {
  console.log(`\n🧪 测试 endpoint: ${endpoint}`);
  
  // 处理 endpoint 格式
  let cleanEndpoint = endpoint;
  if (cleanEndpoint.startsWith('https://')) {
    cleanEndpoint = cleanEndpoint.slice(8);
    console.log('  ⚠️  移除 https:// 前缀');
  }
  
  const s3 = new S3Client({
    region: REGION,
    credentials: {
      accessKeyId: KEY_ID,
      secretAccessKey: APPLICATION_KEY,
    },
    endpoint: `https://${cleanEndpoint}`,
    forcePathStyle: true,
  });

  const key = `test/${Date.now()}-test.txt`;
  const contentType = 'text/plain';

  try {
    const command = new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      ContentType: contentType,
    });

    const presignedUrl = await getSignedUrl(s3, command, { expiresIn: 7200 });
    console.log('  ✅ Presigned URL 生成成功');
    console.log(`     URL: ${presignedUrl.substring(0, 80)}...`);
    
    // 测试上传
    await testUpload(presignedUrl, contentType);
    
    return { success: true, endpoint: cleanEndpoint };
  } catch (err) {
    console.log(`  ❌ 失败: ${err.message}`);
    return { success: false, error: err.message };
  }
}

function testUpload(url, contentType) {
  return new Promise((resolve, reject) => {
    const body = Buffer.from('Test content');
    const urlObj = new URL(url);
    
    const options = {
      hostname: urlObj.hostname,
      port: 443,
      path: urlObj.pathname + urlObj.search,
      method: 'PUT',
      headers: {
        'Content-Type': contentType,
        'Content-Length': body.length,
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log(`  ✅ 上传测试成功 (HTTP ${res.statusCode})`);
          resolve();
        } else {
          console.log(`  ❌ 上传测试失败 (HTTP ${res.statusCode})`);
          console.log(`     响应: ${data}`);
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', (err) => {
      console.log(`  ❌ 请求错误: ${err.message}`);
      reject(err);
    });

    req.write(body);
    req.end();
  });
}

async function main() {
  console.log('🔍 Backblaze B2 Presigned URL 测试\n');
  console.log(`Bucket: ${BUCKET}`);
  console.log(`Region: ${REGION}`);
  
  for (const endpoint of endpointFormats) {
    await testPresignedUrl(endpoint);
  }
  
  console.log('\n✅ 测试完成');
}

main().catch(console.error);
