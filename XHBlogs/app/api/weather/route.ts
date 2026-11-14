// app/api/weather/route.ts
//
// 和风天气代理。三种凭据，按优先级尝试：
//   1) API KEY（新控制台「凭据」页给的 key）：
//        QWEATHER_API_HOST=<控制台「设置 → API Host」里那一串，形如 abcdefg.re.qweatherapi.com>
//        QWEATHER_API_KEY=<API KEY>
//      —— 新版凭据是「一个凭据绑定一个专属域名」，用公共 api.qweather.com 会返回
//        403 Invalid Host，所以 Host 必须填对。
//   2) JWT：QWEATHER_PROJECT_ID + QWEATHER_CREDENTIAL_ID + QWEATHER_PRIVATE_KEY_PATH
//      —— Ed25519 私钥现签，15 分钟有效，进程内缓存，不落盘。
//   3) 旧版静态 Token（QWEATHER_KEY）：仅当账号还能签发这种 key 时可用。
//
// QWEATHER_LOCATION 覆盖城市（默认 101010100 北京），也可用 ?location= 临时覆盖。

import { NextResponse } from 'next/server';
import { readFileSync } from 'node:fs';
import { createPrivateKey, sign } from 'node:crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

let cache: { token: string; exp: number } = { token: '', exp: 0 };

const b64url = (v: string | Buffer) => Buffer.from(v).toString('base64url');

function mintJwt(): string | null {
  const projectId = process.env.QWEATHER_PROJECT_ID?.trim();
  const credId = process.env.QWEATHER_CREDENTIAL_ID?.trim();
  const keyPath = process.env.QWEATHER_PRIVATE_KEY_PATH?.trim();
  if (!projectId || !credId || !keyPath) return null;

  const now = Math.floor(Date.now() / 1000);
  if (cache.token && cache.exp - 60 > now) return cache.token;

  try {
    const header = b64url(JSON.stringify({ alg: 'EdDSA', kid: credId }));
    const exp = now + 900;
    const payload = b64url(JSON.stringify({ sub: projectId, iat: now - 30, exp }));
    const data = `${header}.${payload}`;
    const pem = readFileSync(keyPath, 'utf8');
    const signature = sign(null, Buffer.from(data), createPrivateKey(pem)).toString('base64url');
    cache = { token: `${data}.${signature}`, exp };
    return cache.token;
  } catch {
    return null;
  }
}

type Strategy = { name: string; base: string; headers: Record<string, string>; why: string };

function strategies(): Strategy[] {
  const out: Strategy[] = [];
  const apiKey = process.env.QWEATHER_API_KEY?.trim();
  const apiHost = process.env.QWEATHER_API_HOST?.trim()
    .replace(/^https?:\/\//, '')
    .replace(/\/+$/, '');

  if (apiKey) {
    const host = apiHost || 'api.qweather.com';
    out.push({
      name: apiHost ? 'apikey' : 'apikey(nohost)',
      base: `https://${host}/v7/weather/now`,
      headers: { 'X-QW-Api-Key': apiKey },
      why: apiHost ? '' : 'QWEATHER_API_HOST 未配置；新版凭据必须用它绑定的专属 Host',
    });
  }

  const jwt = mintJwt();
  if (jwt) {
    for (const host of ['https://api.qweather.com', 'https://devapi.qweather.com']) {
      out.push({
        name: 'jwt',
        base: `${host}/v7/weather/now`,
        headers: { Authorization: `Bearer ${jwt}` },
        why: '',
      });
    }
  }

  const staticKey = process.env.QWEATHER_KEY?.trim();
  if (staticKey) {
    for (const host of ['https://devapi.qweather.com', 'https://api.qweather.com']) {
      out.push({
        name: 'static',
        base: `${host}/v7/weather/now`,
        headers: { Authorization: `Bearer ${staticKey}` },
        why: '',
      });
    }
  }

  return out;
}

// 城市名：按 location 反查，进程内缓存 6 小时；查不到不影响天气本身
const cityCache = new Map<string, { name: string; at: number }>();

async function resolveCityName(location: string): Promise<string> {
  const hit = cityCache.get(location);
  if (hit && Date.now() - hit.at < 6 * 3600_000) return hit.name;
  const apiHost = process.env.QWEATHER_API_HOST?.trim();
  const apiKey = process.env.QWEATHER_API_KEY?.trim();
  if (!apiHost || !apiKey) return '';
  try {
    const res = await fetch(
      `https://${apiHost}/geo/v2/city/lookup?location=${encodeURIComponent(location)}&lang=zh`,
      { headers: { 'X-QW-Api-Key': apiKey }, cache: 'no-store' }
    );
    const data: any = await res.json().catch(() => null);
    const name = data?.location?.[0]?.name;
    if (typeof name === 'string' && name) {
      cityCache.set(location, { name, at: Date.now() });
      return name;
    }
  } catch {
    // 静默：城市名只是展示，天气数据已经拿到了
  }
  return '';
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const location = (url.searchParams.get('location') || process.env.QWEATHER_LOCATION || '101010100').trim();
  const list = strategies();

  if (list.length === 0) {
    return NextResponse.json(
      {
        code: '500',
        message: '未配置凭据',
        hint:
          '填 QWEATHER_API_HOST + QWEATHER_API_KEY（新版 API KEY，推荐），' +
          '或 QWEATHER_PROJECT_ID + QWEATHER_CREDENTIAL_ID + QWEATHER_PRIVATE_KEY_PATH（JWT），' +
          '或 QWEATHER_KEY（旧版静态 Token）',
      },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  const tried: string[] = [];

  for (const s of list) {
    try {
      const res = await fetch(`${s.base}?location=${encodeURIComponent(location)}&lang=zh`, {
        method: 'GET',
        headers: {
          ...s.headers,
          'Accept-Encoding': 'gzip',
          'User-Agent': 'qjautumn-weather/1.0',
        },
        cache: 'no-store',
      });

      const raw = await res.text();
      let data: any = null;
      try {
        data = JSON.parse(raw);
      } catch {
        tried.push(`${s.name}@${s.base.replace('https://', '')} → 非 JSON，http=${res.status}`);
        continue;
      }

      if (data?.code === '200') {
        const cityName = await resolveCityName(location);
        return NextResponse.json({ ...data, cityName }, { headers: { 'Cache-Control': 'no-store' } });
      }

      const errTitle = data?.error?.title || data?.error?.detail || '';
      tried.push(
        `${s.name}@${s.base.replace('https://', '')} → code=${data?.code ?? data?.error?.status ?? '?'} http=${res.status}${
          errTitle ? ` ${errTitle}` : ''
        }${s.why ? ` (${s.why})` : ''}`
      );
    } catch (err: any) {
      tried.push(`${s.name}@${s.base.replace('https://', '')} → ${err?.message || 'fetch failed'}`);
    }
  }

  return NextResponse.json(
    {
      code: '500',
      message: '和风天气拒绝了请求',
      strategies: list.map((s) => s.name),
      location,
      tried,
    },
    { status: 500, headers: { 'Cache-Control': 'no-store' } }
  );
}