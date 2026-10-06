import { eq } from 'drizzle-orm';
import { workspaces } from '@/db/schema';
import { endpoint, snapshot, json, initialize, readJson, audit } from '@/lib/server';
import { workspaceSchema } from '@/lib/validation';
export const dynamic = 'force-dynamic';
export const GET = (request:Request) => endpoint(async()=>json(await snapshot(request)));
export const PATCH = (request:Request) => endpoint(async()=>{
  const ctx = await initialize(request);
  const data = workspaceSchema.parse(await readJson(request));
  await ctx.db.transaction(async tx => {
    await tx.update(workspaces).set(data).where(eq(workspaces.id,ctx.workspaceId));
    await audit(tx,ctx.workspaceId,'Ενημέρωση εταιρικών στοιχείων',ctx.workspaceId);
  });
  return json({ok:true});
});
