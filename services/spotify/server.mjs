import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash,createHmac,randomBytes,timingSafeEqual,createCipheriv,createDecipheriv} from 'node:crypto';
const assets=path.join(path.dirname(fileURLToPath(import.meta.url)),'public');
export function createSpotifyServer({secret=process.env.SPOTIFY_SERVICE_SECRET,clientId=process.env.SPOTIFY_CLIENT_ID,redirectUri=process.env.SPOTIFY_REDIRECT_URI,dir=process.env.DATA_DIR||'/data',fetcher=fetch}={}){
 if(!secret||secret.length<32)throw Error('SPOTIFY_SERVICE_SECRET requires at least 32 characters');
 if(redirectUri){const u=new URL(redirectUri);if(u.protocol!=='https:'&&!(u.protocol==='http:'&&['127.0.0.1','[::1]'].includes(u.hostname)))throw Error('Spotify redirect requires HTTPS or a loopback IP');}
 const key=createHash('sha256').update('spotify-tokens:'+secret).digest(),pending=new Map(),locks=new Map();
 const configured=!!clientId&&!!redirectUri;
 const file=id=>path.join(dir,createHash('sha256').update(id).digest('hex')+'.json');
 async function read(id){try{const data=JSON.parse(await fs.readFile(file(id),'utf8')),dec=createDecipheriv('aes-256-gcm',key,Buffer.from(data.iv,'base64'));dec.setAuthTag(Buffer.from(data.tag,'base64'));return JSON.parse(Buffer.concat([dec.update(Buffer.from(data.value,'base64')),dec.final()]).toString());}catch(e){if(e.code==='ENOENT')return null;throw Error('Gespeicherte Spotify-Verbindung konnte nicht geöffnet werden.');}}
 async function save(id,value){await fs.mkdir(dir,{recursive:true,mode:0o700});const iv=randomBytes(12),enc=createCipheriv('aes-256-gcm',key,iv),encrypted=Buffer.concat([enc.update(JSON.stringify(value)),enc.final()]),tmp=file(id)+'.'+randomBytes(8).toString('hex')+'.tmp';await fs.writeFile(tmp,JSON.stringify({iv:iv.toString('base64'),tag:enc.getAuthTag().toString('base64'),value:encrypted.toString('base64')}),{mode:0o600});await fs.rename(tmp,file(id));}
 async function tokenRequest(params){const r=await fetcher('https://accounts.spotify.com/api/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({...params,client_id:clientId}),signal:AbortSignal.timeout(15000)});const data=await r.json();if(!r.ok){const error=Error(data.error==='invalid_grant'?'Bitte Spotify erneut verbinden.':'Spotify-Anmeldung fehlgeschlagen.');error.status=401;throw error;}if(typeof data.access_token!=='string'||!Number.isFinite(data.expires_in))throw Error('Ungültige Spotify-Antwort');return data;}
 async function access(id){if(locks.has(id))return locks.get(id);const task=(async()=>{const saved=await read(id);if(!saved){const e=Error('Bitte Spotify verbinden.');e.status=401;throw e;}if(saved.expiresAt>Date.now()+60000)return saved;const next=await tokenRequest({grant_type:'refresh_token',refresh_token:saved.refresh_token});const updated={...saved,...next,expiresAt:Date.now()+next.expires_in*1000};await save(id,updated);return updated;})();locks.set(id,task);try{return await task;}finally{locks.delete(id);}}
 return http.createServer(async(req,res)=>{
  const json=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
  try{
   if(req.url==='/health')return json(200,{ready:true,configured});
   const actor=req.headers['x-spotify-actor'],time=req.headers['x-spotify-time'],signature=req.headers['x-spotify-signature'];
   if(typeof actor!=='string'||actor.length>512||!/^[\w-]+$/.test(actor)||!/^\d{13}$/.test(time||'')||Math.abs(Date.now()-Number(time))>30000||!/^[a-f0-9]{64}$/.test(signature||''))return json(401,{error:'Unauthorized'});
   let size=0,chunks=[];for await(const chunk of req){size+=chunk.length;if(size>32768)return json(413,{error:'Request too large'});chunks.push(chunk);}const bytes=Buffer.concat(chunks),expected=createHmac('sha256',secret).update([actor,time,req.method,req.url].join('\n')+'\n').update(bytes).digest('hex');
   if(!timingSafeEqual(Buffer.from(signature),Buffer.from(expected)))return json(401,{error:'Unauthorized'});
   const id=Buffer.from(actor,'base64url').toString('utf8');if(!id)return json(401,{error:'Unauthorized'});
   const url=new URL(req.url,'http://spotify'),route=url.pathname;
   const staticFiles={'/':'index.html','/player.js':'player.js','/player.css':'player.css','/callback':'callback.html','/callback.js':'callback.js'};
   if(route==='/callback'&&req.method==='GET'){
    const state=url.searchParams.get('state'),saved=pending.get(state);if(!saved||saved.id!==id||saved.until<Date.now())return json(400,{error:'Anmeldung abgelaufen oder einem anderen Desktop-Konto zugeordnet.'});pending.delete(state);
    if(url.searchParams.has('error'))return json(400,{error:'Spotify-Anmeldung abgebrochen. Dieses Fenster kann geschlossen werden.'});
    const code=url.searchParams.get('code');if(!code)return json(400,{error:'Spotify-Autorisierung fehlt.'});
    const tokens=await tokenRequest({grant_type:'authorization_code',code,redirect_uri:redirectUri,code_verifier:saved.verifier});if(!tokens.refresh_token)throw Error('Spotify hat kein dauerhaftes Anmeldetoken geliefert.');await save(id,{...tokens,expiresAt:Date.now()+tokens.expires_in*1000});
   }
   if(staticFiles[route]&&req.method==='GET'){const name=staticFiles[route];res.writeHead(200,{'Content-Type':name.endsWith('.js')?'application/javascript; charset=utf-8':name.endsWith('.css')?'text/css; charset=utf-8':'text/html; charset=utf-8','Cache-Control':'no-store'});return res.end(await fs.readFile(path.join(assets,name)));}
   if(route==='/status'&&req.method==='GET')return json(200,{configured,connected:!!await read(id),redirectUri:redirectUri||'https://explorer.xserverx.app/api/spotify/callback'});
   if(route==='/auth'&&req.method==='GET'){
    if(!configured)return json(503,{error:'Spotify-Client-ID und Redirect-URI fehlen in der Serverkonfiguration.'});
    for(const [s,v]of pending)if(v.until<Date.now())pending.delete(s);if(pending.size>=1000)return json(429,{error:'Zu viele Anmeldungen. Bitte später versuchen.'});
    const state=randomBytes(32).toString('base64url'),verifier=randomBytes(48).toString('base64url');pending.set(state,{id,verifier,until:Date.now()+600000});
    const params=new URLSearchParams({client_id:clientId,response_type:'code',redirect_uri:redirectUri,state,code_challenge_method:'S256',code_challenge:createHash('sha256').update(verifier).digest('base64url'),scope:'streaming user-read-private user-read-email user-read-playback-state user-modify-playback-state playlist-read-private playlist-read-collaborative'});
    res.writeHead(302,{Location:'https://accounts.spotify.com/authorize?'+params,'Cache-Control':'no-store'});return res.end();
   }
   if(route==='/disconnect'&&req.method==='POST'){if(locks.has(id))await locks.get(id).catch(()=>{});await fs.rm(file(id),{force:true});for(const [s,v]of pending)if(v.id===id)pending.delete(s);return json(200,{connected:false});}
   if(route==='/token'&&req.method==='GET'){const t=await access(id);return json(200,{access_token:t.access_token,expiresAt:t.expiresAt});}
   if(route.startsWith('/web/')){
    const api=route.slice(4),allowed=req.method==='GET'&&(/^\/(me|me\/playlists|me\/player|search)$/.test(api)||/^\/(playlists\/[A-Za-z0-9]+\/(items|tracks)|albums\/[A-Za-z0-9]+\/tracks)$/.test(api))||req.method==='PUT'&&/^\/me\/player(?:\/play)?$/.test(api);
    if(!allowed)return json(403,{error:'Spotify-Funktion nicht freigegeben.'});
    const t=await access(id),r=await fetcher('https://api.spotify.com/v1'+api+url.search,{method:req.method,headers:{Authorization:'Bearer '+t.access_token,'Content-Type':'application/json'},...(bytes.length?{body:bytes}:{}),signal:AbortSignal.timeout(15000)});
    const headers={'Content-Type':'application/json','Cache-Control':'no-store'};if(r.headers.has('retry-after'))headers['Retry-After']=r.headers.get('retry-after');res.writeHead(r.status,headers);return res.end(await r.text());
   }
   json(404,{error:'Nicht gefunden.'});
  }catch(e){json(e.status||502,{error:e.message||'Spotify konnte nicht erreicht werden.'});}
 });
}
if(process.argv[1]===fileURLToPath(import.meta.url))createSpotifyServer().listen(Number(process.env.PORT||3007),'0.0.0.0');
