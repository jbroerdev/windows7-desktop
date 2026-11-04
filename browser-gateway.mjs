import {createHmac} from 'node:crypto';
import {once} from 'node:events';
export async function browserGateway({req,res,url,user,body,json,authorized=()=>true,endpoint=process.env.BROWSER_SERVICE_URL,secret=process.env.BROWSER_SERVICE_SECRET}){
 if(!user||user.shareEditing||user.sharedWorkspace)return json(401,{error:'Bitte im persönlichen Desktop-Konto anmelden.'});
 const route=url.pathname.slice('/api/browser'.length);
 if(!['/session','/events','/command','/suspend'].includes(route)||url.search)return json(404,{error:'Browser-Funktion nicht gefunden.'});
 if(!(req.method==='GET'&&['/session','/events'].includes(route)||req.method==='POST'&&['/command','/suspend'].includes(route)))return json(405,{error:'Methode nicht erlaubt.'});
 if(!endpoint||!secret)return json(503,{error:'Der Server-Browser ist noch nicht eingerichtet.'});
 const bytes=req.method==='POST'?await body(100000):Buffer.alloc(0),actor=Buffer.from(String(user.id)).toString('base64url'),time=String(Date.now()),signature=createHmac('sha256',secret).update([actor,time,req.method,route].join('\n')+'\n').update(bytes).digest('hex');
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),60000);let heartbeat;res.on('close',()=>controller.abort());
 try{const upstream=await fetch(new URL(route,endpoint),{method:req.method,headers:{'Content-Type':'application/json','X-Browser-Actor':actor,'X-Browser-Time':time,'X-Browser-Signature':signature},...(bytes.length?{body:bytes}:{}),signal:controller.signal,redirect:'error'});clearTimeout(timeout);
  if(route==='/events'&&upstream.ok){res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'private, no-store, no-transform','X-Accel-Buffering':'no','X-Content-Type-Options':'nosniff'});res.flushHeaders();heartbeat=setInterval(()=>{if(!authorized()){controller.abort();res.end();}},2000);heartbeat.unref?.();for await(const chunk of upstream.body){if(res.destroyed)break;if(!res.write(chunk))await once(res,'drain',{signal:controller.signal});}res.end();}
  else{res.writeHead(upstream.status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(Buffer.from(await upstream.arrayBuffer()));}
 }catch{if(!res.headersSent&&!res.destroyed)json(503,{error:'Der Browser-Dienst ist momentan nicht erreichbar.'});else res.end();}finally{clearTimeout(timeout);clearInterval(heartbeat);}
}
