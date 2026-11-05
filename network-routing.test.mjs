import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {mkdtemp,readFile,rm} from 'node:fs/promises';

const deferred=()=>{let resolve;const promise=new Promise(done=>resolve=done);return{promise,resolve};};

test('actual network routes bind privilege, profile, host envelopes and alias persistence', {timeout:15000}, async t=>{
 const temp=await mkdtemp(path.join(os.tmpdir(),'network-routing-'));
 const socket=process.platform==='win32'?'\\\\.\\pipe\\network-routing-'+randomUUID():path.join(temp,'agent.sock');
 const prior={NODE_ENV:process.env.NODE_ENV,DATA_DIR:process.env.DATA_DIR,EXPLORER_ROOT:process.env.EXPLORER_ROOT,HOST_AGENT_SOCKET:process.env.HOST_AGENT_SOCKET};
 Object.assign(process.env,{NODE_ENV:'test',DATA_DIR:path.join(temp,'metadata'),EXPLORER_ROOT:path.join(temp,'Explorer'),HOST_AGENT_SOCKET:socket});
 const seen=[];let hold=null,server;
 const snapshot={schemaVersion:1,scope:'host',generatedAt:new Date().toISOString(),revision:'a'.repeat(64),internetConnectivity:'not-tested',capabilities:{readAdapters:true,diagnose:true,configureIpv4:false,enable:false,disable:false},adapters:[{id:'2:020000000001',name:'eth0',ifindex:2,mac:'02:00:00:00:00:01',adminUp:true,operState:'UP',mtu:1500,addresses:[{family:'inet',local:'192.0.2.10',prefixLength:24}],routes:[],dnsServers:null,capabilities:{configureIpv4:false,enable:false,disable:false},configurationReason:'Unavailable in this fixture.'}]};
 const host=http.createServer(async(req,res)=>{
  let raw='';for await(const part of req)raw+=part;
  const data=JSON.parse(raw);seen.push({path:req.url,data});
  if(hold){const current=hold;hold=null;current.started.resolve();await current.release.promise;}
  const result=req.url==='/network/snapshot'?snapshot:{scope:'host',kind:data.kind,target:data.target,output:'Synthetic unreachable host',exitCode:1};
  res.setHeader('content-type','application/json');res.end(JSON.stringify(result));
 });
 await new Promise(resolve=>host.listen(socket,resolve));
 try{
  ({server}=await import('./backend.mjs'));await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base='http://127.0.0.1:'+server.address().port;
  const call=async(route,data,cookie='',method=data===undefined?'GET':'POST')=>{const r=await fetch(base+route,{method,headers:{cookie,'content-type':'application/json'},body:data===undefined?undefined:JSON.stringify(data)});return{status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};};
  const credentials={username:'netadmin',password:'synthetic-network-routing-only'};
  let admin=(await call('/api/setup',credentials)).cookie;
  const profileId=(await call('/api/session',undefined,admin)).data.userId;
  await call('/api/users',{username:'netuser',password:'synthetic-network-user-only'},admin);
  const ordinary=(await call('/api/login',{username:'netuser',password:'synthetic-network-user-only'})).cookie;

  await t.test('only active personal admins reach the private agent',async()=>{
   assert.equal((await call('/api/network/adapters')).status,401);
   assert.equal((await call('/api/network/adapters',undefined,ordinary)).status,403);
   await call('/api/share-desktop-mode',{enabled:true},admin);
   assert.equal((await call('/api/network/adapters',undefined,admin)).status,401);
   await call('/api/share-desktop-mode',{enabled:false},admin);
   assert.equal(seen.length,0);
   const list=await call('/api/network/adapters',undefined,admin);
   assert.equal(list.status,200);assert.equal(list.data.adapters[0].name,'eth0');assert.equal(list.data.adapters[0].dnsServers,null);
   assert.equal(list.data.capabilities.setDisplayName,true);
   assert.deepEqual(seen.at(-1),{path:'/network/snapshot',data:{owner:profileId,admin:true}});
   const detail=await call('/api/network/adapters/'+encodeURIComponent(snapshot.adapters[0].id),undefined,admin);
   assert.equal(detail.status,200);assert.equal(detail.data.adapter.id,snapshot.adapters[0].id);
  });

  await t.test('typed diagnostics and aliases reject forged envelope fields and stale writes',async()=>{
   assert.equal((await call('/api/network/diagnostics',{kind:'ping',target:'192.0.2.1',profileId:'other'},admin)).status,409);
   assert.equal((await call('/api/network/diagnostics',{kind:'ping',target:'192.0.2.1',profileId,admin:true},admin)).status,400);
   const diagnostic=await call('/api/network/diagnostics',{kind:'ping',target:'192.0.2.1',profileId},admin);
   assert.equal(diagnostic.status,200);assert.equal(diagnostic.data.exitCode,1);assert.equal(diagnostic.data.internetConnectivity,'not-tested');
   assert.deepEqual(seen.at(-1),{path:'/network/diagnose',data:{kind:'ping',target:'192.0.2.1',owner:profileId,admin:true}});
   const label={adapterId:snapshot.adapters[0].id,displayName:'Synthetic host adapter',expectedRevision:0,profileId};
   assert.equal((await call('/api/network/adapter-label',label,admin)).status,200);
   assert.equal((await call('/api/network/adapter-label',{...label,displayName:'Stale'},admin)).status,409);
   const list=(await call('/api/network/adapters',undefined,admin)).data;
   assert.equal(list.aliasRevision,1);assert.equal(list.adapters[0].displayName,label.displayName);
   const stored=JSON.parse(await readFile(path.join(temp,'metadata/network-aliases.json'),'utf8'));
   assert.equal(stored.aliases[label.adapterId],label.displayName);
   assert.equal((await call('/api/network/prepare',{profileId},admin)).status,404);
  });

  await t.test('logout during a host await prevents late host information being returned',async()=>{
   const gate={started:deferred(),release:deferred()};hold=gate;
   const pending=call('/api/network/adapters',undefined,admin);await gate.started.promise;
   assert.equal((await call('/api/logout',{},admin)).status,200);gate.release.resolve();
   const result=await pending;assert.equal(result.status,409);assert.deepEqual(Object.keys(result.data),['error']);
   admin=(await call('/api/login',credentials)).cookie;
  });

  await t.test('Share entry during body upload cannot mutate the alias store',async()=>{
   const value=JSON.stringify({adapterId:snapshot.adapters[0].id,displayName:'Must not persist',expectedRevision:1,profileId});
   const started=deferred();const observe=req=>{if(req.url==='/api/network/adapter-label'){server.off('request',observe);started.resolve();}};server.on('request',observe);
   let outgoing;const response=new Promise((resolve,reject)=>{outgoing=http.request(base+'/api/network/adapter-label',{method:'POST',headers:{cookie:admin,'content-type':'application/json','content-length':Buffer.byteLength(value)}},res=>{let text='';res.on('data',chunk=>text+=chunk);res.on('end',()=>resolve({status:res.statusCode,data:JSON.parse(text)}));});outgoing.on('error',reject);});
   outgoing.write(value.slice(0,8));await started.promise;
   await call('/api/share-desktop-mode',{enabled:true},admin);outgoing.end(value.slice(8));
   const result=await response;assert.equal(result.status,409);assert.deepEqual(Object.keys(result.data),['error']);
   await call('/api/share-desktop-mode',{enabled:false},admin);
   const stored=JSON.parse(await readFile(path.join(temp,'metadata/network-aliases.json'),'utf8'));
   assert.equal(stored.revision,1);assert.equal(stored.aliases[snapshot.adapters[0].id],'Synthetic host adapter');
  });
 }finally{
  if(server?.listening){server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
  host.closeAllConnections();await new Promise(resolve=>host.close(resolve));
  for(const [key,value] of Object.entries(prior)){if(value===undefined)delete process.env[key];else process.env[key]=value;}
  assert.equal(path.dirname(temp),path.resolve(os.tmpdir()));assert.ok(path.basename(temp).startsWith('network-routing-'));
  await rm(temp,{recursive:true,force:true});
 }
});
