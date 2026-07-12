import { createHmac, timingSafeEqual } from 'crypto';

const SECRET = process.env.NEXTAUTH_SECRET ?? 'dev-secret';
const TOKEN_TTL_MS = 5 * 60 * 1000; // 5 minutes - just long enough for Puppeteer to render.

export interface PrintTokenPayload {
  docType: string;
  id: string;
  userId: string;
}

/** Short-lived signed token that lets the headless Chromium instance used
 *  for PDF export load a print page without needing to carry the user's
 *  browser session cookie into Puppeteer. Never exposed to the browser UI
 *  beyond the immediate export request. */
export function signPrintToken(payload: PrintTokenPayload): string {
  const body = JSON.stringify({ ...payload, exp: Date.now() + TOKEN_TTL_MS });
  const encoded = Buffer.from(body).toString('base64url');
  const signature = createHmac('sha256', SECRET).update(encoded).digest('base64url');
  return `${encoded}.${signature}`;
}

export function verifyPrintToken(token: string): PrintTokenPayload | null {
  const [encoded, signature] = token.split('.');
  if (!encoded || !signature) return null;

  const expected = createHmac('sha256', SECRET).update(encoded).digest('base64url');
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString()) as PrintTokenPayload & { exp: number };
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}
