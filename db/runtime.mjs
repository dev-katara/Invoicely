import postgres from 'postgres';
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function createClient() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is required.');
  const schema = process.env.DATABASE_SCHEMA;
  return postgres(url, {
    prepare: false, max: 5, idle_timeout: 20, // Supabase's pooled (transaction-mode) connection does not support prepared statements.
    ...(schema ? { connection: { search_path: schema } } : {}),
  });
}

async function migrate(sql) {
  await sql`CREATE TABLE IF NOT EXISTS _schema_migrations (name text PRIMARY KEY, applied_at text NOT NULL)`;
  const directory = resolve(process.cwd(), 'drizzle');
  const files = readdirSync(directory).filter(name => /^\d+.*\.sql$/.test(name)).sort();
  await sql.begin(async tx => {
    await tx`SELECT pg_advisory_xact_lock(727200001)`;
    const applied = new Set((await tx`SELECT name FROM _schema_migrations`).map(row => row.name));
    for (const name of files) {
      if (applied.has(name)) continue;
      await tx.unsafe(readFileSync(resolve(directory, name), 'utf8'));
      await tx`INSERT INTO _schema_migrations (name, applied_at) VALUES (${name}, ${new Date().toISOString()})`;
    }
  });
}

export function pg() {
  const cache = globalThis.__invoicelyPg ??= {};
  if (!cache.ready) {
    cache.sql = createClient();
    cache.ready = migrate(cache.sql).catch(error => { cache.ready = null; throw error; });
  }
  return cache.ready.then(() => cache.sql);
}

export async function closePg() {
  const cache = globalThis.__invoicelyPg;
  if (cache?.sql) await cache.sql.end({ timeout: 5 });
}

export async function consumeLimit(key, maximum, seconds) {
  const sql = await pg();
  const now = Math.floor(Date.now() / 1000);
  await sql`DELETE FROM rate_limits WHERE expires_at <= ${now}`;
  const [row] = await sql`
    INSERT INTO rate_limits (key, count, expires_at) VALUES (${key}, 1, ${now + seconds})
    ON CONFLICT (key) DO UPDATE SET count = rate_limits.count + 1
    RETURNING count
  `;
  return Number(row.count) <= maximum;
}
