/**
 * B2 连接诊断脚本
 * 
 * 使用方法:
 * 1. 确保已设置代理（如果需要）:
 *    Windows: set HTTPS_PROXY=http://127.0.0.1:7890
 *    Mac/Linux: export HTTPS_PROXY=http://127.0.0.1:7890
 * 
 * 2. 运行脚本:
 *    node diagnose-b2.mjs
 */

// 使用 CommonJS 兼容的方式
const { S3Client, ListBucketsCommand, ListObjectsV2Command, HeadBucketCommand } = await import('@aws-sdk/client-s3');

// B2 配置 - 请替换为你的实际值
const B2_CONFIG = {
  keyId: process.env.B2_KEY_ID || '8712efa9b6b3',
  applicationKey: process.env.B2_APPLICATION_KEY || '005f9df5fd90b3799fbcbf786c43ae544e8391b7e7',
  region: process.env.B2_REGION || 'us-east-005',
  endpoint: process.env.B2_ENDPOINT || 's3.us-east-005.backblazeb2.com',
  bucketName: process.env.B2_BUCKET_NAME || 'video-website',
};

console.log('=== B2 连接诊断 ===\n');

async function diagnose() {
  console.log('配置信息:');
  console.log(`  keyId: ${B2_CONFIG.keyId}...`);
  console.log(`  applicationKey: ${B2_CONFIG.applicationKey.substring(0, 8)}...`);
  console.log(`  region: ${B2_CONFIG.region}`);
  console.log(`  endpoint: ${B2_CONFIG.endpoint}`);
  console.log(`  bucket: ${B2_CONFIG.bucketName}`);
  console.log('');

  const s3 = new S3Client({
    region: B2_CONFIG.region,
    credentials: {
      accessKeyId: B2_CONFIG.keyId,
      secretAccessKey: B2_CONFIG.applicationKey,
    },
    endpoint: `https://${B2_CONFIG.endpoint}`,
    forcePathStyle: true,
  });

  // 测试 1: 列出所有 buckets
  console.log('测试 1: 列出所有 Buckets...');
  try {
    const buckets = await s3.send(new ListBucketsCommand({}));
    console.log('✅ 成功连接到 B2');
    console.log('   可用的 Buckets:');
    buckets.Buckets?.forEach(b => {
      console.log(`   - ${b.Name}`);
    });
  } catch (err) {
    console.log('❌ 连接失败:', err.message);
    console.log('   可能的原因:');
    console.log('   1. keyID 不正确（当前值可能不完整）');
    console.log('   2. applicationKey 不正确');
    console.log('   3. 网络连接问题');
    console.log('   4. 代理未配置');
    return;
  }

  // 测试 2: 检查目标 bucket
  console.log('\n测试 2: 检查目标 Bucket...');
  try {
    await s3.send(new HeadBucketCommand({ Bucket: B2_CONFIG.bucketName }));
    console.log(`✅ Bucket "${B2_CONFIG.bucketName}" 存在且可访问`);
  } catch (err) {
    console.log(`❌ Bucket "${B2_CONFIG.bucketName}" 访问失败:`, err.message);
    console.log('   可能的原因:');
    console.log('   1. Bucket 名称不正确');
    console.log('   2. Bucket 在不同区域');
    console.log('   3. 没有该 Bucket 的访问权限');
  }

  // 测试 3: 列出 bucket 内容
  console.log('\n测试 3: 列出 Bucket 内容...');
  try {
    const objects = await s3.send(new ListObjectsV2Command({ 
      Bucket: B2_CONFIG.bucketName,
      MaxKeys: 10 
    }));
    console.log(`✅ 成功列出内容，共 ${objects.KeyCount || 0} 个文件`);
    if (objects.Contents?.length > 0) {
      console.log('   最近的文件:');
      objects.Contents.slice(0, 5).forEach(obj => {
        console.log(`   - ${obj.Key} (${Math.round(obj.Size / 1024)} KB)`);
      });
    }
  } catch (err) {
    console.log('❌ 列出内容失败:', err.message);
  }

  console.log('\n=== 诊断完成 ===');
}

diagnose().catch(console.error);
