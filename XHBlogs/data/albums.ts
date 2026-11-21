// 运行时相册存储：真实数据在 data/albums.json。
// 发布台（/api/blog/album）直接写 JSON，页面每次请求现读磁盘 —— 建相册不再需要重新构建。
import fs from 'fs';
import path from 'path';

export interface Photo {
  url: string;
  caption?: string;
}

export interface Album {
  id: string;
  title: string;
  description: string;
  cover: string;
  date: string;
  photos: Photo[];
}

export const ALBUMS_JSON = path.join(process.cwd(), 'data', 'albums.json');

export function readAlbums(): Album[] {
  try {
    const parsed = JSON.parse(fs.readFileSync(ALBUMS_JSON, 'utf8'));
    const list = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed?.albums)
        ? parsed.albums
        : [];
    return list.filter((a: any) => a && typeof a.id === 'string' && Array.isArray(a.photos)) as Album[];
  } catch {
    // 文件不存在或写坏时退化成空相册墙，而不是整页 500
    return [];
  }
}
