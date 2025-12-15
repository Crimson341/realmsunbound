import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { SITE_NAME } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Changelog',
  description: `Product updates and improvements for ${SITE_NAME}.`,
  alternates: { canonical: '/changelog' },
  openGraph: {
    title: 'Changelog',
    description: `Product updates and improvements for ${SITE_NAME}.`,
    url: '/changelog',
  },
};

export default function ChangelogLayout({ children }: { children: ReactNode }) {
  return children;
}
