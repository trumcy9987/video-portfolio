import { NextRequest, NextResponse } from 'next/server';
import { dbGet, dbRun } from '@/lib/db';
import { uploadToB2, deleteFromB2, extractKey } from '@/lib/b2';
import { getAdmin } from '@/lib/auth';

// GET /api/admin/settings
export async function GET() {
  try {
    const siteName = await dbGet<{ value: string }>("SELECT value FROM settings WHERE key = 'site_name'");
    const siteLogo = await dbGet<{ value: string }>("SELECT value FROM settings WHERE key = 'site_logo'");
    const heroBg = await dbGet<{ value: string }>("SELECT value FROM settings WHERE key = 'hero_background'");

    // 返回纯 key，由前端 assetUrl() 统一加上 /cdn/ 前缀
    const logoUrl = siteLogo?.value ? extractKey(siteLogo.value) : '';
    const bgUrl = heroBg?.value ? extractKey(heroBg.value) : '';

    return NextResponse.json({
      settings: {
        site_name: siteName?.value || 'FILM PORTFOLIO',
        site_logo: logoUrl,
        hero_background: bgUrl,
      }
    });
  } catch {
    return NextResponse.json({
      settings: { site_name: 'FILM PORTFOLIO', site_logo: '', hero_background: '' },
    });
  }
}

// POST /api/admin/settings
export async function POST(req: NextRequest) {
  try {
    const admin = await getAdmin(req as unknown as Request);
    if (!admin) return NextResponse.json({ error: '未授权' }, { status: 401 });

    const formData = await req.formData();
    const siteName = (formData.get('site_name') as string)?.trim();

    if (siteName) {
      await dbRun(
        "INSERT INTO settings (key, value, updated_at) VALUES ('site_name', ?, NOW()) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()",
        [siteName]
      );
    }

    // 保存Logo图片
    const logoFile = formData.get('site_logo') as File | null;
    if (logoFile && logoFile.size > 0) {
      const oldLogo = await dbGet<{ value: string }>("SELECT value FROM settings WHERE key = 'site_logo'");
      if (oldLogo?.value) {
        try { await deleteFromB2(extractKey(oldLogo.value)); } catch {}
      }
      const ext = logoFile.name.split('.').pop() || 'png';
      const key = await uploadToB2(`settings/logo.${ext}`, logoFile, logoFile.type);
      await dbRun(
        "INSERT INTO settings (key, value, updated_at) VALUES ('site_logo', ?, NOW()) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()",
        [key]
      );
    }

    // 保存背景图
    const bgFile = formData.get('hero_background') as File | null;
    if (bgFile && bgFile.size > 0) {
      const oldBg = await dbGet<{ value: string }>("SELECT value FROM settings WHERE key = 'hero_background'");
      if (oldBg?.value) {
        try { await deleteFromB2(extractKey(oldBg.value)); } catch {}
      }
      const ext = bgFile.name.split('.').pop() || 'jpg';
      const key = await uploadToB2(`settings/background.${ext}`, bgFile, bgFile.type);
      await dbRun(
        "INSERT INTO settings (key, value, updated_at) VALUES ('hero_background', ?, NOW()) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()",
        [key]
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Settings save error:', err);
    return NextResponse.json({ error: err.message || '保存失败' }, { status: 500 });
  }
}

// DELETE /api/admin/settings
export async function DELETE(req: Request) {
  try {
    const admin = await getAdmin(req);
    if (!admin) return NextResponse.json({ error: '未授权' }, { status: 401 });

    const { key } = await req.json();
    if (!['site_logo', 'hero_background'].includes(key)) {
      return NextResponse.json({ error: '无效的设置项' }, { status: 400 });
    }

    const oldFile = await dbGet<{ value: string }>(`SELECT value FROM settings WHERE key = ?`, [key]);
    if (oldFile?.value) {
      try { await deleteFromB2(extractKey(oldFile.value)); } catch {}
    }

    await dbRun('DELETE FROM settings WHERE key = ?', [key]);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Settings delete error:', err);
    return NextResponse.json({ error: '删除失败' }, { status: 500 });
  }
}
