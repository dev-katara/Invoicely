import { consumeLimit } from '@/db/runtime.mjs';
import { and, desc, eq } from 'drizzle-orm';
import { ZodError } from 'zod';
import { getUser, trustedOrigin } from '@/lib/auth';
import { getDb } from '@/db';
import { workspaces, invoices, contacts, auditLogs, uploads } from '@/db/schema';
import { demoInvoices, demoContacts } from './demo';
import type { Mode, Snapshot } from './domain';

type DB = Awaited<ReturnType<typeof getDb>>;

export class ApiError extends Error { constructor(public status: number, message: string) { super(message); } }
export const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', 'Vary': 'Cookie' } });
export async function endpoint(fn: () => Promise<Response>) {
  try { return await fn(); }
  catch (e) {
    if (e instanceof ApiError) return json({ error: e.message }, e.status);
    if (e instanceof ZodError) return json({ error: e.issues.map(i => i.message).join(' '), fields: e.flatten().fieldErrors }, 422);
    if (e instanceof SyntaxError) return json({ error: 'Μη έγκυρα δεδομένα.' }, 400);
    if (e instanceof Error && (e as NodeJS.ErrnoException & { code?: string }).code === '23505') return json({ error: 'Υπάρχει ήδη εγγραφή με αυτά τα στοιχεία.' }, 409);
    console.error('request_failed', { type: e instanceof Error ? e.name : 'UnknownError' });
    return json({ error: 'Η ενέργεια δεν ολοκληρώθηκε. Δοκιμάστε ξανά.' }, 500);
  }
}
export async function context(request: Request) {
  const user = await getUser();
  if (!user) throw new ApiError(401, 'Συνδεθείτε για να συνεχίσετε.');
  if (!['GET', 'HEAD'].includes(request.method)) {
    if (!trustedOrigin(request)) throw new ApiError(403, 'Μη επιτρεπτή προέλευση αιτήματος.');
  }
  const rawMode = new URL(request.url).searchParams.get('mode') ?? 'demo';
  if (rawMode !== 'live' && rawMode !== 'demo') throw new ApiError(400, 'Μη έγκυρος χώρος εργασίας.');
  const mode = rawMode as Mode;
  const workspaceId = `${user.userId}:${mode}`;
  const db = await getDb();
  const [workspace] = await db.select().from(workspaces).where(and(eq(workspaces.id, workspaceId), eq(workspaces.ownerId, user.userId))).limit(1);
  return { db, user, workspaceId, workspace, mode };
}
export async function initialize(request: Request) {
  const ctx = await context(request);
  if (!ctx.workspace) {
    const now = new Date().toISOString();
    const workspace = { id: ctx.workspaceId, ownerId: ctx.user.userId, name: ctx.mode === 'demo' ? 'Studio Acme' : 'Η επιχείρησή μου', mode: ctx.mode, vatNumber: '', email: '', address: '', createdAt: now };
    await ctx.db.transaction(async tx => {
      await tx.insert(workspaces).values(workspace).onConflictDoNothing();
      if (ctx.mode === 'demo') {
        for (const inv of demoInvoices(ctx.workspaceId)) await tx.insert(invoices).values({ ...inv, workspaceId: ctx.workspaceId, items: JSON.stringify(inv.items) }).onConflictDoNothing();
        for (const c of demoContacts(ctx.workspaceId)) await tx.insert(contacts).values({ ...c, workspaceId: ctx.workspaceId, createdAt: now }).onConflictDoNothing();
      }
    });
    ctx.workspace = workspace;
  }
  return ctx;
}
export async function snapshot(request: Request): Promise<Snapshot> {
  const { db, workspaceId, workspace, user } = await initialize(request);
  const [rows, people, files, activity] = await Promise.all([
    db.select().from(invoices).where(eq(invoices.workspaceId,workspaceId)).orderBy(desc(invoices.date), desc(invoices.createdAt)),
    db.select().from(contacts).where(eq(contacts.workspaceId,workspaceId)).orderBy(contacts.name),
    db.select().from(uploads).where(eq(uploads.workspaceId,workspaceId)).orderBy(desc(uploads.createdAt)),
    db.select().from(auditLogs).where(eq(auditLogs.workspaceId,workspaceId)).orderBy(desc(auditLogs.createdAt)).limit(30),
  ]);
  return { workspace: workspace!, invoices: rows.map(i=>({...i, items: JSON.parse(i.items)})), contacts: people, uploads: files.map(({objectKey,sha256,workspaceId:_,...f})=>({...f})), activity, integrations: { mydata:'draft_only' }, user: { name: user.fullName ?? user.email.split('@')[0], email:user.email } };
}
export function audit(db: Pick<DB, 'insert'>, workspaceId: string, action: string, entityId: string) {
  return db.insert(auditLogs).values({ id: crypto.randomUUID(), workspaceId, action, entityId, createdAt: new Date().toISOString() });
}
export async function limit(key: string, maximum: number, periodSeconds = 3600) {
  if (!(await consumeLimit(key, maximum, periodSeconds))) throw new ApiError(429, 'Φτάσατε το όριο ενεργειών. Δοκιμάστε αργότερα.');
}
export async function boundedBody(request: Request, maxBytes = 100000) {
  if (Number(request.headers.get('content-length') ?? 0) > maxBytes) throw new ApiError(413, 'Το αρχείο ή το αίτημα είναι πολύ μεγάλο.');
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError(400, 'Λείπουν δεδομένα.');
  const chunks: Uint8Array[] = []; let size = 0;
  while (true) {
    const {done,value} = await reader.read(); if(done) break;
    size += value.byteLength;
    if(size>maxBytes) { await reader.cancel(); throw new ApiError(413,'Το αρχείο ή το αίτημα είναι πολύ μεγάλο.'); }
    chunks.push(value);
  }
  const body = new Uint8Array(size); let offset=0;
  for (const chunk of chunks) { body.set(chunk,offset); offset+=chunk.length; }
  return body;
}
export async function readJson(request:Request) {
  if (!request.headers.get('content-type')?.includes('application/json')) throw new ApiError(415,'Αναμένεται JSON.');
  return JSON.parse(new TextDecoder().decode(await boundedBody(request)));
}
