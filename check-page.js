const https = require('https');
https.get('https://xiaoliu.ccwu.cc/', (res) => {
  let html = '';
  res.on('data', d => html += d);
  res.on('end', () => {
    // 找到所有带 hash 的 chunk 文件
    const allChunks = html.match(/\/_next\/static\/chunks\/[^"]+\.(js|css)/g) || [];
    const unique = [...new Set(allChunks)];
    console.log('Total unique chunks:', unique.length);
    unique.forEach(c => console.log(c));
    // 检查是否有任何包含 assetUrl 相关的 chunk
    console.log('\nSearching for api/proxy in page...');
    if (html.includes('api/proxy')) {
      console.log('FOUND in HTML!');
    }
  });
}).on('error', e => console.error(e));
