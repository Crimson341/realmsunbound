import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { SITE_NAME } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Realms',
  description: `Browse realms and worlds created by the ${SITE_NAME} community.`,
  alternates: { canonical: '/realms' },
  openGraph: {
    title: 'Realms',
    description: `Browse realms and worlds created by the ${SITE_NAME} community.`,
    url: '/realms',
  },
};

export default function RealmsLayout({ children }: { children: ReactNode }) {
  return children;
}
