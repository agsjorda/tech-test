// ─── Next.js route protection middleware ──────────────────────────────────────
// This file runs on the server (Edge runtime) before every matching request.
// It checks for an auth token in the request cookies and redirects accordingly.
//
// Why cookies and not localStorage?
// localStorage only exists in the browser — server-side code (including this
// middleware) cannot read it. So on login we mirror the token into a cookie too,
// which Next.js middleware can read on every request.

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Read the token cookie that was set by useAuth.ts on login
  const token = request.cookies.get('token')?.value;
  const { pathname } = request.nextUrl;

  // Classify the current route
  const isAuthPage = pathname === '/login' || pathname === '/register';
  const isProtectedPage = pathname.startsWith('/tasks');

  // If the user is already logged in, sending them to /login or /register
  // would be confusing — redirect them straight to their task list instead.
  if (token && isAuthPage) {
    return NextResponse.redirect(new URL('/tasks', request.url));
  }

  // If the user is NOT logged in and tries to visit a protected page,
  // send them to the login page so they can authenticate first.
  if (!token && isProtectedPage) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Otherwise let the request through as normal
  return NextResponse.next();
}

// `matcher` limits which routes this middleware runs on.
// Without this, it would run on every request including static assets (_next/).
export const config = {
  matcher: ['/tasks/:path*', '/login', '/register'],
};
