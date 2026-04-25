import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET() {
  try {
    // 1. Check if play_logs table exists
    const tableCheck = await sql`SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'play_logs') as exists`;
    const exists = tableCheck.rows[0]?.exists;

    const result: any = { tableExists: exists };

    if (exists) {
      // 2. Get columns
      const cols = await sql`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'play_logs' ORDER BY ordinal_position`;
      result.columns = cols.rows;

      // 3. Count
      const cnt = await sql`SELECT COUNT(*) as c FROM play_logs`;
      result.count = cnt.rows[0]?.c;

      // 4. Recent records
      const recent = await sql`SELECT * FROM play_logs ORDER BY created_at DESC LIMIT 10`;
      result.recent = recent.rows;

      // 5. Server time
      const time = await sql`SELECT CURRENT_DATE as cur_date, NOW() as now_utc, CURRENT_TIMESTAMP as ts`;
      result.serverTime = time.rows[0];
    }

    // Also check views column on videos
    const totalViews = await sql`SELECT COALESCE(SUM(views), 0) as c FROM videos`;
    result.totalViewsFromVideos = totalViews.rows[0]?.c;

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}