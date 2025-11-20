'use client';

import { ReactNode, useCallback, useState, useEffect } from 'react';
import { ConvexReactClient } from 'convex/react';
import { ConvexProviderWithAuth } from 'convex/react';
import { AuthKitProvider, useAuth, useAccessToken } from '@workos-inc/authkit-nextjs/components';

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  const [convex] = useState(() => {
    return new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
  });

  const [mounted, setMounted] = useState(false);

  // Wait for mount to avoid "Router action dispatched before initialization" errors
  // from AuthKit/Convex trying to access the router too early.
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <AuthKitProvider>
      <ConvexProviderWithAuth client={convex} useAuth={useAuthFromAuthKit}>
        {children}
      </ConvexProviderWithAuth>
    </AuthKitProvider>
  );
}

function useAuthFromAuthKit() {
  const { user, loading: isLoading } = useAuth();
  const { getAccessToken, refresh } = useAccessToken();

  const isAuthenticated = !!user;

  const fetchAccessToken = useCallback(
    async ({ forceRefreshToken }: { forceRefreshToken?: boolean } = {}): Promise<string | null> => {
      if (!user) {
        return null;
      }

      try {
        if (forceRefreshToken) {
          const token = await refresh();
          console.log('Auth: Refreshed token', token ? 'success' : 'failed');
          if (token) {
            // Decode JWT to inspect claims (split by dots, decode middle part)
            const payload = JSON.parse(atob(token.split('.')[1]));
            console.log('Token claims:', { iss: payload.iss, aud: payload.aud });
          }
          return token ?? null;
        }

        const token = await getAccessToken();
        console.log('Auth: Got access token', token ? 'success' : 'failed');
        if (token) {
          // Decode JWT to inspect claims (split by dots, decode middle part)
          const payload = JSON.parse(atob(token.split('.')[1]));
          console.log('Token claims:', { iss: payload.iss, aud: payload.aud });
        }
        return token ?? null;
      } catch (error) {
        console.error('Failed to get access token:', error);
        return null;
      }
    },
    [user, refresh, getAccessToken],
  );

  return {
    isLoading,
    isAuthenticated,
    fetchAccessToken,
  };
}
