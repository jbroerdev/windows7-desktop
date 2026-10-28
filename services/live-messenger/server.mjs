import http from'node:http';
import path from'node:path';
import{fileURLToPath}from'node:url';
import{createHmac,timingSafeEqual}from'node:crypto';
import{createMessenger}from'./core.mjs';
import{discordBridge}from'./discord.mjs';
export const signature=(secret,actor,time,method,url,body)=>createHmac('sha256',secret).update([actor,time,method,url].join('\n')).update('\n').update(body).digest('hex');
export async function createServer({secret,directory,service,bridge,localMode=false}={}){
 if(typeof secret!=='string'||secret.length<32)throw Error('MESSENGER_SERVICE_SECRET must contain at least 32 characters');service||=await createMessenger({directory,bridge,localMode});
 const server=http.createServer(async(req,res)=>{const json=(status,value)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(value));};if(req.url==='/health'&&req.method==='GET')return json(200,{ok:true});
  try{if(!['GET','POST'].includes(req.method))return json(405,{error:'Methode nicht erlaubt.'});const actor=req.headers['x-messenger-actor'],time=req.headers['x-messenger-time'],signed=req.headers['x-messenger-signature'];if(typeof actor!=='string'||actor.length>8192||typeof signed!=='string'||! /^[a-f0-9]{64}$/.test(signed)||!Number.isFinite(Number(time))||Math.abs(Date.now()-Number(time))>30000)return json(401,{error:'Unauthorized'});let size=0,parts=[];for await(const b of req){size+=b.length;if(size>3*1024*1024)return json(413,{error:'Nachricht zu groß.'});parts.push(b);}const bytes=Buffer.concat(parts),expected=signature(secret,actor,time,req.method,req.url,bytes);if(!timingSafeEqual(Buffer.from(signed),Buffer.from(expected)))return json(401,{error:'Unauthorized'});const identity=JSON.parse(Buffer.from(actor,'base64url').toString()),url=new URL(req.url,'http://messenger'),data=bytes.length?JSON.parse(bytes):{};json(200,await service.handle(identity,req.method,url.pathname,url.searchParams,data));}catch(e){json(e.status||502,{error:e.status?e.message:'Der Messenger-Dienst konnte die Anfrage nicht verarbeiten.'});}
 });server.on('close',()=>service.close());return server;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const bridge=discordBridge({token:process.env.DISCORD_BOT_TOKEN,personalChannel:process.env.DISCORD_PERSONAL_CHANNEL_ID,shareChannel:process.env.DISCORD_SHARE_CHANNEL_ID}),server=await createServer({secret:process.env.MESSENGER_SERVICE_SECRET,directory:process.env.MESSENGER_DATA_DIR||path.join(path.dirname(fileURLToPath(import.meta.url)),'data'),bridge,localMode:process.env.MESSENGER_LOCAL_MODE==='1'});server.listen(Number(process.env.MESSENGER_PORT||3002),process.env.MESSENGER_HOST||'0.0.0.0',()=>{console.log('Live Messenger service ready');bridge.start();});
}
