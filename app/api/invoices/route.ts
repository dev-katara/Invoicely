import { and, eq } from 'drizzle-orm';
import { invoices, uploads } from '@/db/schema';
import { endpoint, json, initialize, readJson, audit, ApiError, limit } from '@/lib/server';
import { invoiceSchema } from '@/lib/validation';
import { totals } from '@/lib/domain';
export const POST = (request: Request) => endpoint(async()=>{
  const ctx = await initialize(request); await limit(`${ctx.user.userId}:write`,120,60);
  const data = invoiceSchema.parse(await readJson(request));
  const [existing] = await ctx.db.select().from(invoices).where(and(eq(invoices.id,data.id),eq(invoices.workspaceId,ctx.workspaceId)));
  if(existing) return json({id:existing.id});
  if(data.fileId) {
    const [file] = await ctx.db.select().from(uploads).where(and(eq(uploads.id,data.fileId),eq(uploads.workspaceId,ctx.workspaceId)));
    if(!file) throw new ApiError(404,'Το αρχείο δεν βρέθηκε.');
  }
  const now = new Date().toISOString();
  await ctx.db.transaction(async tx => {
    await tx.insert(invoices).values({...data, workspaceId:ctx.workspaceId, items:JSON.stringify(data.items), ...totals(data.items), status:'draft', createdAt:now, updatedAt:now});
    await audit(tx,ctx.workspaceId,'Δημιουργία παραστατικού',data.id);
  });
  return json({id:data.id},201);
});
