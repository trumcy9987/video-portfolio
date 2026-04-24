# Cloudflare Worker — B2 Cache Proxy

将此 Worker 部署到 Cloudflare，作为 Backblaze B2 私有 Bucket 的缓存代理，替代 Vercel Serverless 的 `/api/proxy/` 路由。

## 为什么需要它

- Vercel Serverless 函数位于美国 (iad1)，B2 也在美国，大文件（29MB 视频）容易超时
- Cloudflare Worker 全球边缘节点，自带 Cache API，天然适合做 CDN 缓存
- 图片缓存 1 年，视频缓存 7 天，大幅减少回源

## 部署步骤

### 1. 创建 Worker

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 进入 **Workers & Pages** → **创建 Worker**
3. 给 Worker 起个名字（如 `b2-cache-proxy`）
4. 点击 **部署**，然后 **编辑代码**
5. 将 `worker.js` 的内容粘贴进去，保存部署

### 2. 设置环境变量

在 Worker 的 **设置** → **变量和机密** 中添加：

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `B2_KEY_ID` | `0058712efa9b6b30000000002` | B2 Application Key ID |
| `B2_APP_KEY` | `K005bcwhYhGbQmkiRy4pe4DV4PjKEiI` | B2 Application Key |
| `B2_BUCKET` | `video-website` | Bucket 名称 |
| `B2_ENDPOINT` | `https://s3.us-east-005.backblazeb2.com` | S3 兼容 Endpoint |
| `B2_REGION` | `us-east-005` | Region（可选，有默认值） |

### 3. 绑定自定义路由

**方案 A：独立子域名**

1. 在 Cloudflare Dashboard 进入你的域名（如 ccwu.cc）
2. **Workers 路由** → **添加路由**
3. 路由：`cdn.ccwu.cc/*`，Worker：选择刚创建的 Worker
4. 确保 DNS 中 `cdn.ccwu.cc` 有 A 记录或 CNAME（指向 `192.0.2.1` 占位 IP 也可以）

**方案 B：路径路由**

1. 在 **Workers 路由** → **添加路由**
2. 路由：`ccwu.cc/cdn/*`，Worker：选择刚创建的 Worker

### 4. 切换前端 CDN

在 Vercel 项目环境变量中设置：

```
CDN_BASE_URL=https://cdn.ccwu.cc
```

设置后重新部署，`assetUrl()` 会自动将资源路径指向 Cloudflare Worker。

如果需要回退，只需清空 `CDN_BASE_URL` 即可恢复 `/api/proxy/`。

## 功能

- ✅ 图片缓存 1 年 (`public, max-age=31536000, immutable`)
- ✅ 视频缓存 7 天 (`public, max-age=604800`)
- ✅ Range 请求支持（视频拖动进度条）
- ✅ CORS (`Access-Control-Allow-Origin: *`)
- ✅ 错误处理（404、500）
- ✅ ETag / Last-Modified 透传
