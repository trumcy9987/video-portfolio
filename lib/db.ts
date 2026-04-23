/**
 * Vercel Postgres 数据库层
 * ─────────────────────────────────────────────────────────────
 * 替代原 Cloudflare D1 方案
 * 
 * 使用 @vercel/postgres (底层 postgres 包)
 * 自动将 SQLite 风格的 ? 占位符转换为 Postgres $1, $2, ...
 */

import { sql } from '@vercel/postgres';

// ── 类型定义 ──────────────────────────────────────────────

export type Video = {
  id: string;
  title: string;
  description: string | null;
  video_url: string | null;
  cover_url: string | null;
  duration: number;
  views: number;
  tags: string;
  featured: number;
  created_at: string;
};

export type Comment = {
  id: string;
  video_id: string;
  content: string;
  nickname: string | null;
  contact: string | null;
  created_at: string;
};

export type AdminUser = {
  id: string;
  username: string;
  password: string;
};

export type Setting = {
  key: string;
  value: string | null;
  updated_at: string;
};

// ── 辅助函数 ──────────────────────────────────────────────

/** 将 SQLite ? 占位符转为 Postgres $1, $2, ... */
function toPg(q: string): string {
  let n = 0;
  return q.replace(/\?/g, () => `$${++n}`);
}

// ── 核心查询函数 ─────────────────────────────────────────

/** 查询单条 */
export async function dbGet<T = any>(
  query: string,
  params: any[] = []
): Promise<T | null> {
  try {
    const pgQuery = toPg(query);
    const { rows } = params.length > 0
      ? await sql.query(pgQuery, params)
      : await sql.query(pgQuery);
    return (rows[0] as T) ?? null;
  } catch (err) {
    console.error('[DB] dbGet error:', err);
    return null;
  }
}

/** 查询全部 */
export async function dbAll<T = any>(
  query: string,
  params: any[] = []
): Promise<T[]> {
  try {
    const pgQuery = toPg(query);
    const { rows } = params.length > 0
      ? await sql.query(pgQuery, params)
      : await sql.query(pgQuery);
    return rows as T[];
  } catch (err) {
    console.error('[DB] dbAll error:', err);
    return [];
  }
}

/** 执行 INSERT / UPDATE / DELETE */
export async function dbRun(
  query: string,
  params: any[] = []
): Promise<void> {
  try {
    const pgQuery = toPg(query);
    if (params.length > 0) {
      await sql.query(pgQuery, params);
    } else {
      await sql.query(pgQuery);
    }
  } catch (err) {
    console.error('[DB] dbRun error:', err);
    throw err;
  }
}

/**
 * 初始化 Postgres 数据库表结构
 * 首次部署时执行（通过 Vercel Postgres 控制台或 /api/setup 端点）
 */
export const INIT_SQL = `
CREATE TABLE IF NOT EXISTS videos (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT,
  cover_url TEXT,
  duration INTEGER DEFAULT 0,
  views INTEGER DEFAULT 0,
  tags TEXT DEFAULT '[]',
  featured INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  video_id TEXT NOT NULL,
  content TEXT NOT NULL,
  nickname TEXT,
  contact TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_videos_featured ON videos(featured DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_videos_created ON videos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_video ON comments(video_id);
CREATE INDEX IF NOT EXISTS idx_comments_created ON comments(created_at DESC);

INSERT INTO admin_users (id, username, password)
VALUES ('admin-1', 'admin', 'admin123')
ON CONFLICT (username) DO NOTHING;

INSERT INTO settings (key, value)
VALUES ('site_name', 'FILM PORTFOLIO')
ON CONFLICT (key) DO NOTHING;

INSERT INTO settings (key, value)
VALUES ('site_logo', '')
ON CONFLICT (key) DO NOTHING;

INSERT INTO settings (key, value)
VALUES ('hero_background', '')
ON CONFLICT (key) DO NOTHING;
`;
