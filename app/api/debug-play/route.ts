/**
 * Debug endpoint for play_logs table — no auth required
 * Exposes raw errors instead of swallowing them.
 */
import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET() {
  const results: Record<string, any> = {};

  // 1. Check play_logs table structure
  try {
    const { rows: columns } = await sql.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'play_logs'
      ORDER BY ordinal_position
    `);
    results.tableExists = true;
    results.columns = columns;
  } catch (err: any) {
    results.tableExists = false;
    results.tableError = { message: err.message, code: err.code, detail: err.detail };
    return NextResponse.json(results, { status: 500 });
  }

  // 2. Count existing records
  try {
    const { rows } = await sql.query('SELECT COUNT(*) as cnt FROM play_logs');
    results.count = rows[0].cnt;
  } catch (err: any) {
    results.countError = { message: err.message, code: err.code, detail: err.detail };
  }

  // 3. Check indexes on play_logs
  try {
    const { rows: indexes } = await sql.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'play_logs'
    `);
    results.indexes = indexes;
  } catch (err: any) {
    results.indexesError = { message: err.message, code: err.code, detail: err.detail };
  }

  // 4. Try manual INSERT
  try {
    const testId = 'debug-' + Date.now().toString(36);
    await sql.query(
      'INSERT INTO play_logs (id, video_id, ip) VALUES ($1, $2, $3)',
      [testId, 'debug-test', '127.0.0.1']
    );
    results.insertSuccess = true;
    results.insertedId = testId;

    // Verify
    const { rows: verify } = await sql.query(
      'SELECT * FROM play_logs WHERE id = $1',
      [testId]
    );
    results.insertedRecord = verify[0];

    // Cleanup
    await sql.query('DELETE FROM play_logs WHERE id = $1', [testId]);
    results.cleanup = 'deleted';
  } catch (err: any) {
    results.insertError = { message: err.message, code: err.code, detail: err.detail };
    // Don't clean up if insert failed
  }

  // 5. Check if there's a video_id FK constraint issue
  try {
    const { rows: constraints } = await sql.query(`
      SELECT tc.constraint_name, tc.constraint_type, kcu.column_name,
             ccu.table_name AS foreign_table_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
      LEFT JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
      WHERE tc.table_name = 'play_logs'
    `);
    results.constraints = constraints;
  } catch (err: any) {
    results.constraintsError = { message: err.message, code: err.code, detail: err.detail };
  }

  // 6. Also test with a real video_id if one exists
  try {
    const { rows: videos } = await sql.query('SELECT id FROM videos LIMIT 1');
    if (videos.length > 0) {
      const realVideoId = videos[0].id;
      const testId2 = 'debug-real-' + Date.now().toString(36);
      await sql.query(
        'INSERT INTO play_logs (id, video_id, ip) VALUES ($1, $2, $3)',
        [testId2, realVideoId, '127.0.0.1']
      );
      results.insertWithRealVideoSuccess = true;

      // Cleanup
      await sql.query('DELETE FROM play_logs WHERE id = $1', [testId2]);
      results.realVideoCleanup = 'deleted';
    } else {
      results.insertWithRealVideo = 'no videos found';
    }
  } catch (err: any) {
    results.insertWithRealVideoError = { message: err.message, code: err.code, detail: err.detail };
  }

  return NextResponse.json(results);
}
