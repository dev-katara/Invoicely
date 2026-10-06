import { createClient } from '@supabase/supabase-js';

const BUCKET = 'uploads';

function client() {
  const cache = globalThis as unknown as { __invoicelySupabase?: ReturnType<typeof createClient> };
  if (cache.__invoicelySupabase) return cache.__invoicelySupabase;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
  cache.__invoicelySupabase = createClient(url, key, { auth: { persistSession: false } });
  return cache.__invoicelySupabase;
}

function objectKey(key: string) {
  if (!/^documents\/[A-Za-z0-9%:_-]+\/[a-f0-9-]{36}$/.test(key)) throw new Error('Invalid object key');
  return key;
}

export async function putFile(key: string, body: ArrayBuffer) {
  const { error } = await client().storage.from(BUCKET).upload(objectKey(key), Buffer.from(body), { contentType: 'application/octet-stream', upsert: false });
  if (error) throw error;
}

export async function getFile(key: string) {
  const { data, error } = await client().storage.from(BUCKET).download(objectKey(key));
  if (error) return null;
  return new Uint8Array(await data.arrayBuffer());
}

export async function deleteFile(key: string) {
  const { error } = await client().storage.from(BUCKET).remove([objectKey(key)]);
  if (error) throw error;
}
