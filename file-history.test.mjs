import {test} from 'node:test';
import assert from 'node:assert/strict';
import {promises as fs} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createFileHistory} from './file-history.mjs';

test('persistent rename history preserves contents, rejects changed identities and separates profiles',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'rename-history-'));
 const user={id:'alice'},node={id:'note',owner:'alice',parent:'docs',name:'A.txt',kind:'file'},link={id:'link',owner:'alice',parent:'docs',name:'Private',kind:'link',authPassword:'never-in-history'};
 let db={nodes:[node,link]},serial=0,locked=false,failSave=false;
 const filename=n=>path.join(dir,n.name),factory=()=>createFileHistory({db,get:id=>db.nodes.find(n=>n.id===id),owned:(n,u)=>n?.owner===u.id,duplicate:(parent,name,except)=>db.nodes.some(n=>n.parent===parent&&n.id!==except&&n.name.toLowerCase()===name.toLowerCase()),clean:n=>typeof n==='string'&&n.length>0&&!/[\\/]/.test(n),filePath:filename,storage:{enabled:true},save:async()=>{if(failSave)throw Error('disk full');await fs.writeFile(path.join(dir,'db.json'),JSON.stringify(db));},id:()=>String(++serial),assertUnlocked:()=>{if(locked)throw Object.assign(Error('locked'),{status:409});}});
 let history=factory();
 try{
  await fs.writeFile(filename(node),'original bytes');
  await history.rename(user,node,'B.txt');assert.equal(await fs.readFile(filename(node),'utf8'),'original bytes');
  const first=history.state(user).undo;assert.equal(history.state({id:'bob'}).undo,null);assert.equal(history.state({...user,shareEditing:true}).undo,null);
  // Recreate the history service from the persisted database, as after restart.
  db=JSON.parse(await fs.readFile(path.join(dir,'db.json'),'utf8'));history=factory();
  assert.equal(history.state(user).undo.id,first.id);
  await assert.rejects(history.replay({id:'bob'},{direction:'undo',token:first.id}),{status:409});
  locked=true;await assert.rejects(history.replay(user,{direction:'undo',token:first.id}),{status:409});locked=false;
  await fs.writeFile(path.join(dir,'A.txt'),'collision');await assert.rejects(history.replay(user,{direction:'undo',token:first.id}),{status:409});assert.equal(history.state(user).undo.id,first.id);assert.equal(await fs.readFile(path.join(dir,'A.txt'),'utf8'),'collision');await fs.unlink(path.join(dir,'A.txt'));
  await history.replay(user,{direction:'undo',token:first.id});assert.equal(db.nodes[0].name,'A.txt');assert.equal(history.state(user).redo.id,first.id);
  await assert.rejects(history.replay(user,{direction:'undo',token:first.id}),{status:409});
  await history.replay(user,{direction:'redo',token:first.id});assert.equal(db.nodes[0].name,'B.txt');
  await history.replay(user,{direction:'undo',token:first.id});await history.rename(user,db.nodes[0],'C.txt');assert.equal(history.state(user).redo,null);
  const current=history.state(user).undo;await fs.rename(path.join(dir,'C.txt'),path.join(dir,'saved-original.txt'));await fs.writeFile(path.join(dir,'C.txt'),'external replacement');await assert.rejects(history.replay(user,{direction:'undo',token:current.id}),{status:409});assert.equal(await fs.readFile(path.join(dir,'saved-original.txt'),'utf8'),'original bytes');
  await history.rename(user,db.nodes[1],'Other link');assert.ok(!JSON.stringify(db.fileHistory).includes('never-in-history'));
  failSave=true;await assert.rejects(history.rename(user,db.nodes[1],'Failed'),/disk full/);assert.equal(db.nodes[1].name,'Other link');assert.equal(history.state(user).undo.label,'Umbenennen von „Private“ in „Other link“');
 }finally{await fs.rm(dir,{recursive:true,force:true});}
});

test('history API authenticates, persists rename undo/redo and rechecks current ACL permissions',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'history-api-'));process.env.DATA_DIR=path.join(dir,'metadata');process.env.EXPLORER_ROOT=path.join(dir,'Explorer');process.env.NODE_ENV='test';
 const {server}=await import('./backend.mjs');await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port;let cookie='';
 const request=(route,data,session=cookie)=>fetch(base+route,{method:data===undefined?'GET':'POST',headers:{cookie:session,'Content-Type':'application/json'},body:data===undefined?undefined:JSON.stringify(data)}),json=async(route,data,session)=>{const r=await request(route,data,session);assert.ok(r.ok,await r.clone().text());return r.json();};
 try{
  cookie=(await request('/api/setup',{username:'admin',password:'history-admin-password'})).headers.get('set-cookie').split(';')[0];const admin=cookie;
  const aliceId=(await json('/api/users',{username:'alice',password:'history-alice-password'})).id;
  cookie=(await request('/api/login',{username:'alice',password:'history-alice-password'})).headers.get('set-cookie').split(';')[0];const alice=cookie;
  const nodes=(await json('/api/nodes')).nodes,documents=nodes.find(n=>n.system&&n.space==='documents');const note=(await json('/api/new-text',{parent:documents.id,name:'First.txt'})).id;
  await json('/api/rename',{id:note,name:'Second.txt'});const entry=(await json('/api/session')).fileHistory.undo;assert.ok(entry.id);
  assert.equal((await request('/api/file-history',{direction:'undo',token:entry.id},'')).status,401);
  assert.equal((await request('/api/file-history',{direction:'undo',token:entry.id},admin)).status,409);
  await json('/api/file-history',{direction:'undo',token:entry.id});assert.equal((await json('/api/nodes')).nodes.find(n=>n.id===note).name,'First.txt');
  await json('/api/file-history',{direction:'redo',token:entry.id});assert.equal((await json('/api/nodes')).nodes.find(n=>n.id===note).name,'Second.txt');
  // A second client cannot accidentally replay the same top command twice.
  const results=await Promise.all([request('/api/file-history',{direction:'undo',token:entry.id}),request('/api/file-history',{direction:'undo',token:entry.id})]);assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);
  cookie=admin;const adminDocs=(await json('/api/nodes')).nodes.find(n=>n.system&&n.space==='documents'),folder=(await json('/api/folder',{parent:adminDocs.id,name:'Shared'})).id;
  const sharedNote=(await json('/api/new-text',{parent:folder,name:'Shared.txt'})).id;await json('/api/folder-permissions',{nodeId:folder,users:[aliceId],mode:'write'});
  await json('/api/rename',{id:note,name:'Third.txt'},alice);await json('/api/rename',{id:sharedNote,name:'Renamed.txt'},alice);const sharedEntry=(await json('/api/session',undefined,alice)).fileHistory.undo;
  await json('/api/folder-permissions',{nodeId:folder,users:[],groups:[],mode:'write'});
  assert.equal((await request('/api/file-history',{direction:'undo',token:sharedEntry.id},alice)).status,404);
  assert.equal((await json('/api/nodes')).nodes.find(n=>n.id===sharedNote).name,'Renamed.txt');
  await json('/api/delete',{id:folder});assert.ok((await json('/api/session',undefined,alice)).fileHistory.undo.label.includes('Third.txt'));
  await json('/api/delete',{id:note},alice);assert.ok((await json('/api/session',undefined,alice)).fileHistory.undo.label.startsWith('Löschen'));assert.equal((await json('/api/session',undefined,alice)).fileHistory.redo,null);
 }finally{await new Promise(resolve=>server.close(resolve));await fs.rm(dir,{recursive:true,force:true});}
});
