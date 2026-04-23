import { NextResponse } from 'next/server';

// POST /api/auth/logout — 登出
export async function POST() {
  const res = NextResponse.json({ success: true });
  res.cookies.set('auth_token', '', { maxAge: 0, path: '/' });
  return res;
}
