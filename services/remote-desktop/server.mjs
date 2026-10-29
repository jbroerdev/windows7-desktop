import http from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomUUID,createHmac,timingSafeEqual} from 'node:crypto';
import {createStore} from './core.mjs';
import {connectGuacd,instruction} from './protocol.mjs';
export const signature=(secret,actor,time,method,url,bytes)=>createHmac('sha256',secret).update([actor,time,method,url].join('\n')+'\n').update(bytes).digest('hex');
export async function createServer({secret,directory,targets=[],guacdHost='guacd',guacdPort=4822,connector=connectGuacd}={}){
 if(typeof secret!=='string'||secret.length<32)throw Error('RDP_SERVICE_SECRET must contain at least 32 characters');
 const store=await createStore({directory,targets}),sessions=new Map();
 const finish=(s,message)=>{if(!sessions.delete(s.id))return;s.connection?.close();delete s.config.password;if(s.response&&!s.response.writableEnded){if(message)s.response.write(instruction('error',message,519));s.response.end();}};
 const reap=setInterval(()=>{for(const s of sessions.values())if(Date.now()>s.expires)finish(s,'Die Sitzung ist abgelaufen.');},10000);reap.unref();
 const server=http.createServer(async(req,res)=>{
  const json=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
  if(req.url==='/health'&&req.method==='GET')return json(200,{ok:true});
  try{
   const actor=req.headers['x-rdp-actor'],time=req.headers['x-rdp-time'],signed=req.headers['x-rdp-signature'];if(typeof actor!=='string'||actor.length>4096||!/^\d{13}$/.test(time||'')||Math.abs(Date.now()-Number(time))>30000||! /^[a-f0-9]{64}$/.test(signed||''))throw Object.assign(Error('Unauthorized'),{status:401});
   const chunks=[];let size=0;for await(const b of req){size+=b.length;if(size>128*1024)throw Object.assign(Error('Anfrage zu groß.'),{status:413});chunks.push(b);}const bytes=Buffer.concat(chunks);
   if(!timingSafeEqual(Buffer.from(signed),Buffer.from(signature(secret,actor,time,req.method,req.url,bytes))))throw Object.assign(Error('Unauthorized'),{status:401});
   const user=JSON.parse(Buffer.from(actor,'base64url').toString());if(!/^[a-zA-Z0-9_-]{1,100}$/.test(user.id||''))throw Object.assign(Error('Unauthorized'),{status:401});
   const url=new URL(req.url,'http://rdp'),data=bytes.length?JSON.parse(bytes):{};
   if(url.pathname==='/profiles'&&req.method==='GET')return json(200,store.list(user.id));
   if(url.pathname==='/profiles'&&req.method==='POST')return json(200,await store.put(user.id,data));
   if(url.pathname==='/profiles/remove'&&req.method==='POST')return json(200,await store.remove(user.id,data.id));
   if(url.pathname==='/sessions'&&req.method==='POST'){
    if(sessions.size>=64||[...sessions.values()].filter(s=>s.owner===user.id).length>=4)throw Object.assign(Error('Zu viele aktive Remotedesktopverbindungen.'),{status:429});
    const s={id:randomUUID(),owner:user.id,config:store.connection(user.id,data),expires:Date.now()+30000,attached:false};s.config.displayName=String(user.name||'Desktop').slice(0,100);sessions.set(s.id,s);return json(200,{id:s.id});
   }
   const s=sessions.get(url.searchParams.get('session')||data.session);if(!s||s.owner!==user.id||s.expires<Date.now())throw Object.assign(Error('Sitzung nicht gefunden.'),{status:404});
   if(url.pathname==='/close'&&req.method==='POST'){finish(s);return json(200,{ok:true});}
   if(url.pathname==='/input'&&req.method==='POST'){
    if(!s.ready||typeof data.data!=='string'||data.data.length>65536)throw Object.assign(Error('Verbindung ist nicht bereit.'),{status:409});s.connection.write(data.data);return json(200,{ok:true});
   }
   if(url.pathname==='/stream'&&req.method==='GET'){
    if(s.attached)throw Object.assign(Error('Sitzung ist bereits verbunden.'),{status:409});s.attached=true;s.response=res;s.expires=Date.now()+8*60*60*1000;
    res.writeHead(200,{'Content-Type':'application/octet-stream','Cache-Control':'private, no-store, no-transform','X-Accel-Buffering':'no','X-Content-Type-Options':'nosniff'});res.flushHeaders();
    res.on('close',()=>finish(s));
    s.connection=connector({host:guacdHost,port:guacdPort,config:s.config,onReady:()=>{s.ready=true;res.write(instruction('',s.id));},onData:text=>{if(!res.write(text))s.connection?.pause();},onClose:message=>finish(s,message)});
    res.on('drain',()=>s.connection?.resume());return;
   }
   return json(404,{error:'RDP-Funktion nicht gefunden.'});
  }catch(e){if(res.headersSent){res.end();return;}json(e.status||502,{error:e.status?e.message:'Die Remotedesktopverbindung konnte nicht verarbeitet werden.'});}
 });
 server.on('close',()=>{clearInterval(reap);for(const s of sessions.values())finish(s);store.close();});return server;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const server=await createServer({secret:process.env.RDP_SERVICE_SECRET,directory:process.env.RDP_DATA_DIR||path.join(path.dirname(fileURLToPath(import.meta.url)),'data'),targets:(process.env.RDP_ALLOWED_TARGETS||'').split(',').map(s=>s.trim()).filter(Boolean),guacdHost:process.env.GUACD_HOST||'guacd',guacdPort:Number(process.env.GUACD_PORT||4822)});
 server.listen(Number(process.env.RDP_PORT||3003),process.env.RDP_HOST||'0.0.0.0',()=>console.log('Remote Desktop service ready'));
}
