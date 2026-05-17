import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Reads the token from the cookie (mirrored from localStorage on login)
// and redirects unauthenticated users away from protected routes.
export function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  const { pathname } = request.nextUrl;

  const isAuthPage = pathname === '/login' || pathname === '/register';
  const isProtectedPage = pathname.startsWith('/tasks');

  // Redirect logged-in users away from login/register pages
  if (token && isAuthPage) {
    return NextResponse.redirect(new URL('/tasks', request.url));
  }

  // Redirect unauthenticated users away from protected pages
  if (!token && isProtectedPage) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/tasks/:path*', '/login', '/register'],
};
