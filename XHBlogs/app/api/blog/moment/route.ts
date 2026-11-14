import fs from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { MOMENTS_DIR, requireToken, shanghaiDateTime } from '@/lib/blogAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** 只认带时分的写法：2026-11-14T18:05 / 2026-11-14 18:05:30 / 带时区偏移的都算 */
const WITH_TIME = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/;

type Body = {
  content?: unknown;
  location?: unknown;
  date?: unknown;
  images?: unknown;
};

export async function POST(req: Request) {
  const bad = requireToken(req);
  if (bad) return NextResponse.json({ ok: false, error: bad }, { status: 401 });

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: '请求不是合法 JSON' }, { status: 400 });
  }

  const content = typeof body.content === 'string' ? body.content.trim() : '';
  if (!content) return NextResponse.json({ ok: false, error: '说说内容不能为空' }, { status: 400 });

  const now = new Date();
  const ts = now.getTime();
  const id = `moment-${ts}`;
  const rawDate = typeof body.date === 'string' ? body.date.trim() : '';
  const date = WITH_TIME.test(rawDate) ? rawDate : shanghaiDateTime(now);

  const images = Array.isArray(body.images)
    ? (body.images as unknown[])
        .filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
        .map((x) => x.trim())
    : [];

  const lines: string[] = ['---', `id: "${id}"`, `date: "${date}"`];
  const location = typeof body.location === 'string' ? body.location.trim() : '';
  if (location) lines.push(`location: "${location.replace(/"/g, '\\"')}"`);
  if (images.length > 0) {
    lines.push('images:');
    for (const u of images) lines.push(`  - '${u.replace(/'/g, "''")}'`);
  }
  lines.push('---', '');

  const markdown = lines.join('\n') + '\n' + content + '\n';
  await fs.mkdir(MOMENTS_DIR, { recursive: true });
  const file = path.join(MOMENTS_DIR, `${id}.md`);
  await fs.writeFile(file, markdown, 'utf8');

  return NextResponse.json({
    ok: true,
    id,
    file: `moments/${id}.md`,
    date,
    images: images.length,
    bytes: Buffer.byteLength(markdown),
  });
}