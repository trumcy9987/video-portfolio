import { NextRequest, NextResponse } from 'next/server';
import { dbGet } from '@/lib/db';
import { signToken, getAdmin } from '@/lib/auth';

// POST /api/auth/login
export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();
    if (!username || !password) {
      return NextResponse.json({ error: '请输入账号和密码' }, { status: 400 });
    }

    const admin: any = await dbGet(
      'SELECT * FROM admin_users WHERE username = ?',
      [username]
    );

    if (!admin) {
      return NextResponse.json({ error: '账号或密码错误' }, { status: 401 });
    }

    if (admin.password !== password) {
      return NextResponse.json({ error: '账号或密码错误' }, { status: 401 });
    }

    const token = await signToken({ id: admin.id, username: admin.username });
    const res = NextResponse.json({ success: true, username: admin.username });
    res.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 3600,
      path: '/',
    });
    return res;
  } catch (err: any) {
    return NextResponse.json({ error: '登录失败' }, { status: 500 });
  }
}

// GET /api/auth/login — 检查登录状态
export async function GET(req: Request) {
  try {
    const admin = await getAdmin(req);
    if (!admin) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }
    return NextResponse.json({ success: true, username: admin.username });
  } catch {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }
}
