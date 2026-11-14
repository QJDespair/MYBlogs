import { siteConfig } from '../../siteConfig';
import { cookies } from 'next/headers';
import PhotoWallClient from './PhotoWallClient';
import { TOKEN_COOKIE, verifyTokenValue } from '@/lib/blogAdmin';
import AlbumPublisher from '@/components/publish/AlbumPublisher';

export const metadata = {
  title: '照片墙 | ' + siteConfig.title,
};

export const dynamic = 'force-dynamic';

export default async function PhotoWallPage() {
  const cookieStore = await cookies();
  const canPublish = verifyTokenValue(cookieStore.get(TOKEN_COOKIE)?.value);

  return (
    <>
      <PhotoWallClient />
      {canPublish && <AlbumPublisher />}
    </>
  );
}
