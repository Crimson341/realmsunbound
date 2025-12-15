import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false, 'max-image-preview': 'none' },
  },
};

export default function ForgeLayout({ children }: { children: ReactNode }) {
  return children;
}
