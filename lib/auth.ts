/**
 * 认证工具 — Vercel 兼容 JWT 实现
 * 不依赖 Cloudflare Workers 运行时
 */

import { createHmac } from 'crypto';

const TOKEN_SECRET = process.env.TOKEN_SECRET || 'film-portfolio-secret-2024';

/** 生成 JWT Token */
export async function signToken(payload: { id: string; username: string }): Promise<string> {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(
    JSON.stringify({ ...payload, exp: Date.now() + 7 * 24 * 3600 * 1000 })
  ).toString('base64url');

  const sig = createHmac('sha256', TOKEN_SECRET)
    .update(`${header}.${body}`)
    .digest('base64url');

  return `${header}.${body}.${sig}`;
}

/** 验证 JWT Token */
export async function verifyToken(token: string): Promise<{ id: string; username: string } | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [header, body, sig] = parts;

    const expected = createHmac('sha256', TOKEN_SECRET)
      .update(`${header}.${body}`)
      .digest('base64url');

    if (sig !== expected) return null;

    const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (payload.exp < Date.now()) return null;

    return { id: payload.id, username: payload.username };
  } catch {
    return null;
  }
}

/**
 * 从请求中获取当前管理员
 * 直接解析 Request.headers 中的 Cookie，兼容 Vercel Serverless
 */
export async function getAdmin(req: Request): Promise<{ id: string; username: string } | null> {
  try {
    const cookieHeader = req.headers.get('cookie') || '';
    const cookies = Object.fromEntries(
      cookieHeader.split(';').map((c) => {
        const [k, ...v] = c.trim().split('=');
        return [k.trim(), decodeURIComponent(v.join('='))];
      })
    );

    const token = cookies['auth_token'];
    if (!token) return null;

    return await verifyToken(token);
  } catch {
    return null;
  }
}
