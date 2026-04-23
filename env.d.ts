/**
 * Vercel Postgres + Backblaze B2 环境变量类型声明
 */

interface Env {
  // Vercel Postgres（自动注入）
  POSTGRES_URL?: string;
  POSTGRES_PRISMA_URL?: string;
  POSTGRES_URL_NON_POOLING?: string;
  POSTGRES_USER?: string;
  POSTGRES_HOST?: string;
  POSTGRES_PASSWORD?: string;
  POSTGRES_DATABASE?: string;

  // Backblaze B2 存储
  B2_KEY_ID?: string;
  B2_APPLICATION_KEY?: string;
  B2_BUCKET_NAME?: string;
  B2_ENDPOINT?: string;
  B2_REGION?: string;
  B2_DOWNLOAD_DOMAIN?: string;

  // JWT 密钥
  TOKEN_SECRET?: string;
}
