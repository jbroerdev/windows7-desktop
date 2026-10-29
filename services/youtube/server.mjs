import http from 'node:http';
import fs from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {createHmac,timingSafeEqual} from 'node:crypto';
import {Readable} from 'node:stream';
import {pipeline} from 'node:stream/promises';
const secret=process.env.YOUTUBE_SERVICE_SECRET;if(!secret||secret.length<32)throw Error('YOUTUBE_SERVICE_SECRET must contain 32 or more characters');
// Refresh shipped resources on upgrades while keeping downloaded media and JSON caches.
await fs.cp('/integration/seed/assets','/yt2009/assets',{recursive:true});
await fs.cp('/integration/seed/cache-code','/yt2009/back/cache_dir',{recursive:true});
const child=spawn('/bin/sh',['docker-entrypoint.sh','node','backend.js'],{cwd:'/yt2009',stdio:'inherit',env:{...process.env,YT2009_PORT:'3006',YT2009_IP:'desktop.invalid',YT2009_ENV:'dev',YT2009_AUTO_MAINTAIN:'true',YT2009_MAINTAIN_MAX_SIZE:process.env.YOUTUBE_CACHE_GB||'2',YT2009_DISABLEMASTER:'true',YT2009_DEFAULTF:'false',YT2009_MAX1080:'true',NODE_OPTIONS:'--max-http-header-size=1048576'}});
child.on('exit',code=>process.exit(code||1));
const sign=(actor,time,method,route,bytes)=>createHmac('sha256',secret).update([actor,time,method,route].join('\n')+'\n').update(bytes).digest('hex');
const server=http.createServer({maxHeaderSize:1048576},async(req,res)=>{
 const json=(status,value)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(value));};
 try{if(req.url==='/health'){let ready=false;try{const r=await fetch('http://127.0.0.1:3006/ver',{signal:AbortSignal.timeout(2000)});await r.body?.cancel();ready=r.status<500;}catch{}return json(ready?200:503,{ready});}
 const actor=req.headers['x-youtube-actor'],time=req.headers['x-youtube-time'],signature=req.headers['x-youtube-signature'];if(typeof actor!=='string'||actor.length>700000||typeof signature!=='string'||! /^[a-f0-9]{64}$/.test(signature)||!Number.isFinite(Number(time))||Math.abs(Date.now()-Number(time))>30000)return json(401,{error:'Unauthorized'});
 if(!['GET','HEAD','POST'].includes(req.method))return json(405,{error:'Method not allowed'});
 let size=0,chunks=[];for await(const chunk of req){size+=chunk.length;if(size>256*1024)return json(413,{error:'Request too large'});chunks.push(chunk);}const bytes=Buffer.concat(chunks),expected=sign(actor,time,req.method,req.url,bytes);if(!timingSafeEqual(Buffer.from(signature),Buffer.from(expected)))return json(401,{error:'Unauthorized'});
 const identity=JSON.parse(Buffer.from(actor,'base64url').toString());if(typeof identity.id!=='string'||!Array.isArray(identity.subscriptions)||identity.subscriptions.length>500)return json(400,{error:'Invalid identity'});
 const headers={'Accept-Encoding':'identity','X-Desktop-User':identity.id,'X-Desktop-Subscriptions':Buffer.from(JSON.stringify(identity.subscriptions)).toString('base64url'),'Cookie':req.headers.cookie||'desktop=1; lang=de; global_flags=watch_modern_features; watch_flags=exp_sabr:hd_1080:watch_modern_features; playback_quality=2; saber_playback_mode_picked=1','User-Agent':req.headers['user-agent']||'Desktop YouTube','Referer':'http://desktop.invalid:3006/watch'};
 for(const name of ['range','content-type','source','continuation','original-comment','comment-id','channel','first','page','sort','view','query','id','ids','format','videos','is-embed'])if(req.headers[name])headers[name]=req.headers[name];
 const controller=new AbortController();res.on('close',()=>controller.abort());const upstream=await fetch('http://127.0.0.1:3006'+req.url,{method:req.method,headers,...(bytes.length?{body:bytes}:{}),redirect:'manual',signal:controller.signal});
 const outgoing={};for(const key of ['content-type','content-length','content-range','accept-ranges','location','x-part-count','x-yt2009-got-internal-redirect','x-yt2009-live-head','x-yt2009-used-itag','x-yt2009-used-xtag','x-yt2009-video-mime','x-yt2009-xtags'])if(upstream.headers.has(key))outgoing[key]=upstream.headers.get(key);res.writeHead(upstream.status,outgoing);if(req.method==='HEAD'){await upstream.body?.cancel();res.end();}else await pipeline(Readable.fromWeb(upstream.body),res);
 }catch(error){if(!res.headersSent)json(502,{error:'YouTube backend unavailable'});else res.destroy();}
});
server.listen(Number(process.env.PORT||3005),'0.0.0.0');
for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>{child.kill('SIGTERM');server.close(()=>process.exit(0));setTimeout(()=>process.exit(0),5000).unref();});
