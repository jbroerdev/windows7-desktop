import {createHmac} from 'node:crypto';
import {once} from 'node:events';
export async function rdpGateway({req,res,url,user,body,json,authorized=()=>true}){
 if(!user||user.shareEditing)return json(401,{error:'Bitte im persönlichen Konto anmelden.'});
 const route=url.pathname.slice('/api/rdp'.length),read=['/profiles','/stream'].includes(route);
 if(!['/profiles','/profiles/remove','/sessions','/input','/close','/stream'].includes(route))return json(404,{error:'RDP-Funktion nicht gefunden.'});
 if(!(req.method==='GET'&&read||req.method==='POST'&&route!=='/stream'))return json(405,{error:'Methode nicht erlaubt.'});
 const endpoint=process.env.RDP_SERVICE_URL,secret=process.env.RDP_SERVICE_SECRET;if(!endpoint||!secret)return json(503,{error:'Die Remotedesktopverbindung wurde noch nicht eingerichtet.'});
 const bytes=req.method==='GET'?Buffer.alloc(0):await body(128*1024),target=route+url.search,actor=Buffer.from(JSON.stringify({id:user.id,name:user.username})).toString('base64url'),time=String(Date.now()),signature=createHmac('sha256',secret).update([actor,time,req.method,target].join('\n')+'\n').update(bytes).digest('hex');
 const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),30000);timeout.unref?.();res.on('close',()=>controller.abort());let heartbeat;
 try{
  const upstream=await fetch(new URL(target,endpoint),{method:req.method,headers:{'Content-Type':'application/json','X-RDP-Actor':actor,'X-RDP-Time':time,'X-RDP-Signature':signature},...(req.method==='POST'?{body:bytes}:{}),signal:controller.signal,redirect:'error'});clearTimeout(timeout);
  if(route==='/stream'&&upstream.ok){
   res.writeHead(200,{'Content-Type':'application/octet-stream','Cache-Control':'private, no-store, no-transform','X-Accel-Buffering':'no','X-Content-Type-Options':'nosniff'});res.flushHeaders();
   heartbeat=setInterval(()=>{if(!authorized()){controller.abort();res.end();}},2000);heartbeat.unref?.();
   for await(const chunk of upstream.body){if(res.destroyed)break;if(!res.write(chunk))await once(res,'drain',{signal:controller.signal});}res.end();
  }else{res.writeHead(upstream.status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(Buffer.from(await upstream.arrayBuffer()));}
 }catch{if(!res.headersSent&&!res.destroyed)json(503,{error:'Der Remotedesktop-Dienst ist momentan nicht erreichbar.'});else if(!res.destroyed)res.end();}finally{clearTimeout(timeout);clearInterval(heartbeat);}
}
