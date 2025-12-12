import { handleAuth } from '@workos-inc/authkit-nextjs';

// WorkOS AuthKit redirect URI in this repo's README is `/callback`.
// We keep this route to match that default configuration.
export const GET = handleAuth();


