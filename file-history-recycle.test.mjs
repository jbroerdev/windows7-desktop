import {test} from 'node:test';
import assert from 'node:assert/strict';
import {promises as fs} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createFileOperations} from './file-operations.mjs';

test('recycle history replays rename/delete/restore chains, protects conflicts and changed files, and forgets purged entries',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'recycle-history-'));process.env.DATA_DIR=path.join(dir,'metadata');process.env.EXPLORER_ROOT=path.join(dir,'Explorer');process.env.NODE_ENV='test';
 const {server}=await import('./backend.mjs');await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;let cookie='';
 const request=(route,data)=>fetch(base+route,{method:data===undefined?'GET':'POST',headers:{cookie,'Content-Type':'application/json'},body:data===undefined?undefined:JSON.stringify(data)}),json=async(route,data)=>{const r=await request(route,data);assert.ok(r.ok,await r.clone().text());return r.json();},nodes=async()=>(await json('/api/nodes')).nodes;
 const step=async direction=>{const entry=(await json('/api/session')).fileHistory[direction];assert.ok(entry,direction+' command exists');return json('/api/file-history',{direction,token:entry.id});};
 try{
  cookie=(await request('/api/setup',{username:'admin',password:'recycle-test-password'})).headers.get('set-cookie').split(';')[0];
  const documents=(await nodes()).find(n=>n.system&&n.space==='documents'),folder=(await json('/api/folder',{parent:documents.id,name:'Original'})).id;
  const child=(await json('/api/new-text',{parent:folder,name:'Note.txt'})).id;
  await json('/api/text',{id:child,version:(await json('/api/text?id='+child)).version,content:'original bytes'});
  await json('/api/rename',{id:folder,name:'Renamed'});await json('/api/delete',{id:folder});
  const persisted=JSON.parse(await fs.readFile(path.join(process.env.DATA_DIR,'database.json'),'utf8'));assert.ok(Object.values(persisted.fileHistory).some(h=>h.undo.at(-1)?.type==='delete'));
  await step('undo');assert.equal((await nodes()).find(n=>n.id===folder).name,'Renamed');assert.equal((await json('/api/text?id='+child)).content,'original bytes');
  await step('undo');assert.equal((await nodes()).find(n=>n.id===folder).name,'Original');
  await step('redo');await step('redo');assert.ok(!(await nodes()).some(n=>n.id===folder));await step('undo');
  const deletion=await json('/api/delete',{id:folder});await json('/api/trash-restore',{id:deletion.recordId});
  await step('undo');assert.ok(!(await nodes()).some(n=>n.id===folder));await step('undo');assert.ok((await nodes()).some(n=>n.id===folder));
  await step('redo');assert.ok(!(await nodes()).some(n=>n.id===folder));await step('redo');assert.ok((await nodes()).some(n=>n.id===folder));
  // Undoing a restore must not delete a file that was edited afterwards.
  const note=(await nodes()).find(n=>n.id===child);await fs.writeFile(path.join(process.env.EXPLORER_ROOT,decodeURIComponent(note.path).replace(/^\/C\//,'')),'changed after restore');
  const undo=(await json('/api/session')).fileHistory.undo;assert.equal((await request('/api/file-history',{direction:'undo',token:undo.id})).status,409);assert.ok((await nodes()).some(n=>n.id===child));
  await json('/api/delete',{id:folder});await json('/api/folder',{parent:documents.id,name:'Renamed'});
  const conflict=(await json('/api/session')).fileHistory.undo;assert.equal((await request('/api/file-history',{direction:'undo',token:conflict.id})).status,409);
  const recycle=(await json('/api/trash')).entries.find(r=>r.name==='Renamed');assert.ok(recycle);await json('/api/trash-purge',{id:recycle.id});
  assert.ok(!(await json('/api/trash')).entries.some(r=>r.id===recycle.id));assert.equal((await json('/api/session')).fileHistory.undo,null);
 }finally{await new Promise(r=>server.close(r));await fs.rm(dir,{recursive:true,force:true});}
});

test('failed recycle commit restores the physical file and matching metadata in either direction',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'recycle-rollback-')),user={id:'user'},parent={id:'docs',kind:'folder',name:'Docs',owner:'user'},node={id:'note',parent:'docs',kind:'file',name:'Note.txt',owner:'user'},db={nodes:[parent,node],trash:[]};
 const filePath=n=>path.join(dir,n.name),storage={volume:()=>null,trashPath:r=>path.join(dir,'trash-'+r.id),register(){},release(){}};let serial=0,failSaving=false;
 const operations=createFileOperations({db,storage,id:()=>String(++serial),get:id=>db.nodes.find(n=>n.id===id),owned:()=>true,readable:()=>true,target:()=>parent,duplicate:()=>false,spaceOf:()=> 'documents',filePath,rootFor:()=>parent,save:async()=>{if(failSaving)throw Error('metadata unavailable');},fail:message=>{throw Error(message);}});
 
 try{
  await fs.writeFile(filePath(node),'bytes must survive');
  failSaving=true;await assert.rejects(operations.trash(user,node),/metadata unavailable/);failSaving=false;assert.equal(await fs.readFile(filePath(node),'utf8'),'bytes must survive');assert.ok(db.nodes.some(n=>n.id===node.id));assert.equal(db.trash.length,0);
  const result=await operations.trash(user,node);assert.equal(db.trash.length,1);
  failSaving=true;await assert.rejects(operations.restore(user,result.recordId),/metadata unavailable/);failSaving=false;assert.ok(!db.nodes.some(n=>n.id===node.id));assert.equal(db.trash.length,1);assert.equal(await fs.readFile(storage.trashPath(db.trash[0]),'utf8'),'bytes must survive');
  await operations.restore(user,result.recordId);assert.equal(await fs.readFile(filePath(node),'utf8'),'bytes must survive');assert.equal(db.trash.length,0);
 }finally{await fs.rm(dir,{recursive:true,force:true});}
});
