import type { Metadata } from 'next';
import { Cinzel, Quicksand } from 'next/font/google';
import './globals.css';
import { ConvexClientProvider } from '@/components/ConvexClientProvider';
import LayoutWrapper from '@/components/LayoutWrapper';

const cinzel = Cinzel({
  variable: '--font-cinzel',
  subsets: ['latin'],
  weight: ['400', '700', '900'],
});

const quicksand = Quicksand({
  variable: '--font-quicksand',
  subsets: ['latin'],
  weight: ['300', '400', '600'],
});

export const metadata: Metadata = {
  title: 'REALMS | Fantasy Open World RPG',
  description: 'Step Into a Vast Magical World of Adventure',
  icons: {
    icon: '/convex.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${cinzel.variable} ${quicksand.variable} antialiased font-sans bg-genshin-white text-[#333] overflow-x-hidden`}>
        <ConvexClientProvider>
          <LayoutWrapper>
            {children}
          </LayoutWrapper>
        </ConvexClientProvider>
      </body>
    </html>
  );
}
