import NextAuth from 'next-auth';
import { NextResponse } from 'next/server';
import { authConfig } from './auth.config';

export const { auth: middlewareAuth } = NextAuth(authConfig);

export default middlewareAuth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const role = (req.auth?.user as { role?: string } | undefined)?.role;

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-pathname', nextUrl.pathname);

  const nextWithPath = () => NextResponse.next({ request: { headers: requestHeaders } });

  const isAdminRoute = nextUrl.pathname.startsWith('/admin');
  const isUserRoute = nextUrl.pathname.startsWith('/user');
  const isAuthPage =
    nextUrl.pathname === '/login' || nextUrl.pathname === '/register';

  if (isAdminRoute) {
    if (!isLoggedIn) {
      const url = new URL('/login', nextUrl);
      url.searchParams.set('next', nextUrl.pathname);
      return NextResponse.redirect(url);
    }
    if (role !== 'ADMIN' && role !== 'SUB_ADMIN') {
      return NextResponse.redirect(new URL('/user/dashboard', nextUrl));
    }
    return nextWithPath();
  }

  if (isUserRoute && !isLoggedIn) {
    const url = new URL('/login', nextUrl);
    url.searchParams.set('next', nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  if (isAuthPage && isLoggedIn) {
    const target =
      role === 'ADMIN' || role === 'SUB_ADMIN' ? '/admin/dashboard' : '/user/dashboard';
    return NextResponse.redirect(new URL(target, nextUrl));
  }

  return nextWithPath();
});

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.svg$).*)',
  ],
};
