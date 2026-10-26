import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,stat} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
test('Computerverwaltung: Konten, eigene Gruppen, Zugriff, Sperren und Administratorschutz',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'win7-management-'));process.env.DATA_DIR=dir;process.env.EXPLORER_ROOT=path.join(dir,'Explorer');process.env.NODE_ENV='test';const {server}=await import('./backend.mjs');await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;let admin;
 const request=(route,data,cookie=admin)=>fetch(origin+route,{method:data===undefined?'GET':'POST',headers:{...(cookie?{cookie}:{}),'Content-Type':'application/json'},...(data!==undefined?{body:JSON.stringify(data)}:{})});
 const manage=data=>request('/api/computer-management',data);
 try{
  const setup=await request('/api/setup',{username:'administrator',password:'management-test-password'},'');admin=setup.headers.get('set-cookie').split(';')[0];
  assert.equal((await request('/api/computer-management',undefined,'')).status,401);
  let result=await manage({action:'user-create',username:'alice',password:'alice-test-password',fullName:'Alice Beispiel',description:'Testkonto'});assert.equal(result.status,200);let view=await result.json();const alice=view.users.find(u=>u.username==='alice'),self=view.users.find(u=>u.username==='administrator');assert.equal(alice.fullName,'Alice Beispiel');assert.equal(alice.password,undefined);
  assert.ok((await stat(path.join(process.env.EXPLORER_ROOT,'Users/alice/Documents'))).isDirectory());
  let login=await request('/api/login',{username:'alice',password:'alice-test-password'},'');let cookie=login.headers.get('set-cookie').split(';')[0];assert.equal((await request('/api/computer-management',undefined,cookie)).status,403);
  result=await manage({action:'group-save',name:'Familie',description:'Gemeinsam',members:[alice.id]});view=await result.json();const group=view.groups.find(g=>g.name==='Familie');assert.deepEqual(group.members,[alice.id]);
  assert.equal((await manage({action:'user-create',username:'invalid-new-user',password:'valid-test-password',groups:['missing']})).status,400);assert.ok(!(await(await manage()).json()).users.some(u=>u.username==='invalid-new-user'));
  let created=await(await manage({action:'user-create',username:'bob',password:'bob-test-password',groups:[group.id]})).json();assert.ok(created.users.find(u=>u.username==='bob').groups.includes(group.id));
  assert.equal((await manage({action:'user-update',id:alice.id,groups:[]})).status,200);assert.ok(!(await(await manage()).json()).groups.find(g=>g.id===group.id).members.includes(alice.id));assert.equal((await manage({action:'user-update',id:alice.id,groups:[group.id]})).status,200);assert.equal((await manage({action:'user-update',id:alice.id,groups:['missing']})).status,400);
  assert.equal((await manage({action:'group-save',name:'familie',members:[]})).status,409);
  const nodes=await(await request('/api/nodes')).json(),parent=nodes.nodes.find(n=>n.space==='documents'&&n.system&&n.ownerId===self.id);const folder=await(await request('/api/folder',{name:'Gruppenordner',parent:parent.id})).json();
  assert.equal((await request('/api/folder-permissions',{nodeId:folder.id,users:[],groups:[group.id],mode:'write'})).status,200);
  assert.ok((await(await request('/api/nodes',undefined,cookie)).json()).nodes.some(n=>n.id===folder.id&&n.writable));
  assert.equal((await request('/api/folder',{name:'Alice darf schreiben',parent:folder.id},cookie)).status,201);
  assert.equal((await manage({action:'group-save',id:group.id,name:'Familie neu',description:'Bearbeitet',members:[]})).status,200);
  assert.ok(!(await(await request('/api/nodes',undefined,cookie)).json()).nodes.some(n=>n.id===folder.id));
  assert.equal((await manage({action:'user-update',id:alice.id,disabled:true})).status,200);assert.equal((await request('/api/session',undefined,cookie)).status,200);assert.equal((await(await request('/api/session',undefined,cookie)).json()).authenticated,false);assert.equal((await request('/api/login',{username:'alice',password:'alice-test-password'},'')).status,401);
  assert.equal((await manage({action:'user-update',id:alice.id,disabled:false,fullName:'Alice Neu'})).status,200);
  assert.equal((await manage({action:'user-update',id:self.id,disabled:true})).status,400);assert.equal((await manage({action:'user-update',id:self.id,role:'user'})).status,400);assert.equal((await manage({action:'group-save',id:'admin',members:[]})).status,400);assert.equal((await manage({action:'group-delete',id:'admin'})).status,400);
  assert.equal((await manage({action:'group-delete',id:group.id})).status,200);assert.ok(!(await(await request('/api/folder-permissions')).json()).rules.some(r=>r.groups.includes(group.id)));
  assert.equal((await manage({action:'user-delete',id:alice.id})).status,200);assert.ok((await stat(path.join(process.env.EXPLORER_ROOT,'Users/alice/Documents'))).isDirectory());
 }finally{await new Promise(r=>server.close(r));await rm(dir,{recursive:true,force:true});}
});
