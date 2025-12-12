import { authkitMiddleware } from '@workos-inc/authkit-nextjs';

export default authkitMiddleware({
  eagerAuth: true,
  middlewareAuth: {
    enabled: true,
    unauthenticatedPaths: [
      '/',
      '/sign-in',
      '/sign-up',
      '/features',
      '/lore',
      // Support both callback paths (repo README uses `/callback`)
      '/callback',
      '/auth/callback',
      // Keep auth debugging endpoint reachable even when auth is broken/misconfigured
      '/api/debug-auth',
    ],
  },
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
