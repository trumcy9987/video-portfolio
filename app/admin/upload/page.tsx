'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { fetchWithProgress, formatFileSize, formatSpeed, formatRemaining, UploadProgress } from '@/lib/upload-helpers';

interface UploadState {
  stage: 'idle' | 'uploading' | 'saving' | 'done' | 'error';
  progress: UploadProgress | null;
  message: string;
  error: string;
}

export default function UploadPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [featured, setFeatured] = useState(true);

  // 视频来源
  const [videoSource, setVideoSource] = useState<'upload' | 'external'>('upload');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [externalVideoUrl, setExternalVideoUrl] = useState('');
  const [videoPreview, setVideoPreview] = useState('');

  // 封面来源
  const [coverSource, setCoverSource] = useState<'upload' | 'capture'>('upload');
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [externalCoverUrl, setExternalCoverUrl] = useState('');
  const [coverPreview, setCoverPreview] = useState('');

  const [duration, setDuration] = useState(0);

  // 统一上传状态
  const [upload, setUpload] = useState<UploadState>({
    stage: 'idle',
    progress: null,
    message: '',
    error: '',
  });

  const videoRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);
  const videoPlayerRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dropZoneVideoRef = useRef<HTMLDivElement>(null);
  const dropZoneCoverRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // 获取 B2 Native Upload URL
  const getUploadUrl = async (key: string, contentType: string): Promise<{ uploadUrl: string; authToken: string }> => {
    const res = await fetch(`/api/admin/upload-url?key=${encodeURIComponent(key)}&contentType=${encodeURIComponent(contentType)}`, { credentials: 'include' });
    if (!res.ok) {
      let errMsg = `获取上传链接失败 (HTTP ${res.status})`;
      try { const data = await res.json(); errMsg = data.error || errMsg; } catch {}
      throw new Error(errMsg);
    }
    const data = await res.json();
    if (!data.uploadUrl || !data.authToken) throw new Error(data.error || '获取上传链接失败');
    return { uploadUrl: data.uploadUrl, authToken: data.authToken };
  };

  // 客户端直传文件到 B2（通过 B2 Native Upload URL）
  const uploadFileDirect = async (
    file: File,
    { uploadUrl, authToken }: { uploadUrl: string; authToken: string },
    signal?: AbortSignal
  ): Promise<void> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      let lastLoaded = 0;
      let lastTime = Date.now();
      let smoothSpeed = 0;

      const onAbort = () => { xhr.abort(); reject(new Error('上传已取消')); };
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
        setUpload(prev => ({
          ...prev,
          progress: { loaded: e.loaded, total: e.total, percent: Math.round((e.loaded / e.total) * 100), speed: smoothSpeed, remaining: Math.round(remaining) },
        }));
        lastLoaded = e.loaded;
        lastTime = now;
      });

      xhr.addEventListener('load', () => {
        signal?.removeEventListener('abort', onAbort);
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else if (xhr.status === 0) {
          reject(new Error(`网络连接失败 - 请检查网络后重试`));
        } else if (xhr.status === 403) {
          reject(new Error(`上传授权失效，请刷新页面重试`));
        } else {
          reject(new Error(`上传失败 (HTTP ${xhr.status})`));
        }
      });

      xhr.addEventListener('error', () => {
        signal?.removeEventListener('abort', onAbort);
        reject(new Error(`网络连接失败，请检查网络后重试`));
      });

      xhr.addEventListener('timeout', () => {
        signal?.removeEventListener('abort', onAbort);
        reject(new Error(`上传超时，请重试`));
      });

      xhr.open('PUT', uploadUrl);
      xhr.setRequestHeader('Authorization', authToken);
      xhr.setRequestHeader('Content-Type', file.type);
      xhr.setRequestHeader('X-Bz-File-Name', encodeURIComponent(file.name));
      xhr.setRequestHeader('X-Bz-Content-Sha1', 'do-not-compute');
      xhr.timeout = 600000;
      xhr.send(file);
    });
  };
  // 预签名 URL 上传：先从服务端拿预签名 URL，客户端直传 B2（绕过 Vercel 4.5MB 限制）
  const uploadViaServer = (file: File, key: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      let lastLoaded = 0;
      let lastTime = Date.now();
      let smoothSpeed = 0;

      const onAbort = () => { xhr.abort(); reject(new Error('上传已取消')); };
      const signal = abortControllerRef.current?.signal;
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
        setUpload(prev => ({
          ...prev,
          progress: { loaded: e.loaded, total: e.total, percent: Math.round((e.loaded / e.total) * 100), speed: smoothSpeed, remaining: Math.round(remaining) },
        }));
        lastLoaded = e.loaded;
        lastTime = now;
      });

      xhr.addEventListener('load', () => {
        signal?.removeEventListener('abort', onAbort);
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(key);
        } else if (xhr.status === 0) {
          reject(new Error('网络连接失败，请检查网络后重试'));
        } else if (xhr.status === 403) {
          reject(new Error('上传授权失效，请刷新页面重试'));
        } else {
          reject(new Error(`上传失败 (HTTP ${xhr.status})`));
        }
      });

      xhr.addEventListener('error', () => {
        signal?.removeEventListener('abort', onAbort);
        reject(new Error('网络连接失败，请检查网络后重试'));
      });

      xhr.addEventListener('timeout', () => {
        signal?.removeEventListener('abort', onAbort);
        reject(new Error('上传超时，请重试'));
      });

      // Step 1: 从服务端获取 B2 Native 上传 URL
      fetch(`/api/admin/upload-url?key=${encodeURIComponent(key)}&contentType=${encodeURIComponent(file.type)}`, { credentials: 'include' })
        .then(res => {
          if (!res.ok) throw new Error(`获取上传链接失败 (HTTP ${res.status})`);
          return res.json();
        })
        .then(data => {
          if (!data.uploadUrl || !data.authToken) throw new Error(data.error || '获取上传链接失败');
          // Step 2: 客户端 POST 到 B2 Native 上传 URL
          xhr.open('POST', data.uploadUrl);
          xhr.setRequestHeader('Authorization', data.authToken);
          xhr.setRequestHeader('Content-Type', file.type);
          xhr.setRequestHeader('X-Bz-File-Name', file.name);
          xhr.setRequestHeader('X-Bz-Content-Sha1', 'do-not-compute');
          xhr.timeout = 600000;
          xhr.send(file);
        })
        .catch(err => {
          signal?.removeEventListener('abort', onAbort);
          reject(err);
        });
    });
  };
  // 拖放处理
  const setupDropZone = (
    ref: React.RefObject<HTMLDivElement | null>,
    accept: string,
    onFile: (file: File) => void,
    maxSizeMB?: number
  ) => {
    const el = ref.current;
    if (!el) return;

    const handleDragOver = (e: DragEvent) => { e.preventDefault(); el.classList.add('border-accent/60', 'bg-accent/5'); };
    const handleDragLeave = () => { el.classList.remove('border-accent/60', 'bg-accent/5'); };
    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      el.classList.remove('border-accent/60', 'bg-accent/5');
      const file = e.dataTransfer?.files[0];
      if (!file) return;
      if (!file.type.startsWith(accept.split('/')[0]) && !(accept === '*/*' && file.type.startsWith('video'))) {
        setUpload(prev => ({ ...prev, error: `不支持的文件类型：${file.type}` }));
        return;
      }
      if (maxSizeMB && file.size > maxSizeMB * 1024 * 1024) {
        setUpload(prev => ({ ...prev, error: `文件超过 ${maxSizeMB}MB 限制` }));
        return;
      }
      onFile(file);
    };

    el.addEventListener('dragover', handleDragOver);
    el.addEventListener('dragleave', handleDragLeave);
    el.addEventListener('drop', handleDrop);
    return () => {
      el.removeEventListener('dragover', handleDragOver);
      el.removeEventListener('dragleave', handleDragLeave);
      el.removeEventListener('drop', handleDrop);
    };
  };

  useEffect(() => {
    const cleanupVideo = setupDropZone(dropZoneVideoRef, 'video/*', (file) => {
      setVideoFile(file);
      setVideoPreview(URL.createObjectURL(file));
      setUpload(prev => ({ ...prev, error: '' }));
    }, 500);
    return () => { cleanupVideo?.(); };
  }, []);

  useEffect(() => {
    const cleanupCover = setupDropZone(dropZoneCoverRef, 'image/*', (file) => {
      setCoverFile(file);
      setCoverPreview(URL.createObjectURL(file));
      setCoverSource('upload');
      setUpload(prev => ({ ...prev, error: '' }));
    }, 20);
    return () => { cleanupCover?.(); };
  }, []);

  // 视频文件选择
  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setVideoFile(file);
    setVideoPreview(URL.createObjectURL(file));
    setUpload(prev => ({ ...prev, error: '' }));
  };

  const handleVideoLoaded = () => {
    if (videoPlayerRef.current) setDuration(Math.floor(videoPlayerRef.current.duration));
  };

  // 从视频截取封面
  const captureFrame = () => {
    const video = videoPlayerRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = video.videoWidth || 1920;
    canvas.height = video.videoHeight || 1080;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `cover_${Date.now()}.jpg`, { type: 'image/jpeg' });
      setCoverFile(file);
      setCoverPreview(URL.createObjectURL(blob));
      setCoverSource('capture');
    }, 'image/jpeg', 0.9);
  };

  // 封面文件选择
  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
    setCoverSource('upload');
    setUpload(prev => ({ ...prev, error: '' }));
  };

  // 提交上传
  const handleSubmit = async () => {
    if (!title.trim()) { setUpload(prev => ({ ...prev, error: '请填写标题' })); return; }
    if (videoSource === 'upload' && !videoFile) { setUpload(prev => ({ ...prev, error: '请选择视频文件' })); return; }
    if (videoSource === 'external' && !externalVideoUrl.trim()) { setUpload(prev => ({ ...prev, error: '请输入视频链接' })); return; }

    // 取消之前可能存在的上传
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    setUpload({ stage: 'uploading', progress: null, message: '准备上传...', error: '' });

    try {
      const timestamp = Date.now();
      const tagList = JSON.stringify(tags.split(',').map(t => t.trim()).filter(Boolean));
      let videoKey = '';
      let coverKey = '';
      let externalVideo = '';

      // 1. 上传视频（服务端上传到 B2）
      if (videoSource === 'upload' && videoFile) {
        setUpload(prev => ({ ...prev, message: '正在上传视频...' }));
        const videoKeyName = `videos/${timestamp}-${videoFile.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
        await uploadViaServer(videoFile, videoKeyName);
        videoKey = videoKeyName;
      } else {
        externalVideo = externalVideoUrl.trim();
      }

      // 2. 上传封面
      if (coverSource === 'upload' && coverFile) {
        setUpload(prev => ({ ...prev, message: '正在上传封面...' }));
        const coverKeyName = `covers/${timestamp}-cover.jpg`;
        await uploadViaServer(coverFile, coverKeyName);
        coverKey = coverKeyName;
      } else if (coverSource === 'capture' && coverFile) {
        setUpload(prev => ({ ...prev, message: '正在上传封面...' }));
        const coverKeyName = `covers/${timestamp}-cover.jpg`;
        await uploadViaServer(coverFile, coverKeyName);
        coverKey = coverKeyName;
      }

      // 3. 保存到数据库
      setUpload(prev => ({ ...prev, stage: 'saving', message: '保存视频信息...' }));
      const saveData = new FormData();
      saveData.append('title', title.trim());
      saveData.append('description', description.trim());
      saveData.append('tags', tagList);
      saveData.append('duration', duration.toString());
      saveData.append('featured', featured ? '1' : '0');
      if (videoKey) saveData.append('presigned_video_key', videoKey);
      if (externalVideo) saveData.append('external_video_url', externalVideo);
      if (coverKey) saveData.append('presigned_cover_key', coverKey);

      const res = await fetch('/api/videos', { method: 'POST', body: saveData, credentials: 'include' });
      const data = await res.json();

      if (data.success) {
        setUpload(prev => ({ ...prev, stage: 'done', message: '上传成功！' }));
        setTimeout(() => router.push('/admin/videos'), 1200);
      } else {
        setUpload(prev => ({ ...prev, stage: 'error', error: data.error || '保存失败' }));
      }
    } catch (err: any) {
      setUpload(prev => ({ ...prev, stage: 'error', error: err.message }));
    } finally {
      abortControllerRef.current = null;
    }
  };

  // 取消上传
  const handleCancel = () => {
    abortControllerRef.current?.abort();
    setUpload({ stage: 'idle', progress: null, message: '', error: '' });
  };

  const { stage, progress, message, error } = upload;

  return (
    <div className="max-w-3xl">
      <h2 className="font-display text-2xl mb-8">上传视频</h2>

      <div className="space-y-6">
        {/* ========== 视频来源 ========== */}
        <div>
          <label className="text-sm text-text2 mb-2 block font-mono tracking-wider">视频来源 *</label>
          <div className="flex gap-4 mb-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="videoSource" checked={videoSource === 'upload'} onChange={() => setVideoSource('upload')} className="accent-[#E8C97A]" />
              <span className="text-sm text-text2">上传文件</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="videoSource" checked={videoSource === 'external'} onChange={() => setVideoSource('external')} className="accent-[#E8C97A]" />
              <span className="text-sm text-text2">外部链接</span>
            </label>
          </div>

          {videoSource === 'upload' ? (
            <div
              ref={dropZoneVideoRef}
              onClick={() => videoRef.current?.click()}
              className={`border-2 border-dashed rounded p-6 text-center cursor-pointer transition-all duration-200 select-none ${
                videoFile
                  ? 'border-green/50 bg-green/5'
                  : 'border-border hover:border-accent/40 hover:bg-surface/50'
              }`}
            >
              {videoFile ? (
                <div className="space-y-1">
                  <p className="text-green text-sm font-medium">✓ {videoFile.name}</p>
                  <p className="text-text3 text-xs">{formatFileSize(videoFile.size)}</p>
                </div>
              ) : (
                <div>
                  <svg className="mx-auto mb-3 text-text3" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="text-text2 text-sm font-medium">拖拽视频文件到此处</p>
                  <p className="text-text3 text-xs mt-1">或点击选择文件 · 支持 MP4, MOV, AVI</p>
                  <p className="text-text3 text-xs mt-1">最大 500MB</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <input type="url" value={externalVideoUrl} onChange={e => setExternalVideoUrl(e.target.value)}
                placeholder="https://example.com/video.mp4 或 B站/YouTube嵌入链接"
                className="w-full bg-surface border border-border rounded px-4 py-2.5 text-sm text-text1 placeholder:text-text3 focus:border-accent/40 transition-colors" />
              <p className="text-text3 text-xs">支持直链视频或 B站/YouTube 嵌入地址</p>
            </div>
          )}
          <input ref={videoRef} type="file" accept="video/*" className="hidden" onChange={handleVideoChange} />
        </div>

        {/* ========== 视频预览 ========== */}
        {videoSource === 'upload' && videoPreview && (
          <div className="space-y-3">
            <label className="text-sm text-text2 block font-mono tracking-wider">视频预览</label>
            <div className="relative rounded overflow-hidden bg-surface">
              <video ref={videoPlayerRef} src={videoPreview} controls className="w-full max-h-[400px] object-contain" onLoadedMetadata={handleVideoLoaded} />
            </div>
            <div className="flex items-center gap-3">
              <button onClick={captureFrame} disabled={!videoPreview}
                className="px-4 py-2 bg-accent text-bg text-sm rounded hover:bg-accent-2 transition-colors disabled:opacity-50">
                截取当前帧为封面
              </button>
              <canvas ref={canvasRef} className="hidden" />
              {duration > 0 && (
                <span className="text-text3 text-xs font-mono">
                  时长：{Math.floor(duration / 60)}:{String(duration % 60).padStart(2, '0')}
                </span>
              )}
            </div>
          </div>
        )}

        {/* ========== 封面图 ========== */}
        <div>
          <label className="text-sm text-text2 mb-2 block font-mono tracking-wider">封面图</label>
          <div className="flex gap-4 mb-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="coverSource" checked={coverSource === 'upload'} onChange={() => setCoverSource('upload')} className="accent-[#E8C97A]" />
              <span className="text-sm text-text2">上传图片</span>
            </label>
            {videoSource === 'upload' && videoPreview && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="coverSource" checked={coverSource === 'capture'} onChange={() => setCoverSource('capture')} className="accent-[#E8C97A]" />
                <span className="text-sm text-text2">从视频截取</span>
              </label>
            )}
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="coverSource" checked={coverSource === 'external'} onChange={() => setCoverSource('external')} className="accent-[#E8C97A]" />
              <span className="text-sm text-text2">外部链接</span>
            </label>
          </div>

          {coverSource === 'upload' && (
            <div
              ref={dropZoneCoverRef}
              onClick={() => coverRef.current?.click()}
              className={`border-2 border-dashed rounded p-4 text-center cursor-pointer transition-all duration-200 select-none ${
                coverFile && coverSource === 'upload'
                  ? 'border-green/50 bg-green/5'
                  : 'border-border hover:border-accent/40 hover:bg-surface/50'
              }`}
            >
              {coverPreview && coverSource === 'upload' ? (
                <img src={coverPreview} alt="" className="max-h-40 mx-auto rounded" />
              ) : (
                <div>
                  <svg className="mx-auto mb-2 text-text3" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" />
                  </svg>
                  <p className="text-text3 text-xs">拖拽或点击上传 · JPG/PNG · 最大 20MB</p>
                </div>
              )}
            </div>
                    )}
          {coverSource === 'capture' && (
            <div className="flex items-center gap-3">
              <button onClick={captureFrame} disabled={!videoPreview}
                className="px-4 py-2 bg-accent text-bg text-sm rounded hover:bg-accent-2 transition-colors disabled:opacity-50">
                截取当前帧
              </button>
              {coverPreview && coverSource === 'capture' && <img src={coverPreview} alt="" className="h-16 rounded" />}
            </div>
                    )}
          <input ref={coverRef} type="file" accept="image/*" className="hidden" onChange={handleCoverChange} />
        </div>

        {/* ========== 基本信息 ========== */}
        <div>
          <label className="text-sm text-text2 mb-2 block font-mono tracking-wider">标题 *</label>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="输入视频标题" maxLength={100}
            className="w-full bg-surface border border-border rounded px-4 py-2.5 text-sm text-text1 placeholder:text-text3 focus:border-accent/40 transition-colors" />
        </div>
        <div>
          <label className="text-sm text-text2 mb-2 block font-mono tracking-wider">描述</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="视频简介（选填）" rows={4} maxLength={2000}
            className="w-full bg-surface border border-border rounded px-4 py-3 text-sm text-text1 placeholder:text-text3 focus:border-accent/40 transition-colors resize-none" />
        </div>
        <div>
          <label className="text-sm text-text2 mb-2 block font-mono tracking-wider">标签</label>
          <input value={tags} onChange={e => setTags(e.target.value)} placeholder="剧情, 短片, 2024（用逗号分隔多个标签）"
            className="w-full bg-surface border border-border rounded px-4 py-2.5 text-sm text-text1 placeholder:text-text3 focus:border-accent/40 transition-colors" />
        </div>

        {/* 精选开关 */}
        <div className="bg-surface border border-border rounded p-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={featured} onChange={e => setFeatured(e.target.checked)}
              className="w-5 h-5 mt-0.5 accent-[#E8C97A] shrink-0" />
            <div>
              <span className="text-sm text-text1 font-medium">设为精选作品</span>
              <p className="text-text3 text-xs mt-1">精选作品会在前台首页显示</p>
            </div>
          </label>
        </div>

        {/* ========== 上传进度条 ========== */}
        {stage !== 'idle' && (
          <div className="bg-surface border border-border rounded p-4 space-y-3">
            {stage === 'done' && (
              <div className="flex items-center gap-2 text-green text-sm font-medium">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                {message}
              </div>
            )}
            {stage === 'error' && (
              <div className="text-red text-sm">{error}</div>
            )}
            {(stage === 'uploading' || stage === 'saving') && progress && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text2">{message}</span>
                  <span className="text-sm font-mono text-accent">{progress.percent}%</span>
                </div>
                {/* 进度条 */}
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-accent rounded-full transition-all duration-300"
                    style={{ width: `${progress.percent}%` }} />
                </div>
                {/* 速度和剩余时间 */}
                <div className="flex items-center justify-between text-xs text-text3 font-mono">
                  <span>已上传 {formatFileSize(progress.loaded)} / {formatFileSize(progress.total)}</span>
                  <span>{formatSpeed(progress.speed)} · 剩余 {formatRemaining(progress.remaining)}</span>
                </div>
              </>
            )}
            {(stage === 'uploading' || stage === 'saving') && !progress && (
              <div className="flex items-center gap-2 text-sm text-text2">
                <div className="w-4 h-4 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
                {message}
              </div>
            )}
          </div>
        )}

        {/* 错误提示 */}
        {error && stage !== 'error' && (
          <p className="text-red text-sm">{error}</p>
        )}

        {/* 提交按钮 */}
        <button
          onClick={handleSubmit}
          disabled={stage === 'uploading' || stage === 'saving'}
          className="px-8 py-3 bg-accent text-bg font-medium rounded hover:bg-accent-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {stage === 'uploading' || stage === 'saving' ? '上传中...' : '确认上传'}
        </button>
      </div>
    </div>
  );
}
