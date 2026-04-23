/**
 * 检查 Backblaze B2 存储桶中的文件
 * 运行: node scripts/list-b2-files.js
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
  console.log('🔑 步骤 1: 授权...\n');

  const auth = Buffer.from(`${KEY_ID}:${APPLICATION_KEY}`).toString('base64');
  const authorizeRes = await b2Request({
    hostname: 'api.backblazeb2.com',
    path: '/b2api/v2/b2_authorize_account',
    method: 'GET',
    headers: { 'Authorization': `Basic ${auth}` }
  });

  console.log('✅ 授权成功');
  const apiUrl = new URL(authorizeRes.apiUrl);
  const bucketId = '387741221eef9ac99bd60b13';

  console.log('\n📋 步骤 2: 列出 B2 存储桶中的文件...\n');

  let fileCount = 0;
  let startFileName = '';

  do {
    const response = await b2Request({
      hostname: apiUrl.hostname,
      path: '/b2api/v2/b2_list_file_names',
      method: 'POST',
      headers: {
        'Authorization': authorizeRes.authorizationToken,
        'Content-Type': 'application/json'
      }
    }, JSON.stringify({
      bucketId: bucketId,
      startFileName: startFileName,
      maxFileCount: 1000
    }));

    if (response.files && response.files.length > 0) {
      console.log(`找到 ${response.files.length} 个文件 (从 ${response.startFileName || '开始'}):`);
      for (const file of response.files) {
        fileCount++;
        console.log(`  ${fileCount}. ${file.fileName}`);
        console.log(`     大小: ${(file.contentLength / 1024 / 1024).toFixed(2)} MB`);
        console.log(`     类型: ${file.contentType}`);
        console.log(`     上传时间: ${new Date(file.uploadTimestamp).toLocaleString()}`);
        console.log('');
      }
      startFileName = response.nextFileName || '';
    } else {
      if (fileCount === 0) {
        console.log('❌ 存储桶中没有文件！');
      }
      break;
    }
  } while (startFileName);

  console.log(`\n📊 总计: ${fileCount} 个文件`);
}

main().catch(err => {
  console.error('\n❌ 错误:', err.message || err);
  process.exit(1);
});
