import test from 'node:test';
import fs from'node:fs/promises';import path from'node:path';import os from'node:os';import http from'node:http';import assert from'node:assert/strict';

test('actual desktop appearance saves reject stale sessions and bind visible profile, actor and scope', {timeout:15000}, async()=>{
const mode='after';
const temp=await fs.mkdtemp(path.join(os.tmpdir(),'appearance-body-'));process.env.NODE_ENV='test';process.env.DATA_DIR=path.join(temp,'metadata');process.env.EXPLORER_ROOT=path.join(temp,'Explorer');
let server;const report={scope:'Actual backend, disposable synthetic accounts/storage, delayed HTTP request bodies; no production access.',mode,results:[]};
try{
 ({server}=await import('./backend.mjs'));await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 const call=(route,data,cookie='')=>fetch(base+route,{method:data===undefined?'GET':'POST',headers:{cookie,'content-type':'application/json'},body:data===undefined?undefined:JSON.stringify(data)});
 const cookieOf=response=>response.headers.get('set-cookie').split(';')[0];
 const setup=await call('/api/setup',{username:'admin',password:'appearance-test-admin-password'});let admin=cookieOf(setup);
 await call('/api/users',{username:'alice',password:'appearance-test-alice-password'},admin);
 const alice=cookieOf(await call('/api/login',{username:'alice',password:'appearance-test-alice-password'}));
 const session=async cookie=>(await call('/api/session',undefined,cookie)).json();
 const actor=await session(admin),aliceBefore=await session(alice);
 async function streaming(cookie,payload,tag){
  let resolveArrival;const arrived=new Promise(r=>resolveArrival=r);const listener=req=>{if(req.headers['x-fixture-stream']===tag){server.off('request',listener);resolveArrival()}};server.on('request',listener);
  const bytes=Buffer.from(JSON.stringify(payload));let request;
  const response=new Promise((resolve,reject)=>{request=http.request(base+'/api/desktop',{method:'POST',headers:{cookie,'content-type':'application/json','content-length':bytes.length,'x-fixture-stream':tag}},res=>{const chunks=[];res.on('data',b=>chunks.push(b));res.on('end',()=>resolve({status:res.statusCode,data:JSON.parse(Buffer.concat(chunks).toString())}))});request.on('error',reject);request.write(bytes.subarray(0,6));});
  await arrived;return{finish(){request.end(bytes.subarray(6));return response}};
 }
 const color={color:'#112233',intensity:67,transparency:false};
 const first=await streaming(admin,{appearance:color,appearanceContext:{profileId:actor.userId,actorId:actor.actorId||actor.userId,shareEditing:false}},'logout');
 await call('/api/logout',{},admin);const logoutResult=await first.finish();
 admin=cookieOf(await call('/api/login',{username:'admin',password:'appearance-test-admin-password'}));
 const afterLogout=await session(admin);report.results.push({case:'body finishes after session logout',status:logoutResult.status,appearance:afterLogout.desktop.appearance||null});
 await call('/api/share-desktop-mode',{enabled:true},admin);const shared=await session(admin),shareColor={color:'#334455',intensity:44,transparency:true};
 const second=await streaming(admin,{scope:'share',appearance:shareColor,appearanceContext:{profileId:shared.userId,actorId:shared.actorId||actor.userId,shareEditing:true}},'share-exit');
 await call('/api/share-desktop-mode',{enabled:false},admin);const shareResult=await second.finish();const publicAfter=await session('');
 report.results.push({case:'body finishes after exiting share-edit context',status:shareResult.status,appearance:publicAfter.publicDesktop.appearance||null});
 const wrong=await call('/api/desktop',{appearance:{...color,color:'#aabbcc'},appearanceContext:{profileId:actor.userId,actorId:actor.actorId||actor.userId,shareEditing:false}},alice);const aliceAfter=await session(alice);
 report.results.push({case:'Alice request with stale Admin appearance context',status:wrong.status,before:aliceBefore.desktop.appearance||null,after:aliceAfter.desktop.appearance||null});
 if(mode==='before'){assert.equal(logoutResult.status,200);assert.equal(shareResult.status,200);assert.equal(wrong.status,200);assert.deepEqual(afterLogout.desktop.appearance,color);assert.deepEqual(publicAfter.publicDesktop.appearance,shareColor);}
 else{
  assert.equal(logoutResult.status,401);assert.ok([401,409].includes(shareResult.status));assert.equal(wrong.status,409);assert.equal(afterLogout.desktop.appearance,undefined);assert.equal(publicAfter.publicDesktop.appearance,undefined);assert.equal(aliceAfter.desktop.appearance,undefined);
  assert.equal(afterLogout.actorId,actor.userId);assert.equal(aliceAfter.actorId,aliceAfter.userId);
  const personal={color:'#123456',intensity:23,transparency:false};
  const personalSave=await call('/api/desktop',{appearance:personal,appearanceContext:{profileId:aliceAfter.userId,actorId:aliceAfter.actorId,shareEditing:false}},alice);
  assert.equal(personalSave.status,200);assert.deepEqual((await session(alice)).desktop.appearance,personal);report.results.push({case:'positive personal save with actual actorId',status:personalSave.status});
  await call('/api/share-desktop-mode',{enabled:true},admin);const shareSession=await session(admin);assert.equal(shareSession.actorId,actor.userId);assert.notEqual(shareSession.userId,shareSession.actorId);
  const goodShare=await call('/api/desktop',{scope:'share',appearance:shareColor,appearanceContext:{profileId:shareSession.userId,actorId:shareSession.actorId,shareEditing:true}},admin);
  assert.equal(goodShare.status,200);assert.deepEqual((await session('')).publicDesktop.appearance,shareColor);assert.deepEqual((await session(alice)).desktop.appearance,personal);report.results.push({case:'positive share save with distinct visible profile/actual admin actor',status:goodShare.status});
  await call('/api/share-desktop-mode',{enabled:false},admin);
  const invalid=await call('/api/desktop',{appearance:color,appearanceContext:{profileId:actor.userId,actorId:actor.userId,shareEditing:false,extra:true}},admin);assert.equal(invalid.status,400);
  const alone=await call('/api/desktop',{appearanceContext:{profileId:actor.userId,actorId:actor.userId,shareEditing:false}},admin);assert.equal(alone.status,400);
  report.results.push({case:'unknown Context key and Context without appearance rejected',statuses:[invalid.status,alone.status]});
 }
 report.passed=true;
}catch(error){report.error=error.stack;throw error}finally{if(server)await new Promise(r=>server.close(r));const resolved=path.resolve(temp);if(path.dirname(resolved)!==path.resolve(os.tmpdir())||!path.basename(resolved).startsWith('appearance-body-'))throw Error('Unexpected temporary target');await fs.rm(resolved,{recursive:true,force:true});}


});
