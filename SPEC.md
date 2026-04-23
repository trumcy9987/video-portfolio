# SPEC.md — 个人视频作品展示站

## 1. Concept & Vision

一个高端、沉浸式的个人视频作品展示网站，灵感来源于新片场的专业电影感设计风格。以深色电影质感为基调，通过精致的光影、流畅的动效、克制而有力的排版，营造出"专业影视制作人作品集"的氛围。整体感觉像是一场精心策展的私人放映会——每一位访客都是受邀观众。

## 2. Design Language

### Aesthetic Direction
**Cinema Noir × Modern Editorial** — 暗调电影质感搭配现代杂志排版的克制美学。大量留白与重色块形成张力；细节处有光影流动；整体冷静克制，却在关键交互节点释放视觉爆发力。

### Color Palette
```
--color-bg:        #0A0A0C   (深黑，近似纯黑但不刺眼)
--color-surface:   #111115   (卡片、面板背景)
--color-border:    #1E1E24   (分隔线、微光边框)
--color-muted:     #2A2A32   (次要边框、输入框背景)
--color-text-1:    #F0EDE6   (主文字，米白色，不死白)
--color-text-2:    #8A8A96   (次要文字，灰紫色)
--color-text-3:    #4A4A56   (禁用文字)
--color-accent:    #E8C97A   (金色强调，主品牌色)
--color-accent-2:  #C47D3A   (琥珀色，hover 状态)
--color-red:       #D94F4F   (错误、删除)
--color-green:     #4FAD7A   (成功状态)
```

### Typography
- **Display / 标题**: `"Noto Serif SC"` — 衬线体，优雅、有文化感，搭配中文章节标题
- **Body / 正文**: `"DM Sans"` — 现代几何无衬线，干净、易读，用于正文与 UI 元素
- **Mono / 数据**: `"JetBrains Mono"` — 代码风格，用于数字、统计、后台数据
- **Scale**: 12 / 14 / 16 / 20 / 24 / 32 / 48 / 72px

### Spatial System
- 基础单位: 8px
- 页面边距: 桌面端 80px，平板 40px，移动端 24px
- 卡片圆角: 4px（微圆角，不过分柔软）
- 视频卡片: 16:9 固定比例，hover 时 scale(1.02) + 光晕

### Motion Philosophy
- **Page Load**: 整体渐显 (opacity 0→1, 600ms ease-out)，视频卡片依次入场 (stagger 80ms)
- **Scroll**: 视差滚动封面图，标题随滚动渐隐
- **Hover**: 视频卡片微放大 + 金色边框光晕 + 播放按钮浮现 (transform + opacity, 300ms ease)
- **Modal**: 评论弹窗从底部滑入 (translateY 100%→0, 400ms cubic-bezier)
- **Micro**: 按钮 press 效果 (scale 0.97)，输入框 focus 金色光晕

### Visual Assets
- **Icons**: Lucide React（线性风格，1.5px stroke）
- **装饰元素**: 细线分隔符、渐变光晕（radial gradient）、噪点纹理叠加（5% opacity）
- **无图占位**: 深色块 + 播放图标 logo
- **封面占位**: 16:9 深灰块 + 金色 "PLAY" 文字

## 3. Layout & Structure

### 首页 (/)
```
[导航栏]           Logo左 | 导航链接右（作品/关于/联系）
[英雄区]           全屏高度，封面视频bg叠加渐变蒙版，巨型标题+副标题，底部有向下滚动指示
[精选区]           大卡片布局，左侧1个超大卡片(占2列)，右侧2个标准卡片纵向排列
[全部作品]         瀑布流/网格布局，3列(桌面)/2列(平板)/1列(手机)
[页脚]             极简，单行版权+社交链接
```

### 视频详情页 (/video/[id])
```
[返回导航]         顶部固定返回按钮
[播放器区]         16:9 视频播放器，全宽
[信息区]           视频标题(大)+描述+发布时间+标签
[评论区]           访客评论列表 + 发布评论表单（留言内容必填，称呼/联系方式选填）
```

### 后台管理 (/admin)
```
[登录页]           简洁表单，账号密码登录
[仪表盘]           总视频数、总播放数、今日新增、评论总数（统计卡片）
[视频管理]         视频列表表格（封面/标题/播放量/操作）
[上传视频]         拖拽上传区 + 封面图上传 + 标题/描述/标签输入
[编辑视频]         修改视频信息、替换封面/视频
```

### Responsive Strategy
- Desktop (≥1280px): 3列网格，完整动效
- Tablet (768-1279px): 2列网格，减少视差
- Mobile (<768px): 1列，卡片全宽，简化动效

## 4. Features & Interactions

### 前台 — 视频展示
- **首页英雄区**: 首屏沉浸感，自动播放/静音循环播放背景视频（可配置）
- **视频卡片 hover**: 显示时长、标题，播放按钮从透明→白色浮现，底部分隔线发光
- **点击视频卡片**: 跳转到 /video/[id] 详情页
- **视频播放**: 使用原生 `<video>` 标签，支持封面图，点击播放

### 前台 — 评论系统
- **评论表单**: 留言内容（textarea，必填，max 1000字）+ 称呼（input，选填）+ 联系方式（input，选填）
- **提交验证**: 内容不能为空，提交后显示加载状态
- **评论展示**: 按时间倒序，显示内容+称呼+时间+联系方式（如果有）
- **回复功能**: 暂不实现（留扩展接口）

### 后台 — 视频管理
- **登录**: 固定账号 admin / password（可配置），JWT token 鉴权，7天过期
- **视频列表**: 展示所有视频，显示封面、标题、播放量、发布时间，支持搜索/筛选
- **上传视频**: 拖拽或点击上传 MP4 视频文件 + 封面图(JPG/PNG)，填写标题/描述/标签
- **编辑视频**: 修改任意字段，可替换视频文件
- **删除视频**: 二次确认弹窗，删除后不可恢复

### 后台 — 数据统计
- **播放数据**: 每次播放页面加载时自动 +1，支持按日/周/月筛选（图表）
- **评论统计**: 评论总数、每视频评论数

### 错误处理
- 上传失败: 显示具体错误信息（文件太大/格式不支持）
- 评论失败: 显示具体错误
- 404: 自定义页面，非该用户视频显示友好提示

### 空状态
- 无视频: 大幅提示"暂无作品，敬请期待"
- 无评论: "还没有评论，成为第一个吧"

## 5. Component Inventory

### NavBar
- 固定顶部，背景从透明→深色半透明（滚动后）
- Logo（左侧）| 导航链接（右侧）
- 移动端: 汉堡菜单，侧滑抽屉

### VideoCard
- 封面图 (16:9)，hover 播放按钮浮现
- 标题（hover显示/卡片底部）
- 时长标签（右下角）
- 播放量（小字体，右下角）

### VideoPlayer
- 自定义播放器控制条（进度条+播放/暂停+音量+全屏）
- 封面图先显示，点击播放
- 键盘快捷键（空格暂停，左右跳转）

### CommentForm
- 留言内容 textarea（4行高）
- 称呼 input
- 联系方式 input
- 提交按钮（金色主按钮）

### CommentItem
- 头像占位（金色首字母圆）
- 称呼 + 时间
- 内容文本
- 联系方式（小字灰色，可选显示）

### AdminTable
- 列表头（可排序列）
- 封面缩略图 + 标题
- 播放量
- 操作按钮（编辑/删除）

### UploadZone
- 拖拽上传区（虚线边框，hover 高亮）
- 点击上传
- 上传进度条

### StatCard
- 图标 + 数字 + 标签
- hover 微上浮阴影

### Modal
- 背景遮罩（点击关闭）
- 内容区居中
- 关闭按钮

## 6. Technical Approach

### Stack
- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS v3 + CSS Variables
- **Database**: SQLite via `better-sqlite3`（本地文件，零配置）
- **Auth**: JWT（jsonwebtoken），bcrypt 密码
- **File Upload**: local filesystem (`/public/uploads/`)
- **API**: Next.js Route Handlers (App Router API routes)

### Data Model

```sql
-- 视频表
CREATE TABLE videos (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT NOT NULL,
  cover_url TEXT,
  duration INTEGER,  -- 秒
  views INTEGER DEFAULT 0,
  tags TEXT,        -- JSON array
  created_at TEXT,
  updated_at TEXT
);

-- 评论表
CREATE TABLE comments (
  id TEXT PRIMARY KEY,
  video_id TEXT NOT NULL,
  content TEXT NOT NULL,
  nickname TEXT,
  contact TEXT,
  created_at TEXT,
  FOREIGN KEY (video_id) REFERENCES videos(id)
);

-- 管理员账户
CREATE TABLE admin (
  id INTEGER PRIMARY KEY,
  username TEXT UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TEXT
);
```

### API Design

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/videos` | 获取视频列表 |
| GET | `/api/videos/[id]` | 获取单个视频（含播放量+1） |
| POST | `/api/videos` | 创建视频（需鉴权） |
| PUT | `/api/videos/[id]` | 更新视频（需鉴权） |
| DELETE | `/api/videos/[id]` | 删除视频（需鉴权） |
| GET | `/api/videos/[id]/comments` | 获取视频评论 |
| POST | `/api/videos/[id]/comments` | 提交评论 |
| GET | `/api/admin/stats` | 获取统计数据（需鉴权） |
| POST | `/api/auth/login` | 登录 |
| POST | `/api/auth/logout` | 登出 |

### Authentication
- 登录后 JWT token 存入 httpOnly cookie
- 后台 API 校验 cookie 中的 token
- 7天过期，自动续期

### File Structure
```
video-portfolio/
├── app/
│   ├── (front)/              # 前台页面组
│   │   ├── page.tsx          # 首页
│   │   ├── video/[id]/page.tsx
│   │   └── layout.tsx
│   ├── admin/                # 后台页面
│   │   ├── page.tsx          # 仪表盘
│   │   ├── login/page.tsx
│   │   ├── videos/page.tsx
│   │   ├── upload/page.tsx
│   │   └── edit/[id]/page.tsx
│   ├── api/                  # API Routes
│   │   ├── videos/
│   │   ├── comments/
│   │   ├── admin/
│   │   └── auth/
│   ├── layout.tsx
│   └── globals.css
├── components/               # React 组件
├── lib/                      # 工具函数、数据库
├── public/
│   └── uploads/              # 上传文件目录
├── package.json
├── tailwind.config.ts
├── next.config.js
└── SPEC.md
```