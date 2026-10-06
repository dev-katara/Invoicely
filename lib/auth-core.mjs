import { randomBytes, randomUUID, scrypt, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
import { pg } from '../db/runtime.mjs';

const derive = promisify(scrypt);
export const SESSION_SECONDS = 8 * 60 * 60;
const options = { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const digest = token => createHash('sha256').update(token).digest('hex');
export const normalizeEmail = email => String(email).trim().toLowerCase();

export async function hashPassword(password) {
  if (typeof password !== 'string' || password.length < 12 || password.length > 1024) throw new Error('Use a password with 12–1024 characters.');
  const salt = randomBytes(16).toString('hex');
  const key = await derive(password, salt, 64, options);
  return `scrypt:${salt}:${key.toString('hex')}`;
}

export async function verifyPassword(password, encoded) {
  const [, salt, expected] = encoded.split(':');
  const actual = await derive(password, salt, 64, options);
  const expectedBytes = Buffer.from(expected, 'hex');
  return actual.length === expectedBytes.length && timingSafeEqual(actual, expectedBytes);
}

export async function saveUser(email, fullName, password, reset = false) {
  email = normalizeEmail(email);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) throw new Error('Invalid email.');
  if (!fullName.trim() || fullName.length > 100) throw new Error('Invalid display name.');
  const passwordHash = await hashPassword(password);
  const sql = await pg();
  return sql.begin(async tx => {
    const [existing] = await tx`SELECT id FROM auth_users WHERE email = ${email}`;
    if (existing && !reset) throw new Error('Account exists. Use --reset to change the password.');
    const id = existing?.id ?? randomUUID();
    if (existing) {
      await tx`UPDATE auth_users SET password_hash = ${passwordHash}, full_name = ${fullName.trim()} WHERE id = ${id}`;
      await tx`DELETE FROM auth_sessions WHERE user_id = ${id}`;
    } else {
      await tx`INSERT INTO auth_users (id, email, full_name, password_hash, created_at) VALUES (${id}, ${email}, ${fullName.trim()}, ${passwordHash}, ${Date.now()})`;
    }
    return id;
  });
}

export async function authenticate(email, password) {
  if (typeof password !== 'string' || password.length > 1024) return null;
  const sql = await pg();
  const [user] = await sql`SELECT * FROM auth_users WHERE email = ${normalizeEmail(email)}`;
  // Unknown accounts still perform the same password derivation.
  const fallback = `scrypt:${'0'.repeat(32)}:${'0'.repeat(128)}`;
  const valid = await verifyPassword(password, user?.password_hash ?? fallback);
  return valid && user ? { userId: user.id, email: user.email, fullName: user.full_name } : null;
}

export async function createSession(userId) {
  const token = randomBytes(32).toString('base64url');
  const sql = await pg();
  await sql`DELETE FROM auth_sessions WHERE expires_at <= ${Date.now()}`;
  await sql`INSERT INTO auth_sessions (token_hash, user_id, expires_at) VALUES (${digest(token)}, ${userId}, ${Date.now() + SESSION_SECONDS * 1000})`;
  return token;
}

export async function sessionUser(token) {
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const sql = await pg();
  const [row] = await sql`SELECT u.id, u.email, u.full_name FROM auth_sessions s JOIN auth_users u ON u.id = s.user_id WHERE s.token_hash = ${digest(token)} AND s.expires_at > ${Date.now()}`;
  return row ? { userId: row.id, email: row.email, fullName: row.full_name } : null;
}

export async function revokeSession(token) {
  if (!token) return;
  const sql = await pg();
  await sql`DELETE FROM auth_sessions WHERE token_hash = ${digest(token)}`;
}
