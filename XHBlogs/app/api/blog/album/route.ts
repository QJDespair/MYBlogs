import fs from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';
import {
  type Album,
  type Photo,
  requireToken,
  shanghaiDate,
} from '@/lib/blogAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// 相册落 data/albums.json（运行时读盘），不再改写 TS 常量 → 建相册无需重新构建
const ALBUMS_JSON = path.join(process.cwd(), 'data', 'albums.json');

async function readAlbums(): Promise<Album[]> {
  try {
    const parsed = JSON.parse(await fs.readFile(ALBUMS_JSON, 'utf8'));
    const list = Array.isArray(parsed)
      ? parsed
      : Array.isArray((parsed as any)?.albums)
        ? (parsed as any).albums
        : [];
    return list.filter((a: any) => a && typeof a.id === 'string') as Album[];
  } catch {
    return [];
  }
}

async function saveAlbums(albums: Album[]): Promise<void> {
  const tmp = `${ALBUMS_JSON}.tmp`;
  await fs.writeFile(tmp, `${JSON.stringify(albums, null, 2)}\n`, 'utf8');
  await fs.rename(tmp, ALBUMS_JSON);
}

function toPhotos(input: unknown): Photo[] {
  if (!Array.isArray(input)) return [];
  const out: Photo[] = [];
  for (const item of input) {
    if (typeof item === 'string' && item.trim()) {
      out.push({ url: item.trim() });
      continue;
    }
    if (item && typeof item === 'object') {
      const rec = item as Record<string, unknown>;
      const url = typeof rec.url === 'string' ? rec.url.trim() : '';
      if (!url) continue;
      const caption = typeof rec.caption === 'string' ? rec.caption.trim() : '';
      out.push(caption ? { url, caption } : { url });
    }
  }
  return out;
}

export async function GET(req: Request) {
  const bad = requireToken(req);
  if (bad) return NextResponse.json({ ok: false, error: bad }, { status: 401 });
  try {
    const albums = await readAlbums();
    return NextResponse.json({ ok: true, albums });
  } catch (err) {
    return NextResponse.json({ ok: false, error: `读取 albums.ts 失败：${(err as Error).message}` }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const bad = requireToken(req);
  if (bad) return NextResponse.json({ ok: false, error: bad }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: '请求不是合法 JSON' }, { status: 400 });
  }

  const action = typeof body.action === 'string' ? body.action : '';
  let albums: Album[];
  try {
    albums = await readAlbums();
  } catch (err) {
    return NextResponse.json({ ok: false, error: `读取 albums.ts 失败：${(err as Error).message}` }, { status: 500 });
  }

  if (action === 'create') {
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    if (!title) return NextResponse.json({ ok: false, error: '相册标题不能为空' }, { status: 400 });
    const photos = toPhotos(body.photos);
    const cover = typeof body.cover === 'string' && body.cover.trim() ? body.cover.trim() : photos[0]?.url || '';
    const album: Album = {
      id: `album-${Date.now()}`,
      title,
      description: typeof body.description === 'string' ? body.description.trim() : '',
      cover,
      date:
        typeof body.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.date.trim())
          ? body.date.trim()
          : shanghaiDate(),
      photos,
    };
    albums.push(album);
    await saveAlbums(albums);
    return NextResponse.json({ ok: true, album, total: albums.length });
  }

  if (action === 'addPhotos') {
    const id = typeof body.id === 'string' ? body.id : '';
    const idx = albums.findIndex((a) => a.id === id);
    if (idx < 0) return NextResponse.json({ ok: false, error: `找不到相册 ${id}` }, { status: 404 });
    const photos = toPhotos(body.photos);
    if (photos.length === 0) return NextResponse.json({ ok: false, error: '没有可添加的照片' }, { status: 400 });
    albums[idx].photos = [...(albums[idx].photos || []), ...photos];
    if (!albums[idx].cover) albums[idx].cover = photos[0].url;
    await saveAlbums(albums);
    return NextResponse.json({ ok: true, album: albums[idx], added: photos.length });
  }

  if (action === 'update') {
    const id = typeof body.id === 'string' ? body.id : '';
    const idx = albums.findIndex((a) => a.id === id);
    if (idx < 0) return NextResponse.json({ ok: false, error: `找不到相册 ${id}` }, { status: 404 });
    const a = albums[idx];
    if (typeof body.title === 'string' && body.title.trim()) a.title = body.title.trim();
    if (typeof body.description === 'string') a.description = body.description.trim();
    if (typeof body.cover === 'string' && body.cover.trim()) a.cover = body.cover.trim();
    if (typeof body.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.date.trim())) a.date = body.date.trim();
    await saveAlbums(albums);
    return NextResponse.json({ ok: true, album: a });
  }

  if (action === 'delete') {
    const id = typeof body.id === 'string' ? body.id : '';
    const before = albums.length;
    albums = albums.filter((a) => a.id !== id);
    if (albums.length === before) return NextResponse.json({ ok: false, error: `找不到相册 ${id}` }, { status: 404 });
    await saveAlbums(albums);
    return NextResponse.json({ ok: true, removed: id, total: albums.length });
  }

  return NextResponse.json({ ok: false, error: `未知 action：${action}` }, { status: 400 });
}