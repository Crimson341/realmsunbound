import { NextResponse } from 'next/server';

export async function GET() {
  const clientId = process.env.WORKOS_CLIENT_ID;
  const apiKey = process.env.WORKOS_API_KEY;
  const cookiePassword = process.env.WORKOS_COOKIE_PASSWORD;
  const redirectUri = process.env.NEXT_PUBLIC_WORKOS_REDIRECT_URI;

  const checks = {
    WORKOS_CLIENT_ID: {
      exists: !!clientId,
      startsWithClient: clientId?.startsWith('client_'),
      value_preview: clientId ? `${clientId.substring(0, 10)}...` : 'missing',
    },
    WORKOS_API_KEY: {
      exists: !!apiKey,
      startsWithSk: apiKey?.startsWith('sk_'),
      value_preview: apiKey ? `${apiKey.substring(0, 5)}...` : 'missing',
    },
    WORKOS_COOKIE_PASSWORD: {
      exists: !!cookiePassword,
      length: cookiePassword ? cookiePassword.length : 0,
      validLength: (cookiePassword?.length || 0) >= 32,
    },
    NEXT_PUBLIC_WORKOS_REDIRECT_URI: {
      exists: !!redirectUri,
      value: redirectUri,
      hasCallback: redirectUri?.endsWith('/callback'),
    }
  };

  return NextResponse.json(checks, { status: 200 });
}
