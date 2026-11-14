import type { Metadata } from 'next';
import ManageClient from './ManageClient';

export const metadata: Metadata = {
  title: '在线发布台',
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = 'force-dynamic';

export default function ManagePage() {
  return <ManageClient />;
}