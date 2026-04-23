/**
 * 检查 Backblaze B2 Bucket CORS 配置
 * 运行: node scripts/check-cors.js
 */

const { S3Client, GetBucketCorsCommand, PutBucketCorsCommand } = require('@aws-sdk/client-s3');

async function main() {
  const client = new S3Client({
    endpoint: 'https://s3.us-east-005.backblazeb2.com',
    region: 'us-east-005',
    credentials: {
      accessKeyId: process.env.B2_KEY_ID || '0058712efa9b6b30000000002',
      secretAccessKey: process.env.B2_APPLICATION_KEY || 'K005bcwhYhGbQmkiRy4pe4DV4PjKEiI',
    },
    forcePathStyle: true,
  });

  const bucket = 'video-website';

  // 检查现有 CORS 配置
  console.log('📋 检查现有 CORS 配置...\n');
  try {
    const corsConfig = await client.send(new GetBucketCorsCommand({ Bucket: bucket }));
    console.log('✅ CORS 配置存在:');
    console.log('完整响应:', JSON.stringify(corsConfig, null, 2));
    console.log('CORSRules:', corsConfig.CORSRules);
    if (!corsConfig.CORSRules || corsConfig.CORSRules.length === 0) {
      console.log('⚠️ 但是没有 CORS 规则！');
    }
  } catch (err) {
    if (err.name === 'NoSuchCORSConfiguration' || err.Code === 'NoSuchCORSConfiguration') {
      console.log('❌ 没有配置 CORS 规则！这是导致上传失败的主要原因。');
    } else {
      console.log('❌ 获取 CORS 配置失败:', err.message || err.Code || err);
    }
    
    console.log('\n📝 需要配置以下 CORS 规则:');
    console.log(JSON.stringify([
      {
        AllowedHeaders: ['*'],
        AllowedMethods: ['GET', 'PUT', 'POST', 'DELETE', 'HEAD'],
        AllowedOrigins: ['*'],
        ExposeHeaders: ['ETag', 'x-amz-server-side-encryption', 'x-amz-request-id', 'x-amz-id-2'],
        MaxAgeSeconds: 3600
      }
    ], null, 2));
  }
}

main().catch(console.error);
