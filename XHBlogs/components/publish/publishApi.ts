'use client';

/**
 * 前台发布用的小工具：全部走 cookie 鉴权（httpOnly `qj_blog_token`），
 * 前端不接触密钥原文，fetch 同源自动带 cookie。
 */

export type UploadedFile = { url: string; size: number; name: string };

export type PublishState = {
  state?: 'building' | 'done' | 'build_failed' | 'http_failed' | 'failed';
  message?: string;
  at?: string;
  pending?: boolean;
};

async function asJson(res: Response) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { ok: false, error: `服务端返回了非 JSON 内容（HTTP ${res.status}）` };
  }
}

export async function uploadFiles(files: File[]): Promise<UploadedFile[]> {
  if (files.length === 0) return [];
  const fd = new FormData();
  for (const f of files) fd.append('file', f, f.name);
  const res = await fetch('/api/blog/upload', { method: 'POST', body: fd });
  const data = await asJson(res);
  if (!res.ok || !data.ok) throw new Error(data.error || `上传失败（HTTP ${res.status}）`);
  return data.files as UploadedFile[];
}

export async function postMoment(input: {
  content: string;
  location?: string;
  images?: string[];
}) {
  const res = await fetch('/api/blog/moment', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
  const data = await asJson(res);
  if (!res.ok || !data.ok) throw new Error(data.error || `保存失败（HTTP ${res.status}）`);
  return data as { ok: true; id: string; file: string; date: string; images: number };
}

export async function albumAction(body: Record<string, unknown>) {
  const res = await fetch('/api/blog/album', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await asJson(res);
  if (!res.ok || !data.ok) throw new Error(data.error || `相册操作失败（HTTP ${res.status}）`);
  return data;
}

export async function requestPublish(): Promise<void> {
  const res = await fetch('/api/blog/publish', { method: 'POST' });
  const data = await asJson(res);
  if (!res.ok || !data.queued) throw new Error(data.error || `排队失败（HTTP ${res.status}）`);
}

export async function readPublishState(): Promise<PublishState> {
  const res = await fetch('/api/blog/publish', { cache: 'no-store' });
  const data = await asJson(res);
  return (data.state || data) as PublishState;
}

/** 轮询到 done / failed，最多约 4 分钟（build 通常 60–90 秒） */
export async function waitForPublish(
  onTick?: (s: PublishState) => void,
  timeoutMs = 240_000,
): Promise<PublishState> {
  const started = Date.now();
  let last: PublishState = {};
  while (Date.now() - started < timeoutMs) {
    try {
      last = await readPublishState();
      onTick?.(last);
      if (last.state === 'done') return last;
      if (last.state === 'failed' || last.state === 'build_failed' || last.state === 'http_failed') {
        return last;
      }
    } catch {
      /* 构建期间连接抖动，继续轮询 */
    }
    await new Promise((r) => setTimeout(r, 3000));
  }
  return { ...last, state: last.state ?? 'failed', message: '等待构建超时，请稍后刷新页面看看' };
}

export function todayShanghai(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai' }).format(new Date());
}