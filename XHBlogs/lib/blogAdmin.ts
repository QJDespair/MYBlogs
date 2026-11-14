import crypto from 'node:crypto';
import path from 'node:path';

/** 站点根：/srv/blog/XHBlogs（next start 的 cwd） */
export const SITE_ROOT = process.cwd();
/** 仓库根：/srv/blog（git 根 + sparse-checkout） */
export const REPO_ROOT = path.resolve(SITE_ROOT, '..');
/** 图床物理目录，nginx 用 location ^~ /uploads/ 直出 */
export const UPLOAD_ROOT = process.env.BLOG_UPLOAD_DIR || '/var/www/blog-uploads';
/** 发布请求/状态文件目录（git 之外，见 .git/info/exclude 的 /runtime/） */
export const RUNTIME_DIR = path.join(REPO_ROOT, 'runtime');

export const ALBUMS_PATH = path.join(SITE_ROOT, 'data', 'albums.ts');
export const MOMENTS_DIR = path.join(SITE_ROOT, 'moments');

export type Photo = { url: string; caption?: string };
export type Album = {
  id: string;
  title: string;
  description: string;
  cover: string;
  date: string;
  photos: Photo[];
};

/** 与 my-blog-manager/cms_core/api/gallery.py 生成的头部保持一致，控制台与在线台可互相覆盖 */
export const ALBUMS_HEADER =
  '// 本文件由在线发布台 / 本地控制台自动生成，请勿手动修改\n' +
  'export interface Photo { url: string; caption?: string; }\n' +
  'export interface Album { id: string; title: string; description: string; cover: string; date: string; photos: Photo[]; }\n\n';

export const ALLOWED_EXT = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif', '.heic'] as const;
export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

const MIME_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/avif': '.avif',
  'image/heic': '.heic',
};

/** 返回错误文案；null 表示通过 */
export function requireToken(req: Request): string | null {
  const expected = (process.env.BLOG_ADMIN_TOKEN || '').trim();
  if (!expected) return '服务端未配置 BLOG_ADMIN_TOKEN';
  const auth = req.headers.get('authorization') || '';
  const raw = auth.toLowerCase().startsWith('bearer ')
    ? auth.slice(7)
    : req.headers.get('x-blog-token') || '';
  const got = raw.trim();
  if (!got) return '缺少令牌';
  const a = Buffer.from(got);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return '令牌不正确';
  return null;
}

export function pickExt(fileName: string, mime: string): string | null {
  const byMime = MIME_EXT[(mime || '').toLowerCase()];
  if (byMime) return byMime;
  const ext = path.extname(fileName || '').toLowerCase();
  return (ALLOWED_EXT as readonly string[]).includes(ext) ? ext : null;
}

export function shanghaiDate(d: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai' }).format(d);
}

/** 把 data/albums.ts 里的数组解析出来（文件是 `export const albums: Album[] = [...];`）
 *  注意：interface 定义里也有 `Photo[]`，所以必须以 `export const albums` 为锚点找第一个 '['，
 *  否则会从 interface 的 `[]` 开始解析、JSON.parse 抛错、静默返回空数组（曾导致"相册建了看不见、删不掉"）。 */
export function parseAlbums(source: string): Album[] {
  const anchor = source.indexOf('export const albums');
  const from = anchor >= 0 ? anchor : 0;
  // 锚点后面紧跟的是类型标注 `: Album[]`，它的 `[]` 也是方括号，所以必须先越过 '='，
  // 再从 '=' 之后找数组字面量的第一个 '['。
  const eq = source.indexOf('=', from);
  const start = source.indexOf('[', eq >= 0 ? eq : from);
  if (start < 0) return [];

  let depth = 0;
  let inString = false;
  let quote = '';
  for (let i = start; i < source.length; i += 1) {
    const ch = source[i];
    if (inString) {
      if (ch === '\\') i += 1;
      else if (ch === quote) inString = false;
      continue;
    }
    if (ch === '"' || ch === "'") {
      inString = true;
      quote = ch;
      continue;
    }
    if (ch === '[') depth += 1;
    else if (ch === ']') {
      depth -= 1;
      if (depth === 0) {
        try {
          const arr = JSON.parse(source.slice(start, i + 1));
          return Array.isArray(arr) ? (arr as Album[]) : [];
        } catch {
          return [];
        }
      }
    }
  }
  return [];
}

export function renderAlbums(albums: Album[]): string {
  return ALBUMS_HEADER + 'export const albums: Album[] = ' + JSON.stringify(albums, null, 2) + ';\n';
}