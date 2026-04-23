/**
 * 前端通用工具函数
 */

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return '刚刚';
  if (minutes < 60) return minutes + '分钟前';
  if (hours < 24) return hours + '小时前';
  if (days < 7) return days + '天前';
  if (days < 30) return Math.floor(days / 7) + '周前';

  return d.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
}

export function formatNumber(num: number): string {
  if (num >= 10000) return (num / 10000).toFixed(1) + '万';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
  return num.toString();
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m + ':' + s.toString().padStart(2, '0');
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 10);
}

/**
 * 构建资源 URL，优先走 Cloudflare CDN，加速全球访问
 * - http(s):// 外部链接：直接返回
 * - /api/proxy/xxx：直接返回（走 Vercel → B2）
 * - /cdn/xxx：走 Cloudflare CDN Worker（CDN 加速）
 * - 其他路径：默认走 /api/proxy/ 前缀
 */
export function assetUrl(url: string | null | undefined): string {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  if (url.startsWith('/api/proxy/')) return url;
  if (url.startsWith('/cdn/')) return url;
  if (url.startsWith('/')) return '/api/proxy' + url;
  return '/api/proxy/' + url;
}
