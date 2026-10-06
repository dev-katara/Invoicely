import { drizzle } from 'drizzle-orm/postgres-js';
import { pg } from './runtime.mjs';
import * as schema from './schema';

export async function getDb() {
  const sql = await pg();
  return drizzle(sql, { schema });
}
