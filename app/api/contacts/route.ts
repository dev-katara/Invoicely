import { contacts } from '@/db/schema';
import { endpoint, json, initialize, readJson, audit, limit } from '@/lib/server';
import { contactSchema } from '@/lib/validation';
export const POST = (request:Request) => endpoint(async()=>{
  const ctx=await initialize(request); await limit(`${ctx.user.userId}:write`,120,60);
  const data=contactSchema.parse(await readJson(request));
  await ctx.db.transaction(async tx => {
    await tx.insert(contacts).values({...data,workspaceId:ctx.workspaceId,createdAt:new Date().toISOString()});
    await audit(tx,ctx.workspaceId,'Προσθήκη πελάτη',data.id);
  });
  return json({id:data.id},201);
});
