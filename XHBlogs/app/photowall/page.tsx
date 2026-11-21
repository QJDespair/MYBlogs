import { siteConfig } from '../../siteConfig';
import { cookies } from 'next/headers';
import PhotoWallClient from './PhotoWallClient';
import { TOKEN_COOKIE, verifyTokenValue } from '@/lib/blogAdmin';
import AlbumPublisher from '@/components/publish/AlbumPublisher';
import { readAlbums } from '../../data/albums';

export const metadata = {
  title: '照片墙 | ' + siteConfig.title,
};

export const dynamic = 'force-dynamic';

export default async function PhotoWallPage() {
  const cookieStore = await cookies();
  const canPublish = verifyTokenValue(cookieStore.get(TOKEN_COOKIE)?.value);
  // 相册在请求时现读：新建相册不需要重新构建
  const albums = readAlbums();

  return (
    <>
      <PhotoWallClient albums={albums} />
      {canPublish && <AlbumPublisher />}
    </>
  );
}
