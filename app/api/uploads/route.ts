import {putFile,deleteFile} from '@/lib/storage';
import {and,eq} from 'drizzle-orm';
import {uploads} from '@/db/schema';
import {endpoint,json,initialize,ApiError,limit,boundedBody,audit} from '@/lib/server';
export const POST=(request:Request)=>endpoint(async()=>{
  const ctx=await initialize(request);await limit(`${ctx.user.userId}:upload`,30);
  const body=await boundedBody(request,11*1024*1024);
  const form=await new Response(body,{headers:{'Content-Type':request.headers.get('content-type')??''}}).formData();
  const file=form.get('file');
  if(!(file instanceof File)||!file.size||file.size>10*1024*1024) throw new ApiError(422,'Επιλέξτε PDF, JPG ή PNG έως 10 MB.');
  const buffer=await file.arrayBuffer();const b=new Uint8Array(buffer);
  const mime=b[0]===0x25&&b[1]===0x50&&b[2]===0x44&&b[3]===0x46?'application/pdf':b[0]===0x89&&b[1]===0x50&&b[2]===0x4e&&b[3]===0x47?'image/png':b[0]===0xff&&b[1]===0xd8&&b[2]===0xff?'image/jpeg':null;
  if(!mime) throw new ApiError(415,'Το περιεχόμενο πρέπει να είναι PDF, JPG ή PNG.');
  const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',buffer))].map(x=>x.toString(16).padStart(2,'0')).join('');
  const [duplicate]=await ctx.db.select().from(uploads).where(and(eq(uploads.sha256,hash),eq(uploads.workspaceId,ctx.workspaceId)));
  if(duplicate) return json({id:duplicate.id,duplicate:true});
  const id=crypto.randomUUID();const objectKey=`documents/${encodeURIComponent(ctx.workspaceId)}/${id}`;
  const filename=file.name.replace(/[\x00-\x1f/\\]/g,'_').slice(0,150);
  await putFile(objectKey,buffer);
  try { await ctx.db.transaction(async tx => {
    await tx.insert(uploads).values({id,workspaceId:ctx.workspaceId,filename,mime,size:file.size,objectKey,sha256:hash,createdAt:new Date().toISOString()});
    await audit(tx,ctx.workspaceId,'Μεταφόρτωση αρχείου',id);
  }); }
  catch(e){await deleteFile(objectKey);throw e;}
  return json({id,duplicate:false},201);
});
