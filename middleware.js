import { NextResponse } from 'next/server';

const COOKIE_NAME = 'webfullsec_access_token';

export function middleware(request) {
  const accessToken = process.env.APP_ACCESS_TOKEN;
  if (!accessToken) {
    return NextResponse.next();
  }

  const { pathname, searchParams } = request.nextUrl;
  if (pathname.startsWith('/api/webhooks/')) {
    return NextResponse.next();
  }

  const headerToken = request.headers.get('x-app-access-token')
    || request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  const cookieToken = request.cookies.get(COOKIE_NAME)?.value;
  const queryToken = searchParams.get('token');
  const providedToken = headerToken || cookieToken || queryToken;

  if (providedToken === accessToken) {
    const response = NextResponse.next();
    if (!cookieToken) {
      response.cookies.set(COOKIE_NAME, accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
      });
    }
    return response;
  }

  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  return NextResponse.rewrite(new URL('/404', request.url));
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.json|uploads|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
};
