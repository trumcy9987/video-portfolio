import { NextResponse } from 'next/server';
import { dbGet, dbAll } from '@/lib/db';

export async function GET() {
  try {
    // Check if play_logs table exists
    const tableCheck = await dbGet("SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'play_logs') as exists");
    const exists = tableCheck?.exists;

    if (!exists) {
      return NextResponse.json({ error: 'play_logs table does not exist' });
    }

    // Get table structure
    const columns = await dbAll("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'play_logs' ORDER BY ordinal_position");

    // Count records
    const count = await dbGet('SELECT COUNT(*) as c FROM play_logs');

    // Get recent records
    const recent = await dbAll('SELECT * FROM play_logs ORDER BY created_at DESC LIMIT 10');

    // Test current date
    const currentDate = await dbGet('SELECT CURRENT_DATE as d, NOW() as n');

    return NextResponse.json({
      tableExists: true,
      columns,
      count: count?.c,
      recent,
      serverTime: currentDate
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message, stack: err.stack }, { status: 500 });
  }
}