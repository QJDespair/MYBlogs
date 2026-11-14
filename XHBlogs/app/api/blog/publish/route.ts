import fs from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { RUNTIME_DIR, requireToken } from '@/lib/blogAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const REQUEST_FILE = path.join(RUNTIME_DIR, 'publish-request');
export const STATE_FILE = path.join(RUNTIME_DIR, 'publish-state.json');

/** 触发上线：只写一个请求文件，由 systemd path 单元以 root 身份跑 apply-local.sh（Next 进程是 blog 用户，动不了 systemctl / git） */
export async function POST(req: Request) {
  const bad = requireToken(req);
  if (bad) return NextResponse.json({ ok: false, error: bad }, { status: 401 });

  try {
    await fs.mkdir(RUNTIME_DIR, { recursive: true });
    await fs.writeFile(REQUEST_FILE, `${new Date().toISOString()}\n`, 'utf8');
    return NextResponse.json({ ok: true, queued: true, at: new Date().toISOString() });
  } catch (err) {
    return NextResponse.json({ ok: false, error: `无法写入发布请求：${(err as Error).message}` }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const bad = requireToken(req);
  if (bad) return NextResponse.json({ ok: false, error: bad }, { status: 401 });

  let state: unknown = null;
  try {
    state = JSON.parse(await fs.readFile(STATE_FILE, 'utf8'));
  } catch {
    state = null;
  }
  let pending = false;
  try {
    await fs.access(REQUEST_FILE);
    pending = true;
  } catch {
    pending = false;
  }
  return NextResponse.json({ ok: true, pending, state });
}