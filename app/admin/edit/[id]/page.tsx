'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { assetUrl as globalAssetUrl } from '@/lib/utils';

// ── 类型定义 ──────────────────────────────────────────────
interface UploadProgress {
  loaded: number;
  total: number;
  percent: number;
  speed: number;
  remaining: number;
}

export default function EditVideoPage() {
  const params = useParams();
  const router = useRouter();
  const videoId = params.id as string;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [duration, setDuration] = useState(0);
  const [featured, setFeatured] = useState(false);
  const [currentCover, setCurrentCover] = useState('');
  const [currentVideo, setCurrentVideo] = useState('');
  const [newCover, setNewCover] = useState<File | null>(null);
  const [newVideo, setNewVideo] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState('');
  const [currentCoverUrl, setCurrentCoverUrl] = useState('');
  const [currentVideoUrl, setCurrentVideoUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  // 外部链接模式
  const [newCoverUrl, setNewCoverUrl] = useState('');
  const [newVideoUrl, setNewVideoUrl] = useState('');
  const [updateVideoSource, setUpdateVideoSource] = useState<'upload' | 'external' | 'keep'>('keep');
  const [updateCoverSource, setUpdateCoverSource] = useState<'upload' | 'external' | 'keep'>('keep');

  // ── 工具函数 ──────────────────────────────────────────────
  const assetUrl = useCallback((url: string | null | undefined): string => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    if (url.startsWith('/api/proxy/')) return url;
    if (url.startsWith('/')) return `/api/proxy${url}`;
    return `/api/proxy/${url}`;
  }, []);
  
  // 上传进度状态
  const [uploadStage, setUploadStage] = useState<'idle' | 'uploading' | 'saving' | 'error'>('idle');
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [uploadMessage, setUploadMessage] = useState('');
  
  const coverRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // ── 工具函数 ──────────────────────────────────────────────
  const formatFileSize = useCallback((bytes: number): string => {
    if (bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const size = bytes / Math.pow(1024, i);
    return `${size.toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
  }, []);

  const formatTime = useCallback((seconds: number): string => {
    if (seconds < 60) return `${Math.round(seconds)}秒`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}分${Math.round(seconds % 60)}秒`;
    return `${Math.floor(seconds / 3600)}时${Math.floor((seconds % 3600) / 60)}分`;
  }, []);

  // ── Presigned URL 获取 ──────────────────────────────────────────────
  const getPresignedUrl = async (key: string, contentType: string): Promise<string> => {
    const res = await fetch(`/api/admin/upload-url?key=${encodeURIComponent(key)}&contentType=${encodeURIComponent(contentType)}`);
    if (!res.ok) {
      let errMsg = `获取上传链接失败 (HTTP ${res.status})`;
      try {
        const data = await res.json();
        errMsg = data.error || errMsg;
      } catch {}
      throw new Error(errMsg);
    }
    const data = await res.json();
    if (!data.uploadUrl) throw new Error(data.error || '获取上传链接失败');
    return data.uploadUrl;
  };

  // ── XHR 直传 B2（带进度）──────────────────────────────────────────────
  const uploadFileDirect = async (
    file: File,
    presignedUrl: string,
    onProgress?: (p: UploadProgress) => void,
    signal?: AbortSignal
  ): Promise<void> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      let lastLoaded = 0;
      let lastTime = Date.now();
      let smoothSpeed = 0;

      const onAbort = () => {
        xhr.abort();
        reject(new Error('上传已取消'));
      };
      signal?.addEventListener('abort', onAbort);

      xhr.upload.addEventListener('progress', (e) => {
        if (!e.lengthComputable) return;
        const now = Date.now();
        const timeDelta = (now - lastTime) / 1000;
        const bytesDelta = e.loaded - lastLoaded;
        
        if (timeDelta > 0) {
          const instantSpeed = bytesDelta / timeDelta;
          smoothSpeed = smoothSpeed === 0 ? instantSpeed : smoothSpeed * 0.7 + instantSpeed * 0.3;
        }
        
        const remaining = smoothSpeed > 0 ? (e.total - e.loaded) / smoothSpeed : 0;
        
        onProgress?.({
          loaded: e.loaded,
          total: e.total,
          percent: Math.round((e.loaded / e.total) * 100),
          speed: smoothSpeed,
          remaining: Math.round(remaining),
        });
        
        lastLoaded = e.loaded;
        lastTime = now;
      });

      xhr.addEventListener('load', () => {
        signal?.removeEventListener('abort', onAbort);
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else if (xhr.status === 0) {
          reject(new Error(`网络错误（可能是 CORS 问题）- 已上传 ${formatFileSize(lastLoaded)}`));
        } else if (xhr.status === 403) {
          reject(new Error('上传链接已过期，请刷新页面重试'));
        } else {
          reject(new Error(`上传失败 (HTTP ${xhr.status}) - 已上传 ${formatFileSize(lastLoaded)}`));
        }
      });

      xhr.addEventListener('error', () => {
        signal?.removeEventListener('abort', onAbort);
        reject(new Error(`网络连接失败 - 已上传 ${formatFileSize(lastLoaded)}，请检查网络或刷新页面后重试`));
      });

      xhr.addEventListener('timeout', () => {
        signal?.removeEventListener('abort', onAbort);
        reject(new Error(`上传超时 - 已上传 ${formatFileSize(lastLoaded)}，请重试`));
      });

      xhr.open('PUT', presignedUrl);
      xhr.setRequestHeader('Content-Type', file.type);
      xhr.timeout = 600000;
      xhr.send(file);
    });
  };

  useEffect(() => {
    fetch(`/api/videos/${videoId}`)
      .then(r => r.json())
      .then(data => {
        if (data.video) {
          const v = data.video;
          setTitle(v.title);
          setDescription(v.description || '');
          setTags((v.tags || []).join(', '));
          setDuration(v.duration || 0);
          setFeatured(!!v.featured);
          setCurrentCoverUrl(assetUrl(v.cover_url) || '');
          setCurrentVideoUrl(assetUrl(v.video_url) || '');
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [videoId]);

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setNewCover(file);
    setCoverPreview(URL.createObjectURL(file));
    setUpdateCoverSource('upload');
  };

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setNewVideo(file);
    setUpdateVideoSource('upload');
  };

  const handleSave = async () => {
    if (!title.trim()) { setMessage('请填写标题'); return; }
    setSaving(true);
    setMessage('');

    const formData = new FormData();
    formData.append('id', videoId);
    formData.append('title', title.trim());
    formData.append('description', description.trim());
    formData.append('tags', JSON.stringify(tags.split(',').map(t => t.trim()).filter(Boolean)));
    formData.append('featured', featured ? '1' : '0');
    
    // 根据选择的来源决定上传什么
    if (updateCoverSource === 'upload' && newCover) {
      formData.append('cover', newCover);
    } else if (updateCoverSource === 'external' && newCoverUrl.trim()) {
      formData.append('external_cover_url', newCoverUrl.trim());
    }
    
    if (updateVideoSource === 'upload' && newVideo) {
      formData.append('video', newVideo);
    } else if (updateVideoSource === 'external' && newVideoUrl.trim()) {
      formData.append('external_video_url', newVideoUrl.trim());
    }

    try {
      const res = await fetch('/api/videos', { method: 'PUT', body: formData });
      const data = await res.json();
      if (data.success) {
        router.push('/admin/videos');
      } else {
        setMessage(data.error || '保存失败');
      }
    } catch {
      setMessage('网络错误');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => router.back()} className="text-text3 hover:text-accent transition-colors">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="font-display text-2xl">编辑视频</h2>
      </div>

      <div className="space-y-6">
        {/* 视频链接 */}
        <div>
          <label className="text-sm text-text2 mb-2 block font-mono tracking-wider">当前视频</label>
          <div className="bg-surface border border-border rounded overflow-hidden max-w-md">
            {currentVideoUrl ? (
              <video
                src={currentVideoUrl}
                controls
                className="w-full max-h-48 object-contain bg-black"
              />
            ) : (
              <div className="p-4 text-text3 text-sm">暂无视频</div>
            )}
          </div>
          
          {/* 视频更新选项 */}
          <div className="mt-3 space-y-2">
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="videoSource" checked={updateVideoSource === 'keep'} onChange={() => setUpdateVideoSource('keep')} className="accent-[#E8C97A]" />
                <span className="text-sm text-text2">保持不变</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="videoSource" checked={updateVideoSource === 'upload'} onChange={() => setUpdateVideoSource('upload')} className="accent-[#E8C97A]" />
                <span className="text-sm text-text2">上传新视频</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="videoSource" checked={updateVideoSource === 'external'} onChange={() => setUpdateVideoSource('external')} className="accent-[#E8C97A]" />
                <span className="text-sm text-text2">外部链接</span>
              </label>
            </div>
            
            {updateVideoSource === 'upload' && (
              <div>
                <button onClick={() => videoRef.current?.click()} className="px-4 py-2 border border-border rounded text-sm text-text2 hover:border-accent/50 transition-colors">
                  {newVideo ? `已选择: ${newVideo.name}` : '选择视频文件'}
                </button>
                <input ref={videoRef} type="file" accept="video/*" className="hidden" onChange={handleVideoChange} />
              </div>
            )}
            
            {updateVideoSource === 'external' && (
              <input
                type="url"
                value={newVideoUrl}
                onChange={e => setNewVideoUrl(e.target.value)}
                placeholder="https://example.com/video.mp4"
                className="w-full bg-surface border border-border rounded px-4 py-2.5 text-sm text-text1 placeholder:text-text3 focus:border-accent/40 transition-colors"
              />
            )}
          </div>
        </div>

        {/* 封面图 */}
        <div>
          <label className="text-sm text-text2 mb-2 block font-mono tracking-wider">当前封面</label>
          <div className="w-full max-w-sm">
            {currentCoverUrl ? (
              <img
                src={currentCoverUrl}
                alt=""
                className="w-full aspect-video object-cover rounded"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            ) : (
              <div className="w-full aspect-video bg-muted rounded flex items-center justify-center text-text3 text-sm">暂无封面</div>
            )}
          </div>
          
          {/* 封面更新选项 */}
          <div className="mt-3 space-y-2">
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="coverSource" checked={updateCoverSource === 'keep'} onChange={() => setUpdateCoverSource('keep')} className="accent-[#E8C97A]" />
                <span className="text-sm text-text2">保持不变</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="coverSource" checked={updateCoverSource === 'upload'} onChange={() => setUpdateCoverSource('upload')} className="accent-[#E8C97A]" />
                <span className="text-sm text-text2">上传新图片</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="coverSource" checked={updateCoverSource === 'external'} onChange={() => setUpdateCoverSource('external')} className="accent-[#E8C97A]" />
                <span className="text-sm text-text2">外部链接</span>
              </label>
            </div>
            
            {updateCoverSource === 'upload' && (
              <div>
                <button onClick={() => coverRef.current?.click()} className="px-4 py-2 border border-border rounded text-sm text-text2 hover:border-accent/50 transition-colors">
                  {newCover ? `已选择: ${newCover.name}` : '选择封面图片'}
                </button>
                <input ref={coverRef} type="file" accept="image/*" className="hidden" onChange={handleCoverChange} />
              </div>
            )}
            
            {updateCoverSource === 'external' && (
              <div className="space-y-2">
                <input
                  type="url"
                  value={newCoverUrl}
                  onChange={e => setNewCoverUrl(e.target.value)}
                  placeholder="https://example.com/cover.jpg"
                  className="w-full bg-surface border border-border rounded px-4 py-2.5 text-sm text-text1 placeholder:text-text3 focus:border-accent/40 transition-colors"
                />
                {newCoverUrl && (
                  <img 
                    src={newCoverUrl} 
                    alt="预览" 
                    className="h-24 rounded"
                    onError={() => setNewCoverUrl('')}
                  />
                )}
              </div>
            )}
          </div>
        </div>

        {/* 基本信息 */}
        <div>
          <label className="text-sm text-text2 mb-2 block font-mono tracking-wider">标题</label>
          <input value={title} onChange={e => setTitle(e.target.value)}
            className="w-full bg-surface border border-border rounded px-4 py-2.5 text-sm text-text1 focus:border-accent/40 transition-colors" />
        </div>

        <div>
          <label className="text-sm text-text2 mb-2 block font-mono tracking-wider">描述</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={4}
            className="w-full bg-surface border border-border rounded px-4 py-3 text-sm text-text1 focus:border-accent/40 transition-colors resize-none" />
        </div>

        <div>
          <label className="text-sm text-text2 mb-2 block font-mono tracking-wider">标签</label>
          <input value={tags} onChange={e => setTags(e.target.value)} placeholder="用逗号分隔"
            className="w-full bg-surface border border-border rounded px-4 py-2.5 text-sm text-text1 placeholder:text-text3 focus:border-accent/40 transition-colors" />
        </div>

        <div className="flex items-center pb-6">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={featured} onChange={e => setFeatured(e.checked)} className="w-4 h-4 accent-[#E8C97A]" />
              <span className="text-sm text-text2">设为精选作品</span>
            </label>
          </div>

        {message && <p className="text-red text-sm">{message}</p>}
        <div className="flex gap-3">
          <button onClick={handleSave} disabled={saving}
            className="px-8 py-3 bg-accent text-bg font-medium rounded hover:bg-accent-2 transition-colors disabled:opacity-50">
            {saving ? '保存中...' : '保存修改'}
          </button>
          <button onClick={() => router.back()}
            className="px-6 py-3 border border-border rounded text-text2 text-sm hover:border-accent/50 transition-colors">取消</button>
        </div>
      </div>
    </div>
  );
}
