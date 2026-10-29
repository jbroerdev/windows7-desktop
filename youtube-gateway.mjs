import {createHmac} from 'node:crypto';
import {Readable} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import {createYoutubeProfiles} from './youtube-profile.mjs';
const stores=new Map(),prefix='/api/youtube/site';
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function youtubeSignature(secret,actor,time,method,route,bytes){return createHmac('sha256',secret).update([actor,time,method,route].join('\n')+'\n').update(bytes).digest('hex');}
export function rewriteYoutubeText(text,type='text/html'){
 text=text.replaceAll('http://desktop.invalid:3006',prefix).replaceAll('https://desktop.invalid:3006',prefix);
 const map=value=>{if(value.startsWith(prefix+'/')||value===prefix)return value;if(value.startsWith('/')&&!value.startsWith('//'))return prefix+value;const m=value.match(/^https?:\/\/(?:www\.|m\.)?youtube\.com(\/.*)?$/i);return m?prefix+(m[1]||'/'):value;};
 if(type.includes('html'))text=text.replace(/\b(href|src|action|poster|data-src)\s*=\s*(["'])(.*?)\2/gi,(_,key,q,value)=>key+'='+q+map(value)+q);
 if(type.includes('html')||type.includes('css'))text=text.replace(/url\(\s*(["']?)(\/(?!\/)[^)'"\s]*)\1\s*\)/gi,(_,q,value)=>'url('+q+map(value)+q+')');
 if(type.includes('javascript')||type.includes('html'))text=text.replace(/(?<![\w$.])(?:(?:window|document|self|top)\.)?location\./g,'window.__desktopYoutubeLocation.').replace(/(?<![\w$.])(?:window|document|self|top)\.location\s*=(?!=)/g,'window.__desktopYoutubeLocation.href=');
 return text;
}
export async function youtubeGateway({req,res,url,user,body,json,metadataDir,endpoint=process.env.YOUTUBE_SERVICE_URL,secret=process.env.YOUTUBE_SERVICE_SECRET}){
 const personal=!!user&&!user.shareEditing&&!user.sharedWorkspace,actorId=personal?user.id:'share';
 let store=stores.get(metadataDir);if(!store){store=createYoutubeProfiles(metadataDir);stores.set(metadataDir,store);}
 let saved=personal?await store.read(user.id):{revision:0,subscriptions:[]};
 const profile=()=>({...saved,userId:personal?user.id:null,username:personal?user.username:'Gast',writable:personal});
 if(url.pathname==='/api/youtube/profile'){
  if(req.method==='GET')return json(200,profile());
  if(req.method!=='POST')return json(405,{error:'Methode nicht erlaubt.'});
  if(!personal)return json(401,{error:'Zum Abonnieren bitte im persÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¶nlichen Desktop-Profil anmelden.'});
  let data;try{data=JSON.parse((await body(8192)).toString());if(!data||data.userId!==user.id)return json(409,{error:'Das Desktop-Profil hat sich geÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¤ndert.'});saved=await store.change(user.id,data.op,data.channel);}catch(e){return json(400,{error:e.message||'UngÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¼ltige Abo-Aktion.'});}return json(200,profile());
 }
 const route=url.pathname.slice(prefix.length)||'/';
 if(!(url.pathname===prefix||url.pathname.startsWith(prefix+'/')))return json(404,{error:'Nicht gefunden.'});
 if(!endpoint||!secret){res.writeHead(503,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});return res.end('<!doctype html><html lang="de"><title>YouTube</title><h2>YouTube wird eingerichtet</h2><p>Der yt2009-Dienst ist noch nicht verbunden.</p></html>');}
 if(!['GET','HEAD','POST'].includes(req.method))return json(405,{error:'Methode nicht erlaubt.'});
 if(/(?:^|\/)(?:\.git|\.env|config\.json|signin|logout|auth|account|my_videos|my_videos_edit|my_videos_upload|my_profile|inbox|pchelper[^/]*|autoshare[^/]*|unlinkhelper|mobile|feeds|youtube|proxy)(?:\/|$)/i.test(route)||req.method==='POST'&&!['/homepage_subscriptions','/videoresponse_load','/morefrom_load'].includes(route))return json(403,{error:'Diese Kontofunktion ist in der Desktop-Einbindung nicht verfÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¼gbar.'});
 const bytes=['GET','HEAD'].includes(req.method)?Buffer.alloc(0):await body(256*1024),time=String(Date.now());
 const identity=Buffer.from(JSON.stringify({id:actorId,subscriptions:saved.subscriptions.map(c=>({url:c.url,name:escape(c.name)}))})).toString('base64url'),target=route+url.search;
 const headers={'X-Youtube-Actor':identity,'X-Youtube-Time':time,'X-Youtube-Signature':youtubeSignature(secret,identity,time,req.method,target,bytes),'Accept-Encoding':'identity','Cookie':'desktop=1; lang=de; global_flags=watch_modern_features; watch_flags=exp_sabr:hd_1080:watch_modern_features; playback_quality=2; saber_playback_mode_picked=1','User-Agent':req.headers['user-agent']||'Desktop YouTube'};
 for(const name of ['range','content-type','source','continuation','original-comment','comment-id','channel','first','page','sort','view','query','id','ids','format','videos','is-embed'])if(typeof req.headers[name]==='string')headers[name]=req.headers[name];
 const controller=new AbortController();const abort=()=>controller.abort();res.on('close',abort);
 let response;try{response=await fetch(new URL(target,endpoint),{method:req.method,headers,...(bytes.length?{body:bytes}:{}),redirect:'manual',signal:AbortSignal.any([controller.signal,AbortSignal.timeout(120000)])});}catch{res.off('close',abort);return json(503,{error:'YouTube ist momentan nicht erreichbar. Bitte erneut versuchen.'});}
 if(response.status>=300&&response.status<400){const raw=response.headers.get('location');await response.body?.cancel();let location;try{const next=new URL(raw,endpoint);if(next.origin!==new URL(endpoint).origin&&next.hostname!=='desktop.invalid')throw Error();location=prefix+next.pathname+next.search;}catch{return json(502,{error:'Nicht unterstÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¼tzte Weiterleitung.'});}res.writeHead(response.status,{'Location':location,'Cache-Control':'no-store'});res.end();res.off('close',abort);return;}
 const type=response.headers.get('content-type')||'application/octet-stream';
 const textual=type.includes('text/')||type.includes('javascript');
 const outgoing={'Content-Type':type.includes('html')?'text/html; charset=utf-8':type,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin'};
 for(const key of ['content-range','accept-ranges','x-part-count','x-yt2009-got-internal-redirect','x-yt2009-live-head','x-yt2009-used-itag','x-yt2009-used-xtag','x-yt2009-video-mime','x-yt2009-xtags'])if(response.headers.has(key))outgoing[key]=response.headers.get(key);
 if(type.includes('html'))outgoing['Content-Security-Policy']="frame-ancestors 'self'; base-uri 'self'; form-action 'self'; object-src 'none'";
 try{if(req.method==='HEAD'){await response.body?.cancel();res.writeHead(response.status,outgoing);res.end();}else if(textual){let text=rewriteYoutubeText(await response.text(),type);if(type.includes('html')&&/<!doctype|<html|<head/i.test(text)){const seed=JSON.stringify(profile()).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029'),bootstrap='<script>window.__desktopYoutubeProfile='+seed+';</script><script charset="utf-8" src="/youtube-bridge.js"></script>';if(/<head(?:\s[^>]*)?>/i.test(text))text=text.replace(/<head(?:\s[^>]*)?>/i,match=>match+bootstrap);else text=bootstrap+text;}res.writeHead(response.status,outgoing);res.end(text);}else{if(response.headers.has('content-length'))outgoing['Content-Length']=response.headers.get('content-length');res.writeHead(response.status,outgoing);await pipeline(Readable.fromWeb(response.body),res);}}finally{res.off('close',abort);}
}
