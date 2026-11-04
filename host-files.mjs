import {hostFile} from './host-command.mjs';
import {createHash} from 'node:crypto';
import {once} from 'node:events';
export async function hostFilesGateway({req,res,url,user,body,json,authorized=()=>true,beginMutation=()=>()=>{}}){
 if(!user?.id||user.role!=='admin'||user.shareEditing)throw Object.assign(Error('Das Host-Dateisystem erfordert ein Administratorkonto.'),{status:403});
 if(!authorized())throw Object.assign(Error('Sitzung nicht mehr gültig.'),{status:401});
 const action=url.pathname.slice('/api/host-files/'.length);
 if(action==='upload'){
  if(req.method!=='POST')throw Object.assign(Error('Methode nicht erlaubt.'),{status:405});
  const uploadId=url.searchParams.get('uploadId'),cleanupActor={id:user.id,role:'admin'};let complete=false;
  try{
   const state=await hostFile(user,'upload-status',{uploadId});if(state.offset!==0)throw Object.assign(Error('Dieser Upload wurde bereits begonnen.'),{status:409});
   if(req.headers['content-length']!==undefined&&Number(req.headers['content-length'])!==state.size)throw Object.assign(Error('Die Dateigröße stimmt nicht mit dem Upload überein.'),{status:400});
   const hash=createHash('sha256');let offset=0,pending=Buffer.alloc(0);
   const send=async bytes=>{if(!authorized())throw Object.assign(Error('Sitzung nicht mehr gültig.'),{status:401});const result=await hostFile(user,'upload-chunk',{uploadId,offset,data:bytes.toString('base64')});offset=result.offset;};
   for await(const bytes of req){if(offset+pending.length+bytes.length>state.size)throw Object.assign(Error('Upload größer als angekündigt.'),{status:413});hash.update(bytes);pending=Buffer.concat([pending,bytes]);while(pending.length>=262144){await send(pending.subarray(0,262144));pending=pending.subarray(262144);}}
   if(pending.length)await send(pending);if(!authorized())throw Object.assign(Error('Sitzung nicht mehr gültig.'),{status:401});
   const release=beginMutation();let result;try{result=await hostFile(user,'upload-commit',{uploadId,digest:hash.digest('hex')});}finally{release();}complete=true;return json(200,result);
  }finally{if(!complete)await hostFile(cleanupActor,'upload-abort',{uploadId}).catch(()=>{});}
 }
 if(action!=='download'){
  if(req.method!=='POST')throw Object.assign(Error('Methode nicht erlaubt.'),{status:405});
  const value=JSON.parse((await body(16*1024*1024)).toString());if(!authorized())throw Object.assign(Error('Sitzung nicht mehr gültig.'),{status:401});return json(200,await hostFile(user,action,value));
 }
 if(!['GET','HEAD'].includes(req.method))throw Object.assign(Error('Methode nicht erlaubt.'),{status:405});
 const path=url.searchParams.get('path');let result=await hostFile(user,'chunk',{path,offset:0});
 res.writeHead(200,{'Content-Type':'application/octet-stream','Content-Length':result.size,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':'sandbox',
  'Content-Disposition':"attachment; filename*=UTF-8''"+encodeURIComponent(result.name).replace(/'/g,'%27')});
 if(req.method==='HEAD'){res.end();return;}
 try{while(!res.destroyed){if(!authorized())throw Object.assign(Error('Sitzung nicht mehr gültig.'),{status:401});const bytes=Buffer.from(result.data,'base64');if(bytes.length&&!res.write(bytes))await once(res,'drain');if(result.offset>=result.size||!bytes.length)break;result=await hostFile(user,'chunk',{path,offset:result.offset,version:result.version});}res.end();}
 catch(error){res.destroy(error);}
}
