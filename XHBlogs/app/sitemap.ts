import type { MetadataRoute } from 'next';

const BASE = 'https://qjautumn.xyz';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const paths = ['', '/moments', '/photowall', '/music', '/projects', '/chatter', '/friends', '/about'];
  return paths.map((p) => ({
    url: BASE + p,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: p === '' ? 1 : 0.7,
  }));
}
