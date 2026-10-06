import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { sessionUser, SESSION_SECONDS } from './auth-core.mjs';

export function appOrigin() {
  const value = process.env.APP_URL || (process.env.NODE_ENV !== 'production' ? 'http://localhost:3000' : '');
  if (!value) throw new Error('APP_URL is required.');
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error('APP_URL must be an origin, e.g. https://invoices.example.com');
  if (process.env.NODE_ENV === 'production' && url.protocol !== 'https:' && !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) throw new Error('Public production deployments require HTTPS.');
  return url.origin;
}
export function trustedOrigin(request: Request) {
  return request.headers.get('origin') === appOrigin() && request.headers.get('sec-fetch-site') !== 'cross-site';
}
export function cookieName() { return appOrigin().startsWith('https:') ? '__Host-invoicely_session' : 'invoicely_session'; }
export function sessionCookie(token: string, clear = false) {
  return `${cookieName()}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${clear ? 0 : SESSION_SECONDS}${appOrigin().startsWith('https:') ? '; Secure' : ''}`;
}
export async function getUser() {
  return sessionUser((await cookies()).get(cookieName())?.value);
}
export async function requireUser() {
  const user = await getUser();
  if (!user) redirect('/login');
  return user;
}
