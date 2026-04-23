-- Vercel Postgres 数据库初始化脚本
-- 使用 psql 或 Vercel Postgres 控制台执行

-- 视频表
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

-- 评论表
CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  video_id TEXT NOT NULL,
  content TEXT NOT NULL,
  nickname TEXT,
  contact TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 管理员表
CREATE TABLE IF NOT EXISTS admin_users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL
);

-- 设置表
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_videos_featured ON videos(featured DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_videos_created ON videos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_video ON comments(video_id);
CREATE INDEX IF NOT EXISTS idx_comments_created ON comments(created_at DESC);

-- 初始化管理员账号
INSERT INTO admin_users (id, username, password)
VALUES ('admin-1', 'admin', 'admin123')
ON CONFLICT (username) DO NOTHING;

-- 初始化默认设置
INSERT INTO settings (key, value) VALUES ('site_name', 'FILM PORTFOLIO')
ON CONFLICT (key) DO NOTHING;

INSERT INTO settings (key, value) VALUES ('site_logo', '')
ON CONFLICT (key) DO NOTHING;

INSERT INTO settings (key, value) VALUES ('hero_background', '')
ON CONFLICT (key) DO NOTHING;
