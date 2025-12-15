import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { SITE_NAME } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Lore',
  description: `Discover the lore and worldbuilding behind ${SITE_NAME}.`,
  alternates: { canonical: '/lore' },
  openGraph: {
    title: 'Lore',
    description: `Discover the lore and worldbuilding behind ${SITE_NAME}.`,
    url: '/lore',
  },
};

export default function LoreLayout({ children }: { children: ReactNode }) {
  return children;
}
