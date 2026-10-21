import {test} from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {mkdtemp,rm} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
test('Path proxy: admin settings, opaque sandbox, isolated cookies, WebSockets and revocation',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'app-proxy-'));Object.assign(process.env,{NODE_ENV:'test',DATA_DIR:dir});
 const upstream=http.createServer(async(req,res)=>{let body='';for await(const c of req)body+=c;res.writeHead(200,{'Content-Type':req.url==='/'?'text/html':'application/json','Set-Cookie':'app_session=test; Path=/; HttpOnly','X-Frame-Options':'DENY'});res.end(req.url==='/'?'<html><head></head><body><img src="/asset.png"><form action="/login"></form></body></html>':JSON.stringify({url:req.url,cookie:req.headers.cookie,origin:req.headers.origin,body}));});
 upstream.on('upgrade',(req,socket,head)=>{socket.on('error',()=>{});socket.write('HTTP/1.1 101 Switching Protocols\r\nConnection: Upgrade\r\nUpgrade: test-echo\r\n\r\n');if(head.length)socket.write(head);socket.pipe(socket);});
 await new Promise(r=>upstream.listen(0,'127.0.0.1',r));const {server}=await import('./backend.mjs');await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;let cookie='';
 function request(route,data,session=cookie,headers={}){return new Promise((resolve,reject)=>{const req=http.request(base+route,{method:data===undefined?'GET':'POST',headers:{cookie:session,'Content-Type':'application/json',...headers}},res=>{let body='';res.on('data',c=>body+=c);res.on('end',()=>resolve({status:res.statusCode,headers:new Headers(res.headers),json:async()=>JSON.parse(body),text:async()=>body}));});req.on('error',reject);req.end(data===undefined?undefined:JSON.stringify(data));});}
 try{
 const setup=await request('/api/setup',{username:'admin',password:'proxy-admin-password'});cookie=setup.headers.get('set-cookie').split(';')[0];const admin=cookie;
 await request('/api/users',{username:'alice',password:'proxy-alice-password'});let nodes=(await(await request('/api/nodes')).json()).nodes;const folder=nodes.find(n=>n.space==='documents'&&n.system&&n.writable);
 const target='http://127.0.0.1:'+upstream.address().port;assert.equal((await request('/api/link',{parent:folder.id,name:'Interne App',url:target,openInWindow:true,appMode:true,proxyEnabled:true})).status,200);nodes=(await(await request('/api/nodes')).json()).nodes;const link=nodes.find(n=>n.name==='Interne App');assert.equal(link.proxyEnabled,true);
 const aliceLogin=await request('/api/login',{username:'alice',password:'proxy-alice-password'}),alice=aliceLogin.headers.get('set-cookie').split(';')[0],aliceFolder=(await(await request('/api/nodes',undefined,alice)).json()).nodes.find(n=>n.space==='documents'&&n.system);
 assert.equal((await request('/api/link',{parent:aliceFolder.id,name:'Forbidden',url:target,openInWindow:true,appMode:true,proxyEnabled:true},alice)).status,403);
 assert.equal((await request('/api/proxy-launch?id='+link.id,undefined,alice)).status,404);assert.equal((await request('/api/proxy-launch?id='+link.id,undefined,'')).status,404);
 await request('/api/share',{id:link.id,shared:true},admin);
 const prefix=(await(await request('/api/proxy-launch?id='+link.id,undefined,alice)).json()).url;assert.match(prefix,/^\/app\/interne-app\/[a-f0-9]{64}\/$/);
 const page=await request(prefix,undefined,admin);assert.equal(page.status,200);assert.equal(page.headers.get('set-cookie'),null);assert.match(page.headers.get('content-security-policy'),/sandbox allow-scripts/);assert.ok(!page.headers.get('content-security-policy').includes('allow-same-origin'));assert.equal(page.headers.get('x-frame-options'),null);assert.ok((await page.text()).includes('src="'+prefix+'asset.png"'));
 const posted=await request(prefix+'api/login?x=1',{test:true},admin,{origin:'null'});assert.equal(posted.status,200);const data=await posted.json();assert.equal(data.url,'/api/login?x=1');assert.equal(data.cookie,'app_session=test');assert.ok(!data.cookie.includes('session='+admin.split('=')[1]));assert.equal(data.origin,target);assert.equal(data.body,'{"test":true}');assert.equal(posted.headers.get('access-control-allow-origin'),'null');
 assert.equal((await request(prefix+'__desktop_storage/local',{op:'set',key:'minecraft.options',value:'saved'},'',{origin:'null'})).status,200);
 await request(prefix+'__desktop_storage/session',{op:'set',key:'one',value:'1'},'');await request(prefix+'__desktop_storage/session',{op:'set',key:'two',value:'2'},'');assert.deepEqual((await(await request(prefix+'__desktop_storage/session',undefined,'')).json()).data,{one:'1',two:'2'});
 const secondPrefix=(await(await request('/api/proxy-launch?id='+link.id,undefined,alice)).json()).url;assert.equal((await(await request(secondPrefix+'__desktop_storage/local',undefined,'')).json()).data['minecraft.options'],'saved');assert.deepEqual((await(await request(secondPrefix+'__desktop_storage/session',undefined,'')).json()).data,{});
 await new Promise((resolve,reject)=>{const req=http.request(base+prefix+'socket',{headers:{Connection:'Upgrade',Upgrade:'test-echo'}});req.on('upgrade',(res,socket)=>{socket.once('data',data=>{try{assert.equal(data.toString(),'hello');socket.destroy();resolve();}catch(e){reject(e);}});socket.on('error',reject);socket.write('hello');});req.on('error',reject);req.end();});
 assert.equal((await request('/api/copy',{ids:[link.id],parent:aliceFolder.id},alice)).status,200);const copied=(await(await request('/api/nodes',undefined,alice)).json()).nodes.find(n=>n.name==='Interne App');assert.equal(copied.proxyEnabled,false);
 await request('/api/logout',{},alice);assert.equal((await request(prefix,undefined,'')).status,403);
 const publicPrefix=(await(await request('/api/proxy-launch?id='+link.id,undefined,'')).json()).url;assert.equal((await request(publicPrefix,undefined,'')).status,200);await request('/api/share',{id:link.id,shared:false},admin);assert.equal((await request(publicPrefix,undefined,'')).status,403);
 assert.equal((await request('/app/interne-app/'+'0'.repeat(64)+'/',undefined,'')).status,403);
 const inspected=(await(await request('/api/nodes',undefined,admin)).json()).nodes;assert.ok(inspected.some(n=>n.id===aliceFolder.id&&!n.writable&&n.ownerName==='alice'));
 }finally{await new Promise(r=>server.close(r));await new Promise(r=>upstream.close(r));await rm(dir,{recursive:true,force:true});}
});
