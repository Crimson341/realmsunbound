import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { SITE_NAME } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Pricing',
  description: `Choose a membership tier for ${SITE_NAME} and start your adventure.`,
  alternates: { canonical: '/pricing' },
  openGraph: {
    title: 'Pricing',
    description: `Choose a membership tier for ${SITE_NAME} and start your adventure.`,
    url: '/pricing',
  },
};

export default function PricingLayout({ children }: { children: ReactNode }) {
  return children;
}
