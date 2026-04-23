# Video Portfolio - 影视作品集网站

高端视频展示网站，前台视频展示+评论系统，后台管理系统。

## 技术栈

- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS
- Vercel Postgres（数据库）
- Backblaze B2（文件存储，私有 Bucket，通过代理路由访问）

## 部署到 Vercel

### 前置条件

1. GitHub 账号
2. Vercel 账号（可用 GitHub 登录）

### 步骤

#### 1. 创建 GitHub 仓库

在 GitHub 上创建一个新仓库（如 `video-portfolio`），不要添加 README。

#### 2. 推送代码

```bash
cd C:\Users\Admin\.qclaw\workspace-agent-63e91b0a\video-portfolio
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/你的用户名/video-portfolio.git
git push -u origin main
```

#### 3. 在 Vercel 导入

1. 打开 https://vercel.com
2. 点击 "Add New..." → "Project"
3. 选择你的 GitHub 仓库
4. 点击 "Import"
5. Framework Preset 自动检测为 Next.js
6. 点击 "Deploy"

#### 4. 创建数据库和存储

部署完成后，在 Vercel Dashboard：

1. 进入项目 → Storage 标签
2. 点击 "Create Database" → 选择 "Postgres"
3. 点击 "Create"（免费额度 256MB）
4. 同样创建 "Blob" 存储（免费额度 5GB）

Vercel 会自动将环境变量注入项目，无需手动配置。

#### 5. 重新部署

创建数据库后，点击 "Redeploy" 让新环境变量生效。

## 默认管理员账号

- 用户名：`admin`
- 密码：`admin123`

⚠️ 部署后请立即登录后台修改密码！

## 功能

### 前台
- 视频网格展示
- 视频详情页（播放器 + 评论）
- 响应式设计

### 后台
- 仪表盘统计
- 视频管理（上传/编辑/删除）
- 精选开关
- 评论管理
- 网站设置（Logo、名称、背景图）

## 本地开发

```bash
npm install
npm run dev
```

需要创建 `.env.local` 文件配置数据库连接（参考 Vercel 环境变量）。

## 环境变量

Vercel 自动注入以下变量：

```
POSTGRES_URL=
POSTGRES_PRISMA_URL=
POSTGRES_URL_NON_POOLING=
POSTGRES_USER=
POSTGRES_HOST=
POSTGRES_PASSWORD=
POSTGRES_DATABASE=

BLOB_READ_WRITE_TOKEN=
```
