import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {createYoutubeProfiles,youtubeChannel} from './youtube-profile.mjs';
import {youtubeGateway,youtubeSignature,rewriteYoutubeText} from './youtube-gateway.mjs';
import {browserFrameUrl,browserVisibleUrl} from './public/browser-sites.js';
test('YouTube navigation preserves the visible address without matching unrelated hosts',()=>{
 const origin='https://desktop.test',prefix='/api/youtube/site';
 assert.equal(browserFrameUrl('https://www.youtube.com/watch?v=abc',origin),prefix+'/watch?v=abc');
 assert.equal(browserFrameUrl('https://youtu.be/jNQXAC9IVRw',origin),prefix+'/watch?v=jNQXAC9IVRw');
 assert.equal(browserVisibleUrl(origin+prefix+'/watch?v=abc',origin),'https://www.youtube.com/watch?v=abc');
 assert.equal(browserFrameUrl('https://youtube.com.evil.test/',origin),'https://youtube.com.evil.test/');
 assert.equal(browserFrameUrl('https://www.youtube.com:444/',origin),'https://www.youtube.com:444/');
});
test('Subscriptions survive a new store and concurrent changes without crossing accounts',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'youtube-'));
 try{const store=createYoutubeProfiles(dir),channel=n=>({url:'/channel/UC'+n,name:'Channel '+n});
 await Promise.all(Array.from({length:12},(_,i)=>store.change('alice','subscribe',channel(i))));
 assert.equal((await createYoutubeProfiles(dir).read('alice')).subscriptions.length,12);
 assert.equal((await store.read('bob')).subscriptions.length,0);
 await store.change('alice','unsubscribe',channel(1));assert.equal((await store.read('alice')).subscriptions.length,11);
 assert.throws(()=>youtubeChannel({url:'https://evil.test/channel/UC1',name:'no'}));
 }finally{await fs.rm(dir,{recursive:true,force:true});}
});
test('Subscription API rejects guest writes and stale desktop identities',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'youtube-api-'));
 const call=async(user,data)=>{let result;await youtubeGateway({req:{method:'POST'},res:{},url:new URL('http://test/api/youtube/profile'),user,metadataDir:dir,body:async()=>Buffer.from(JSON.stringify(data)),json:(status,data)=>result={status,data}});return result;};
 try{assert.equal((await call(null,{})).status,401);assert.equal((await call({id:'a',shareEditing:true},{})).status,401);assert.equal((await call({id:'a'},{userId:'b'})).status,409);
 assert.equal((await call({id:'a'},{userId:'a',op:'subscribe',channel:{url:'/@example',name:'Example'}})).status,200);
 }finally{await fs.rm(dir,{recursive:true,force:true});}
});
test('Gateway rewrites resources and location but preserves JavaScript string operations',()=>{
 const source='<head></head><a href="/watch?v=x">x</a><script>location.href="/watch"; x.split("/")</script>';
 const out=rewriteYoutubeText(source);assert.match(out,/href="\/api\/youtube\/site\/watch/);assert.match(out,/window\.__desktopYoutubeLocation.href/);assert.match(out,/x.split\("\/"\)/);
});
test('Gateway signs requests, strips desktop cookies and streams media ranges',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'youtube-stream-')),secret='test-secret-'.repeat(4);
 const upstream=http.createServer((req,res)=>{assert.equal(req.headers.cookie,'lang=de; global_flags=watch_modern_features');const actor=req.headers['x-youtube-actor'],time=req.headers['x-youtube-time'];assert.equal(req.headers['x-youtube-signature'],youtubeSignature(secret,actor,time,req.method,req.url,Buffer.alloc(0)));
 if(req.url==='/media'){assert.equal(req.headers.range,'bytes=2-4');res.writeHead(206,{'Content-Type':'video/mp4','Content-Range':'bytes 2-4/6','Content-Length':'3'});res.end('cde');}else{res.writeHead(200,{'Content-Type':'text/html','Set-Cookie':'bad=1'});res.end('<html><head></head><body><a href="/watch?v=x">video</a></body></html>');}});
 await new Promise(r=>upstream.listen(0,'127.0.0.1',r));
 const server=http.createServer(async(req,res)=>{try{await youtubeGateway({req,res,url:new URL(req.url,'http://test'),user:{id:'a'},metadataDir:dir,endpoint:'http://127.0.0.1:'+upstream.address().port,secret,json:(status,data)=>{res.writeHead(status);res.end(JSON.stringify(data));}});}catch(e){res.writeHead(500);res.end(e.message);}});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 try{const base='http://127.0.0.1:'+server.address().port+'/api/youtube/site';let r=await fetch(base+'/');const html=await r.text();assert.match(html,/__desktopYoutubeProfile/);assert.equal(r.headers.get('set-cookie'),null);r=await fetch(base+'/media',{headers:{Range:'bytes=2-4',Cookie:'session=private'}});assert.equal(r.status,206);assert.equal(r.headers.get('content-range'),'bytes 2-4/6');assert.equal(await r.text(),'cde');assert.equal((await fetch(base+'/config.json')).status,403);
 }finally{await Promise.all([new Promise(r=>server.close(r)),new Promise(r=>upstream.close(r))]);await fs.rm(dir,{recursive:true,force:true});}
});
