export const SITE_NAME = 'REALMS';
export const SITE_TITLE = 'REALMS | Fantasy Open World RPG';
export const SITE_DESCRIPTION = 'Step into a vast magical world of adventure. Explore open realms, forge campaigns, and tell epic stories with friends.';

function normalizeSiteUrl(url: string) {
  if (!url) return '';
  const withProtocol = url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`;
  return withProtocol.replace(/\/+$/, '');
}

export function getSiteUrl() {
  const explicit = normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL ?? '');
  if (explicit) return explicit;

  const vercel = normalizeSiteUrl(process.env.VERCEL_URL ?? '');
  if (vercel) return vercel;

  return 'http://localhost:3000';
}

export function absoluteUrl(pathname: string) {
  const base = getSiteUrl();
  const path = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return `${base}${path}`;
}

