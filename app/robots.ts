import type { MetadataRoute } from 'next';
import { absoluteUrl } from '@/lib/seo';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/dashboard', '/forge', '/settings', '/play-df', '/sign-in', '/sign-up', '/callback'],
      },
    ],
    sitemap: absoluteUrl('/sitemap.xml'),
  };
}

