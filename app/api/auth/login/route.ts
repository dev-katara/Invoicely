import { createHash } from 'node:crypto';
import { authenticate, createSession } from '@/lib/auth-core.mjs';
import { appOrigin, sessionCookie, trustedOrigin } from '@/lib/auth';
import { consumeLimit } from '@/db/runtime.mjs';
import { boundedBody, endpoint, json } from '@/lib/server';

export const POST = (request: Request) => endpoint(async () => {
  if (!trustedOrigin(request)) return json({ error: 'Μη επιτρεπτή προέλευση αιτήματος.' }, 403);
  if (!request.headers.get('content-type')?.startsWith('application/x-www-form-urlencoded')) return json({ error: 'Μη έγκυρη φόρμα.' }, 415);
  const form = new URLSearchParams(new TextDecoder().decode(await boundedBody(request, 8192)));
  const email = (form.get('email') ?? '').trim().toLowerCase();
  const key = createHash('sha256').update(email).digest('hex');
  if (!(await consumeLimit('login:global', 1000, 900)) || !(await consumeLimit(`login:${key}`, 10, 900))) return json({ error: 'Πολλές προσπάθειες σύνδεσης. Δοκιμάστε σε 15 λεπτά.' }, 429);
  const user = await authenticate(email, form.get('password') ?? '');
  if (!user) return new Response(null, { status: 303, headers: { Location: `${appOrigin()}/login?error=1`, 'Cache-Control': 'no-store' } });
  return new Response(null, { status: 303, headers: { Location: `${appOrigin()}/`, 'Set-Cookie': sessionCookie(await createSession(user.userId)), 'Cache-Control': 'no-store' } });
});
