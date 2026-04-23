'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

interface B2ImageProps {
  src: string; // B2 file key
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  fill?: boolean;
  objectFit?: 'contain' | 'cover' | 'fill' | 'none';
}

export default function B2Image({ src, alt, width, height, className, fill, objectFit = 'cover' }: B2ImageProps) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!src) {
      setLoading(false);
      return;
    }

    // 如果是完整 URL（如 Blob URL 或外部链接），直接使用
    if (src.startsWith('http')) {
      setSignedUrl(src);
      setLoading(false);
      return;
    }

    // 否则获取签名 URL
    fetch(`/api/signed-url?key=${encodeURIComponent(src)}`)
      .then(res => res.json())
      .then(data => {
        if (data.url) setSignedUrl(data.url);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [src]);

  if (loading) {
    return <div className={`${className} bg-surface animate-pulse`} style={{ width, height }} />;
  }

  if (!signedUrl) {
    return null;
  }

  if (fill) {
    return (
      <Image
        src={signedUrl}
        alt={alt}
        fill
        className={className}
        style={{ objectFit }}
        unoptimized // B2 签名 URL 无法预优化
      />
    );
  }

  return (
    <Image
      src={signedUrl}
      alt={alt}
      width={width || 100}
      height={height || 100}
      className={className}
      style={{ objectFit }}
      unoptimized
    />
  );
}