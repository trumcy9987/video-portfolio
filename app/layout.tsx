import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '作品集 | Film Portfolio',
  description: '个人视频作品展示',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-bg text-text1 antialiased">
        {children}
      </body>
    </html>
  );
}