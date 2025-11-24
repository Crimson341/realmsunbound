import type { Metadata } from 'next';
import { Cinzel, Quicksand } from 'next/font/google';
import './globals.css';
import { ConvexClientProvider } from '@/components/ConvexClientProvider';
import { ThemeProvider } from '@/components/ThemeProvider';
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
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Prevent flash of wrong theme */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('realms-theme');
                  if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                    document.documentElement.classList.add('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className={`${cinzel.variable} ${quicksand.variable} antialiased font-sans overflow-x-hidden`}>
        <ConvexClientProvider>
          <ThemeProvider>
            <LayoutWrapper>
              {children}
            </LayoutWrapper>
          </ThemeProvider>
        </ConvexClientProvider>
      </body>
    </html>
  );
}
