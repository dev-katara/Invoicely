import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { createServer } from 'node:net';
import postgres from 'postgres';
import { createClient } from '@supabase/supabase-js';
import { saveUser } from '../lib/auth-core.mjs';
import { closePg } from '../db/runtime.mjs';

const schema = `smoke_${randomBytes(4).toString('hex')}`;
const admin = postgres(process.env.DATABASE_URL);
await admin`CREATE SCHEMA ${admin(schema)}`;
process.env.DATABASE_SCHEMA = schema;

const socket = createServer();
await new Promise(resolve => socket.listen(0, '127.0.0.1', resolve));
const port = socket.address().port;
await new Promise(resolve => socket.close(resolve));
const base = `http://127.0.0.1:${port}`;
const password = randomBytes(24).toString('base64url');
const firstId = await saveUser('first@example.com', 'First user', password);
await saveUser('second@example.com', 'Second user', password);
let output = '';
const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', String(port)], { env: { ...process.env, APP_URL: base, NODE_ENV: 'production', NEXT_TELEMETRY_DISABLED: '1' }, stdio: ['ignore', 'pipe', 'pipe'] });
child.stdout.on('data', data => output = (output + data).slice(-8000));
child.stderr.on('data', data => output = (output + data).slice(-8000));
const call = (path, cookie = '', options = {}) => fetch(base + path, { redirect: 'manual', ...options, headers: { Cookie: cookie, Origin: base, ...options.headers } });
const login = email => call('/api/auth/login', '', { method: 'POST', body: new URLSearchParams({ email, password }) });
try {
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    try { if ((await call('/login')).status === 200) { ready = true; break; } } catch {}
    if (child.exitCode !== null) break;
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  assert.ok(ready, 'Production server must become ready');
  assert.equal((await call('/api/workspace')).status, 401);
  assert.equal((await call('/api/workspace', '', { headers: { 'oai-authenticated-user-id': 'forged', 'oai-authenticated-user-email': 'forged@example.com' } })).status, 401, 'Legacy identity headers must not authenticate');
  assert.equal((await call('/')).headers.get('location'), '/login');
  const forbidden = await call('/api/auth/login', '', { method: 'POST', headers: { Origin: 'https://attacker.example' }, body: new URLSearchParams({ email: 'first@example.com', password }) });
  assert.equal(forbidden.status, 403);
  const signedIn = await login('first@example.com');
  assert.equal(signedIn.status, 303);
  assert.match(signedIn.headers.get('set-cookie'), /HttpOnly; SameSite=Lax/);
  const cookie = signedIn.headers.get('set-cookie').split(';')[0];
  const secondCookie = (await login('second@example.com')).headers.get('set-cookie').split(';')[0];
  const api = (path, options = {}, session = cookie) => call(path, session, { ...options, headers: { 'Content-Type': 'application/json', ...options.headers } });
  const demo = await (await api('/api/workspace?mode=demo')).json();
  assert.ok(demo.invoices.length >= 60);
  assert.equal((await (await api('/api/workspace?mode=live')).json()).invoices.length, 0);
  const invoice = { id: crypto.randomUUID(), reference: 'QA-001', kind: 'income', counterparty: 'Synthetic customer', vatNumber: '123456783', email: '', date: '2026-10-06', dueDate: '2026-10-20', category: 'Υπηρεσίες', items: [{ description: 'Test service', quantity: 1, unitCents: 10000, vatRate: 24 }], notes: '', fileId: null };
  assert.equal((await api('/api/invoices?mode=live', { method: 'POST', body: JSON.stringify(invoice) })).status, 201);
  const stored = await (await api('/api/workspace?mode=live')).json();
  assert.equal(stored.invoices[0].totalCents, 12400);
  assert.equal((await (await api('/api/workspace?mode=live', {}, secondCookie)).json()).invoices.length, 0);
  assert.equal((await api(`/api/invoices/${invoice.id}/mydata?mode=live`, {}, secondCookie)).status, 404);
  const pdfBytes = '%PDF-1.4\n% Synthetic smoke test\n%%EOF';
  const form = new FormData(); form.set('file', new File([pdfBytes], 'test.pdf', { type: 'application/pdf' }));
  const upload = await call('/api/uploads?mode=live', cookie, { method: 'POST', body: form });
  assert.equal(upload.status, 201);
  const fileId = (await upload.json()).id;
  assert.equal(await (await call(`/api/uploads/${fileId}?mode=live`, cookie)).text(), pdfBytes);
  assert.equal((await call(`/api/uploads/${fileId}?mode=live`, secondCookie)).status, 404);
  assert.equal((await call('/api/uploads?mode=live', cookie, { method: 'POST', body: form })).status, 200);
  const malformed = new FormData(); malformed.set('file', new File(['fake'], 'fake.pdf', { type: 'application/pdf' }));
  assert.equal((await call('/api/uploads?mode=live', cookie, { method: 'POST', body: malformed })).status, 415);
  assert.equal((await call('/api/auth/logout', cookie, { method: 'POST' })).status, 303);
  assert.equal((await api('/api/workspace')).status, 401, 'Logout revokes session server-side');
  const reloginCookie = (await login('first@example.com')).headers.get('set-cookie').split(';')[0];
  assert.equal((await (await api('/api/workspace?mode=live', {}, reloginCookie)).json()).invoices[0].id, invoice.id);
  assert.equal((await api(`/api/invoices/${invoice.id}?mode=live`, { method: 'DELETE' }, reloginCookie)).status, 200);
  console.log('PASS: production login, header spoof rejection, CSRF, user/workspace isolation, invoice persistence, private uploads, duplicate detection, file validation and session revocation.');
} catch (error) { console.error(output); throw error; }
finally {
  child.kill(); await new Promise(resolve => child.exitCode !== null ? resolve() : child.once('exit', resolve));
  await closePg();
  await admin`DROP SCHEMA ${admin(schema)} CASCADE`;
  await admin.end({ timeout: 5 });
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    const prefix = `documents/${encodeURIComponent(`${firstId}:live`)}`;
    const { data } = await supabase.storage.from('uploads').list(prefix);
    if (data?.length) await supabase.storage.from('uploads').remove(data.map(f => `${prefix}/${f.name}`));
  }
}
