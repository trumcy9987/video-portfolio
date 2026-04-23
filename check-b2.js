const { S3Client, CreateBucketCommand, ListBucketsCommand } = require('@aws-sdk/client-s3');

const s3 = new S3Client({
  region: 'us-east-005',
  credentials: {
    accessKeyId: '8712efa9b6b3',
    secretAccessKey: '005c2c6907b15b9ff84bed221a774a351fb93a4665',
  },
  endpoint: 'https://s3.us-east-005.backblazeb2.com',
  forcePathStyle: true,
});

(async () => {
  try {
    const list = await s3.send(new ListBucketsCommand({}));
    console.log(JSON.stringify(list.Buckets, null, 2));
  } catch (e) {
    console.log('Error:', e.message);
  }
})();