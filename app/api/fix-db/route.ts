import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

// POST /api/fix-db — 创建缺失的 play_logs 表和索引（一次性修复）
export async function POST() {
  const results: Record<string, any> = {};

  try {
    // 1. Create play_logs table
    await sql.query(`
      CREATE TABLE IF NOT EXISTS play_logs (
        id TEXT PRIMARY KEY,
        video_id TEXT NOT NULL,
        ip TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    results.play_logs_created = true;
  } catch (err: any) {
    results.play_logs_error = { message: err.message, code: err.code };
  }

  try {
    // 2. Create indexes
    await sql.query(`CREATE INDEX IF NOT EXISTS idx_play_logs_video ON play_logs(video_id)`);
    await sql.query(`CREATE INDEX IF NOT EXISTS idx_play_logs_date ON play_logs(DATE(created_at))`);
    results.indexes_created = true;
  } catch (err: any) {
    results.indexes_error = { message: err.message, code: err.code };
  }

  try {
    // 3. Verify
    const { rows: columns } = await sql.query(`
      SELECT column_name, data_type FROM information_schema.columns
      WHERE table_name = 'play_logs' ORDER BY ordinal_position
    `);
    results.columns = columns;
    const { rows } = await sql.query('SELECT COUNT(*) as cnt FROM play_logs');
    results.count = rows[0].cnt;
  } catch (err: any) {
    results.verify_error = { message: err.message, code: err.code };
  }

  return NextResponse.json(results);
}

// GET /api/fix-db — 检查当前状态
export async function GET() {
  const results: Record<string, any> = {};

  try {
    const { rows: columns } = await sql.query(`
      SELECT column_name, data_type FROM information_schema.columns
      WHERE table_name = 'play_logs' ORDER BY ordinal_position
    `);
    results.tableExists = true;
    results.columns = columns;
  } catch {
    results.tableExists = false;
  }

  if (results.tableExists) {
    try {
      const { rows } = await sql.query('SELECT COUNT(*) as cnt FROM play_logs');
      results.count = rows[0].cnt;
    } catch (err: any) {
      results.countError = err.message;
    }
  }

  return NextResponse.json(results);
}
