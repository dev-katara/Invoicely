import {getFile} from '@/lib/storage';
import {and,eq} from 'drizzle-orm';
import {uploads} from '@/db/schema';
import {endpoint,initialize,ApiError} from '@/lib/server';
export const GET=(request:Request,{params}:{params:Promise<{id:string}>})=>endpoint(async()=>{
  const ctx=await initialize(request);const{id}=await params;
  const [row]=await ctx.db.select().from(uploads).where(and(eq(uploads.id,id),eq(uploads.workspaceId,ctx.workspaceId)));
  if(!row)throw new ApiError(404,'Το αρχείο δεν βρέθηκε.');
  const file=await getFile(row.objectKey);if(!file)throw new ApiError(404,'Το αρχείο δεν βρέθηκε.');
  return new Response(file,{headers:{'Content-Type':row.mime,'Content-Disposition':`attachment; filename*=UTF-8''${encodeURIComponent(row.filename)}`,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; sandbox"}});
});
