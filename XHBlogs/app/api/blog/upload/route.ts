import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { MAX_UPLOAD_BYTES, UPLOAD_ROOT, pickExt, requireToken } from '@/lib/blogAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const bad = requireToken(req);
  if (bad) return NextResponse.json({ ok: false, error: bad }, { status: 401 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ ok: false, error: '请求不是 multipart/form-data' }, { status: 400 });
  }

  const files = form.getAll('file').filter((f): f is File => f instanceof File);
  if (files.length === 0) {
    return NextResponse.json({ ok: false, error: '没有收到文件字段 file' }, { status: 400 });
  }

  const now = new Date();
  const yyyy = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric' }).format(now);
  const mm = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', month: '2-digit' }).format(now);
  const dir = path.join(UPLOAD_ROOT, yyyy, mm);
  await fs.mkdir(dir, { recursive: true });

  const saved: { url: string; size: number; name: string }[] = [];
  const skipped: { name: string; reason: string }[] = [];

  for (const f of files) {
    const ext = pickExt(f.name, f.type);
    if (!ext) {
      skipped.push({ name: f.name || '(未命名)', reason: `不支持的格式 ${f.type || path.extname(f.name) || '未知'}` });
      continue;
    }
    if (f.size > MAX_UPLOAD_BYTES) {
      skipped.push({ name: f.name || '(未命名)', reason: `超过 ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)}MB` });
      continue;
    }
    if (f.size === 0) {
      skipped.push({ name: f.name || '(未命名)', reason: '空文件' });
      continue;
    }
    const name = crypto.randomBytes(8).toString('hex') + ext;
    const buf = Buffer.from(await f.arrayBuffer());
    const target = path.join(dir, name);
    await fs.writeFile(target, buf, { mode: 0o644 });
    saved.push({ url: `/uploads/${yyyy}/${mm}/${name}`, size: buf.length, name: f.name || name });
  }

  if (saved.length === 0) {
    return NextResponse.json({ ok: false, error: '没有可保存的图片', skipped }, { status: 400 });
  }
  return NextResponse.json({ ok: true, files: saved, skipped });
}