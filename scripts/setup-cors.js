/**
 * 配置 Backblaze B2 Bucket CORS 规则
 * 运行: node scripts/setup-cors.js
 */

const { S3Client, PutBucketCorsCommand, GetBucketCorsCommand } = require('@aws-sdk/client-s3');

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

  // CORS 规则配置
  const corsRules = [
    {
      AllowedHeaders: ['*'],
      AllowedMethods: ['GET', 'PUT', 'POST', 'DELETE', 'HEAD'],
      AllowedOrigins: ['*'],  // 生产环境建议替换为具体域名
      ExposeHeaders: ['ETag', 'x-amz-server-side-encryption', 'x-amz-request-id', 'x-amz-id-2'],
      MaxAgeSeconds: 3600
    }
  ];

  console.log('📝 配置 CORS 规则...');
  console.log('规则:', JSON.stringify(corsRules, null, 2));

  try {
    await client.send(new PutBucketCorsCommand({
      Bucket: bucket,
      CORSConfiguration: {
        CORSRules: corsRules
      }
    }));
    console.log('\n✅ CORS 配置成功！');
  } catch (err) {
    console.error('❌ CORS 配置失败:', err.message || err);
    process.exit(1);
  }

  // 验证配置
  console.log('\n📋 验证配置...');
  try {
    const result = await client.send(new GetBucketCorsCommand({ Bucket: bucket }));
    console.log('当前 CORS 规则:', JSON.stringify(result.CORSRules, null, 2));
  } catch (err) {
    console.error('验证失败:', err.message);
  }
}

main().catch(console.error);
