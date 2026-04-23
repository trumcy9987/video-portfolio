import { NextResponse } from 'next/server';
import { dbRun } from '@/lib/db';
import { getAdmin } from '@/lib/auth';

// PATCH /api/admin/account — 修改管理员账号密码
export async function PATCH(req: Request) {
  try {
    const admin = await getAdmin(req);
    if (!admin) return NextResponse.json({ error: '未授权' }, { status: 401 });

    const { username, password, confirm_password } = await req.json();

    if (!username && !password) {
      return NextResponse.json({ error: '请提供用户名或密码' }, { status: 400 });
    }

    if (username !== undefined && username !== null && String(username).trim() === '') {
      return NextResponse.json({ error: '用户名不能为空' }, { status: 400 });
    }

    if (password !== undefined && password !== null) {
      if (String(password).trim() === '') {
        return NextResponse.json({ error: '密码不能为空' }, { status: 400 });
      }
      if (password !== confirm_password) {
        return NextResponse.json({ error: '两次密码不一致' }, { status: 400 });
      }
    }

    const updates: string[] = [];
    const params: any[] = [];

    if (username) {
      updates.push('username = ?');
      params.push(String(username).trim());
    }
    if (password) {
      updates.push('password = ?');
      params.push(String(password));
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: '没有可更新的字段' }, { status: 400 });
    }

    params.push(admin.id);
    await dbRun(
      `UPDATE admin_users SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Account update error:', err);
    return NextResponse.json({ error: '更新失败' }, { status: 500 });
  }
}
