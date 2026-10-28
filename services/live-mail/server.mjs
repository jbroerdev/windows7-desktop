import http from 'node:http';
import {createHmac,timingSafeEqual} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createMailService} from './core.mjs';
export function signature(secret,user,time,method,url,bytes){return createHmac('sha256',secret).update([user,time,method,url].join('\n')).update('\n').update(bytes).digest('hex');}
export async function createServer({secret,directory,service}={}){
 if(!secret||secret.length<32)throw Error('MAIL_SERVICE_SECRET must contain at least 32 characters.');
 service||=await createMailService({directory});
 return http.createServer(async(req,res)=>{const json=(code,v)=>{res.writeHead(code,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(v));};
  if(req.url==='/health'&&req.method==='GET')return json(200,{ok:true});
  try{const user=req.headers['x-mail-user'],time=req.headers['x-mail-time'],signed=req.headers['x-mail-signature'];if(typeof user!=='string'||! /^[a-zA-Z0-9_-]{1,100}$/.test(user)||typeof signed!=='string'||! /^[a-f0-9]{64}$/.test(signed)||Math.abs(Date.now()-Number(time))>30000||!Number.isFinite(Number(time)))return json(401,{error:'Unauthorized'});
   let size=0,parts=[];for await(const b of req){size+=b.length;if(size>32*1024*1024)return json(413,{error:'Anfrage zu groß.'});parts.push(b);}const bytes=Buffer.concat(parts),expected=signature(secret,user,time,req.method,req.url,bytes);if(!timingSafeEqual(Buffer.from(signed),Buffer.from(expected)))return json(401,{error:'Unauthorized'});
   const url=new URL(req.url,'http://mail');
   if(url.pathname.startsWith('/caldav/')){if(user!=='caldav')return json(401,{error:'Unauthorized'});const result=await service.published(req.method,url,bytes.toString('utf8'),req.headers['x-mail-depth']||'0',req.headers['if-none-match']||'');res.writeHead(result.status,result.headers);return res.end(result.body);}
   const data=bytes.length?JSON.parse(bytes):{},result=await service.handle(user,req.method,url.pathname,url.searchParams,data);
   if(result?.htmlPage){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Content-Security-Policy':"default-src 'none'; img-src data:; style-src 'unsafe-inline'; form-action 'none'; base-uri 'none'; sandbox allow-popups allow-popups-to-escape-sandbox; frame-ancestors 'self'"});return res.end(result.htmlPage);}
   if(result?.binary){res.writeHead(200,{'Content-Type':'application/octet-stream','Content-Disposition':"attachment; filename*=UTF-8''"+encodeURIComponent(result.name),'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});return res.end(result.binary);}json(200,result);
  }catch(e){const status=e.status||502;json(status,{error:e.status?e.message:e.authenticationFailed?'Anmeldung am Mailserver fehlgeschlagen. Bitte Benutzername und Kennwort prüfen.':e.code==='ENOTFOUND'?'Mailserver nicht gefunden. Bitte den Servernamen prüfen.':e.code==='ECONNREFUSED'?'Der Mailserver hat die Verbindung abgelehnt.':'Die Verbindung zum Mailserver ist fehlgeschlagen. Bitte Server, Verschlüsselung und Zugangsdaten prüfen.'});}
 });
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){const server=await createServer({secret:process.env.MAIL_SERVICE_SECRET,directory:process.env.MAIL_DATA_DIR||path.join(process.cwd(),'data')});server.listen(Number(process.env.MAIL_PORT||3001),process.env.MAIL_HOST||'0.0.0.0',()=>console.log('Live Mail service ready'));}
