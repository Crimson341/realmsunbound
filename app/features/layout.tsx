import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { SITE_NAME } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Features',
  description: `Explore what you can do in ${SITE_NAME}: campaigns, worlds, and epic storytelling.`,
  alternates: { canonical: '/features' },
  openGraph: {
    title: 'Features',
    description: `Explore what you can do in ${SITE_NAME}: campaigns, worlds, and epic storytelling.`,
    url: '/features',
  },
};

export default function FeaturesLayout({ children }: { children: ReactNode }) {
  return children;
}
