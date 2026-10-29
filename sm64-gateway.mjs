import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {Readable} from 'node:stream';
import {pipeline} from 'node:stream/promises';
const assets=/^\/api\/sm64\/assets\/(index\.html|sm64\.eu\.f3dex2e\.(?:js|wasm|data))$/;
const pending=new Map();
export function validSm64Save(value){return typeof value==='string'&&value.length===684&&/^[A-Za-z0-9+/]{683}=$/.test(value)&&Buffer.from(value,'base64').length===512&&Buffer.from(value,'base64').toString('base64')===value;}
export async function sm64Gateway({req,res,url,user,body,json,metadataDir,service=process.env.SM64_SERVICE_URL}){
 if(!user||user.shareEditing||user.role==='share')return json(401,{error:'Bitte im persönlichen Konto anmelden.'});
 const location=path.join(metadataDir,'sm64',createHash('sha256').update(user.id).digest('hex')+'.json');
 if(url.pathname==='/api/sm64/save'){
  if(req.method==='GET'){try{return json(200,JSON.parse(await fs.readFile(location,'utf8')));}catch(e){if(e.code==='ENOENT')return json(200,{save:null});throw e;}}
  if(req.method!=='POST')return json(405,{error:'Methode nicht erlaubt.'});
  let data;try{data=JSON.parse((await body(2048)).toString());}catch{return json(400,{error:'Ungültiger Spielstand.'});}
  if(data.userId!==undefined&&data.userId!==user.id)return json(409,{error:'Die Sitzung hat sich geändert.'});
  if(!validSm64Save(data.save))return json(400,{error:'Ungültiger Spielstand.'});
  const previous=pending.get(location)||Promise.resolve();
  const write=previous.catch(()=>{}).then(async()=>{await fs.mkdir(path.dirname(location),{recursive:true,mode:0o700});const temp=location+'.'+randomUUID()+'.tmp';try{await fs.writeFile(temp,JSON.stringify({save:data.save,updatedAt:new Date().toISOString()}),{mode:0o600});await fs.rename(temp,location);}finally{await fs.rm(temp,{force:true}).catch(()=>{});}});
  pending.set(location,write);try{await write;}finally{if(pending.get(location)===write)pending.delete(location);}return json(200,{saved:true});
 }
 const match=url.pathname.match(assets),status=url.pathname==='/api/sm64/status';
 if(!match&&!status)return json(404,{error:'Nicht gefunden.'});
 if(!['GET','HEAD'].includes(req.method))return json(405,{error:'Methode nicht erlaubt.'});
 if(!service)return json(status?200:503,status?{ready:false}:{error:'Das Spiel ist noch nicht eingerichtet.'});
 let upstream;try{upstream=await fetch(new URL(status?'health':match[1],service.replace(/\/?$/,'/')),{signal:AbortSignal.timeout(30000)});}catch{return json(status?200:503,status?{ready:false}:{error:'Der Spieldienst ist nicht erreichbar.'});}
 if(status)return json(200,{ready:upstream.ok});
 if(!upstream.ok){await upstream.body?.cancel();return json(503,{error:'Die Spieldateien sind noch nicht bereit.'});}
 const ext=match[1].split('.').pop(),type={html:'text/html; charset=utf-8',js:'text/javascript; charset=utf-8',wasm:'application/wasm',data:'application/octet-stream'}[ext];
 res.writeHead(200,{'Content-Type':type,'Cache-Control':'private, no-cache','X-Content-Type-Options':'nosniff','Content-Security-Policy':"frame-ancestors 'self'"});
 if(req.method==='HEAD'){await upstream.body.cancel();return res.end();}
 await pipeline(Readable.fromWeb(upstream.body),res);
}
