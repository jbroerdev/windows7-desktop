import {createHmac,createHash,timingSafeEqual,randomUUID} from 'node:crypto';
import {mkdir,open,unlink} from 'node:fs/promises';
import path from 'node:path';
export const BROWSER_DOWNLOAD_LIMIT=128*1024*1024;
export function downloadSignature(secret,headers){return createHmac('sha256',secret).update(['browser-download-v1',headers.actor,headers.time,headers.id,headers.name,headers.size,headers.digest].join('\n')).digest('hex');}
export function downloadName(value){let name=String(value).split(/[\\/]/).at(-1).replace(/[<>:"|?*\x00-\x1f]/g,'_').trim().replace(/[. ]+$/,'');if(!name||name==='.'||name==='..')name='Download';if(/^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.|$)/i.test(name))name='_'+name;return name.slice(0,160);}
export function createBrowserDownloadReceiver({secret,temporaryDir,resolveUser,store}){
 return async function receive(req,res){const json=(status,value)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(value));};const h={actor:req.headers['x-browser-actor'],time:req.headers['x-browser-time'],id:req.headers['x-download-id'],name:req.headers['x-download-name'],size:req.headers['x-download-size'],digest:req.headers['x-download-digest']},sig=req.headers['x-download-signature'],key=secret();
 if(req.method!=='POST'||!key||!/^[A-Za-z0-9_-]{1,512}$/.test(h.actor||'')||!/^\d{13}$/.test(h.time||'')||Math.abs(Date.now()-Number(h.time))>30000||!/^[0-9a-f-]{36}$/.test(h.id||'')||!/^[A-Za-z0-9_-]{1,2048}$/.test(h.name||'')||!/^\d{1,10}$/.test(h.size||'')||!/^[a-f0-9]{64}$/.test(h.digest||'')||!/^[a-f0-9]{64}$/.test(sig||''))return json(401,{error:'Nicht autorisiert.'});
 if(!timingSafeEqual(Buffer.from(downloadSignature(key,h)),Buffer.from(sig)))return json(401,{error:'Nicht autorisiert.'});
 const user=resolveUser(Buffer.from(h.actor,'base64url').toString('utf8'));if(!user)return json(403,{error:'Das Desktop-Profil ist nicht verfügbar.'});if(Number(h.size)>BROWSER_DOWNLOAD_LIMIT)return json(413,{error:'Maximal 128 MB je Browser-Download.'});
 await mkdir(temporaryDir,{recursive:true});const temp=path.join(temporaryDir,'browser-'+randomUUID()+'.part');let handle;
 try{handle=await open(temp,'wx',0o600);const hash=createHash('sha256');let size=0;for await(const chunk of req){size+=chunk.length;if(size>BROWSER_DOWNLOAD_LIMIT||size>Number(h.size))throw Error('Download ist zu groß.');hash.update(chunk);await handle.writeFile(chunk);}await handle.close();handle=null;if(size!==Number(h.size)||hash.digest('hex')!==h.digest)throw Error('Download ist unvollständig oder beschädigt.');const result=await store({user,name:downloadName(Buffer.from(h.name,'base64url').toString('utf8')),file:temp,size,digest:h.digest,transferId:h.id});return json(201,result);
 }catch(error){return json(400,{error:error.message});}finally{await handle?.close().catch(()=>{});await unlink(temp).catch(()=>{});}
 };
}
