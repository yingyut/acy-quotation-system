export { default } from 'next-auth/middleware';

export const config = {
  matcher: [
    /*
     * Protect everything except: /login, NextAuth API routes, static
     * assets (Next internals, fonts, favicon), and /print/* - print pages
     * authenticate themselves via a short-lived signed token (see
     * src/lib/printToken.ts) so headless Chromium (no session cookie) can
     * render them for PDF export.
     */
    '/((?!login|api/auth|print|_next/static|_next/image|fonts|favicon.ico).*)',
  ],
};
