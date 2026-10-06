import { cookies } from 'next/headers';
import { revokeSession } from '@/lib/auth-core.mjs';
import { cookieName, requestOrigin, sessionCookie, trustedOrigin } from '@/lib/auth';
import { endpoint, json } from '@/lib/server';

export const POST = (request: Request) => endpoint(async () => {
  if (!trustedOrigin(request)) return json({ error: 'Μη επιτρεπτή προέλευση αιτήματος.' }, 403);
  await revokeSession((await cookies()).get(cookieName())?.value);
  return new Response(null, { status: 303, headers: { Location: `${requestOrigin(request)}/login`, 'Set-Cookie': sessionCookie('', true), 'Cache-Control': 'no-store' } });
});
