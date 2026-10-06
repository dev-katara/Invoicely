import { and,eq } from 'drizzle-orm';
import { invoices } from '@/db/schema';
import { endpoint,json,initialize,ApiError } from '@/lib/server';
import { mydataDraft } from '@/lib/mydata';
export const GET=(request:Request,{params}:{params:Promise<{id:string}>})=>endpoint(async()=>{
  const ctx=await initialize(request); const {id}=await params;
  const [row]=await ctx.db.select().from(invoices).where(and(eq(invoices.id,id),eq(invoices.workspaceId,ctx.workspaceId)));
  if(!row) throw new ApiError(404,'Το παραστατικό δεν βρέθηκε.');
  return json(mydataDraft({...row,items:JSON.parse(row.items)},ctx.workspace!));
});
