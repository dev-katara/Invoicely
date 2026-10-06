import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import postgres from 'postgres';
import { saveUser, authenticate, createSession, sessionUser, revokeSession } from '../lib/auth-core.mjs';
import { pg, closePg, consumeLimit } from '../db/runtime.mjs';

const schema = `test_${randomBytes(4).toString('hex')}`;
const admin = postgres(process.env.DATABASE_URL);
before(async () => {
  await admin`CREATE SCHEMA ${admin(schema)}`;
  process.env.DATABASE_SCHEMA = schema;
});
after(async () => {
  await closePg();
  await admin`DROP SCHEMA ${admin(schema)} CASCADE`;
  await admin.end({ timeout: 5 });
});

const password = 'Synthetic-test-password-123!';
let userId;
test('migrations initialize an empty database and are repeatable', async () => {
  const sql = await pg();
  assert.equal((await sql`SELECT count(*)::int AS count FROM _schema_migrations`)[0].count, 2);
  assert.equal((await sql`SELECT count(*)::int AS count FROM invoices`)[0].count, 0);
});
test('account stores a salted hash and rejects wrong credentials', async () => {
  userId = await saveUser('Admin@example.com', 'Administrator', password);
  const sql = await pg();
  const [stored] = await sql`SELECT password_hash FROM auth_users WHERE id = ${userId}`;
  assert.match(stored.password_hash, /^scrypt:/);
  assert.ok(!stored.password_hash.includes(password));
  assert.equal((await authenticate('ADMIN@example.com', password)).userId, userId);
  assert.equal(await authenticate('admin@example.com', 'wrong'), null);
  assert.equal(await authenticate('unknown@example.com', password), null);
});
test('sessions reject tampering, expiration and revocation', async () => {
  const sql = await pg();
  const token = await createSession(userId);
  assert.equal((await sessionUser(token)).userId, userId);
  assert.equal(await sessionUser(token + 'x'), null);
  const [row] = await sql`SELECT token_hash FROM auth_sessions`;
  assert.equal(row.token_hash.includes(token), false);
  await revokeSession(token);
  assert.equal(await sessionUser(token), null);
  const expired = await createSession(userId);
  await sql`UPDATE auth_sessions SET expires_at = 0`;
  assert.equal(await sessionUser(expired), null);
});
test('password reset preserves workspace identity and revokes sessions', async () => {
  const token = await createSession(userId);
  assert.equal(await saveUser('admin@example.com', 'Admin', 'Replacement-password-123!', true), userId);
  assert.equal(await sessionUser(token), null);
  assert.equal(await authenticate('admin@example.com', password), null);
  assert.equal((await authenticate('admin@example.com', 'Replacement-password-123!')).userId, userId);
});
test('batch failure rolls back all writes', async () => {
  const sql = await pg();
  await assert.rejects(sql.begin(async tx => {
    await tx`INSERT INTO rate_limits VALUES ('rollback-test', 1, 9999999999)`;
    await tx`INSERT INTO missing_table VALUES (1)`;
  }));
  const [row] = await sql`SELECT * FROM rate_limits WHERE key = 'rollback-test'`;
  assert.equal(row, undefined);
});
test('persistent throttling blocks excess attempts and permits expired windows', async () => {
  const sql = await pg();
  assert.equal(await consumeLimit('test-limit', 1, 60), true);
  assert.equal(await consumeLimit('test-limit', 1, 60), false);
  await sql`UPDATE rate_limits SET expires_at = 0 WHERE key = 'test-limit'`;
  assert.equal(await consumeLimit('test-limit', 1, 60), true);
});
