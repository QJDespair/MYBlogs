// app/api/weather/route.ts
//
// 和风天气代理。支持两种凭据：
//   1) JWT（当前控制台唯一签发方式）：QWEATHER_PROJECT_ID + QWEATHER_CREDENTIAL_ID + QWEATHER_PRIVATE_KEY_PATH
//      —— Ed25519 私钥现签，15 分钟有效，进程内缓存，不落盘。
//   2) 旧版静态 Token（QWEATHER_KEY）：仅当账号还能签发这种 key 时可用，否则两家 Host 都返回 403。
//
// 另可用 QWEATHER_LOCATION 覆盖默认城市（默认 101010100 北京）。

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

  const header = b64url(JSON.stringify({ alg: 'EdDSA', kid: credId }));
  const exp = now + 900;
  const payload = b64url(JSON.stringify({ sub: projectId, iat: now - 30, exp }));
  const data = `${header}.${payload}`;

  const pem = readFileSync(keyPath, 'utf8');
  const signature = sign(null, Buffer.from(data), createPrivateKey(pem)).toString('base64url');

  cache = { token: `${data}.${signature}`, exp };
  return cache.token;
}

export async function GET() {
  const location = (process.env.QWEATHER_LOCATION || '101010100').trim();
  const jwt = mintJwt();
  const staticKey = process.env.QWEATHER_KEY?.trim();
  const token = jwt || staticKey;

  if (!token) {
    return NextResponse.json(
      {
        code: '500',
        message: '未配置凭据',
        hint: '填 QWEATHER_PROJECT_ID + QWEATHER_CREDENTIAL_ID + QWEATHER_PRIVATE_KEY_PATH（推荐），或 QWEATHER_KEY（旧版静态 Token）',
      },
      { status: 500 }
    );
  }

  const hosts = jwt
    ? ['https://api.qweather.com/v7/weather/now', 'https://devapi.qweather.com/v7/weather/now']
    : ['https://devapi.qweather.com/v7/weather/now', 'https://api.qweather.com/v7/weather/now'];

  const tried: string[] = [];

  for (const host of hosts) {
    try {
      const res = await fetch(`${host}?location=${encodeURIComponent(location)}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Accept-Encoding': 'gzip',
          'User-Agent': 'qjautumn-weather/1.0',
        },
        cache: 'no-store',
      });

      const data: any = await res.json();

      if (data?.code === '200') {
        return NextResponse.json(data);
      }

      tried.push(`${host.replace('https://', '')} → code=${data?.code ?? '?'} http=${res.status}`);
    } catch (err: any) {
      tried.push(`${host.replace('https://', '')} → ${err?.message || 'fetch failed'}`);
    }
  }

  return NextResponse.json(
    { code: '500', message: '和风天气拒绝了请求', auth: jwt ? 'jwt' : 'static', location, tried },
    { status: 500 }
  );
}