const fs = require('fs');
const { Client } = require('pg');

// Read .env.local
const envContent = fs.readFileSync('./.env.local', 'utf8');
const postgresUrl = envContent.match(/POSTGRES_URL="([^"]+)"/)[1];

console.log('Using:', postgresUrl.substring(0, 50) + '...');

const client = new Client({
  connectionString: postgresUrl,
});

async function check() {
  await client.connect();
  const result = await client.query('SELECT id, title, video_url, cover_url, featured, created_at FROM videos ORDER BY created_at DESC');
  console.log('Videos in database:', result.rows.length);
  console.log(JSON.stringify(result.rows, null, 2));
  await client.end();
}

check();