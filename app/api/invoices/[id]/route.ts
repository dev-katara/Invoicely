import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { invoices } from '@/db/schema';
import { endpoint, json, initialize, readJson, audit, ApiError } from '@/lib/server';
import { validVat } from '@/lib/domain';
type Params = {params:Promise<{id:string}>};
export const PATCH = (request:Request,{params}:Params) => endpoint(async()=>{
  const ctx=await initialize(request); const {id}=await params;
  const {status}=z.object({status:z.enum(['issued','paid'])}).parse(await readJson(request));
  const [row]=await ctx.db.select().from(invoices).where(and(eq(invoices.id,id),eq(invoices.workspaceId,ctx.workspaceId)));
  if(!row) throw new ApiError(404,'Το παραστατικό δεν βρέθηκε.');
  if(row.status===status) return json({ok:true});
  if((status==='issued'&&row.status!=='draft')||(status==='paid'&&row.status!=='issued')) throw new ApiError(409,'Η κατάσταση του παραστατικού έχει αλλάξει.');
  if(ctx.mode==='live'&&status==='issued'&&(!validVat(row.vatNumber)||!validVat(ctx.workspace!.vatNumber)||!ctx.workspace!.address.trim())) throw new ApiError(422,'Συμπληρώστε έγκυρα ΑΦΜ εκδότη και αντισυμβαλλόμενου, και διεύθυνση επιχείρησης.');
  const result=await ctx.db.update(invoices).set({status,updatedAt:new Date().toISOString()}).where(and(eq(invoices.id,id),eq(invoices.workspaceId,ctx.workspaceId),eq(invoices.status,row.status))).returning({id:invoices.id});
  if(!result.length) throw new ApiError(409,'Η κατάσταση άλλαξε. Ανανεώστε τη σελίδα.');
  await audit(ctx.db,ctx.workspaceId,status==='paid'?'Καταχώριση εξόφλησης':'Οριστικοποίηση παραστατικού',id);
  return json({ok:true});
});
export const DELETE = (request:Request,{params}:Params) => endpoint(async()=>{
  const ctx=await initialize(request);const {id}=await params;
  const result=await ctx.db.delete(invoices).where(and(eq(invoices.id,id),eq(invoices.workspaceId,ctx.workspaceId),eq(invoices.status,'draft'))).returning({id:invoices.id});
  if(!result.length) throw new ApiError(409,'Μπορούν να διαγραφούν μόνο προσχέδια που σας ανήκουν.');
  await audit(ctx.db,ctx.workspaceId,'Διαγραφή προσχεδίου',id);return json({ok:true});
});
