import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

test('host transfer resolves profile IDs with existing ACLs and rejects roles before the private agent',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'host-transfer-acl-'));process.env.DATA_DIR=path.join(dir,'metadata');process.env.EXPLORER_ROOT=path.join(dir,'Explorer');process.env.NODE_ENV='test';delete process.env.HOST_AGENT_SOCKET;
 const {server}=await import('./backend.mjs');await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port;
 const request=(route,data,cookie='')=>fetch(base+route,{method:data===undefined?'GET':'POST',headers:{cookie,'Content-Type':'application/json'},body:data===undefined?undefined:JSON.stringify(data)});
 try{
  const setup=await request('/api/setup',{username:'admin',password:'transfer-admin-password'}),admin=setup.headers.get('set-cookie').split(';')[0];
  await request('/api/users',{username:'alice',password:'transfer-alice-password'},admin);const login=await request('/api/login',{username:'alice',password:'transfer-alice-password'}),alice=login.headers.get('set-cookie').split(';')[0];
  const list=(await(await request('/api/nodes',undefined,alice)).json()).nodes,folder=list.find(n=>n.system&&n.space==='documents');
  const created=await request('/api/new-text',{parent:folder.id,name:'Private.txt'},alice),file=(await created.json()).id;
  const data={id:'host:/tmp/source.txt',parent:folder.id,name:'Private.txt',mode:'copy',confirmed:true};
  assert.equal((await request('/api/host-transfer',data,alice)).status,403);
  assert.equal((await request('/api/host-transfer',data,admin)).status,404);
  assert.equal((await request('/api/host-transfer',{id:file,parent:'host:/tmp',name:'Private.txt',mode:'move'},admin)).status,403);
  assert.equal((await request('/api/host-transfer',{...data,parent:'/arbitrary/physical/path'},admin)).status,404);
  await request('/api/share-desktop-mode',{enabled:true},admin);assert.equal((await request('/api/host-transfer',data,admin)).status,403);
  assert.equal((await request('/api/host-transfer',data)).status,401);
 }finally{await new Promise(resolve=>server.close(resolve));await rm(dir,{recursive:true,force:true});}
});
