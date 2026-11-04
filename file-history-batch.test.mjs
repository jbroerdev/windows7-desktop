import {test} from 'node:test';
import assert from 'node:assert/strict';
import {promises as fs} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createFileHistory} from './file-history.mjs';
import {createFileOperations} from './file-operations.mjs';

test('batch recycle is one persistent action, handles partial conflicts and orders restored parents before children',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'batch-history-'));process.env.DATA_DIR=path.join(dir,'metadata');process.env.EXPLORER_ROOT=path.join(dir,'Explorer');process.env.NODE_ENV='test';
 const {server}=await import('./backend.mjs');await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;let cookie='';
 const request=(route,data)=>fetch(base+route,{method:data===undefined?'GET':'POST',headers:{cookie,'Content-Type':'application/json'},body:data===undefined?undefined:JSON.stringify(data)}),json=async(route,data)=>{const r=await request(route,data);assert.ok(r.ok,await r.clone().text());return r.json();},nodes=async()=>(await json('/api/nodes')).nodes,history=async()=>(await json('/api/session')).fileHistory;
 const step=async direction=>json('/api/file-history',{direction,token:(await history())[direction].id});
 try{
  cookie=(await request('/api/setup',{username:'admin',password:'batch-history-password'})).headers.get('set-cookie').split(';')[0];
  const docs=(await nodes()).find(n=>n.system&&n.space==='documents'),a=(await json('/api/new-text',{parent:docs.id,name:'A.txt'})).id,b=(await json('/api/new-text',{parent:docs.id,name:'B.txt'})).id,folder=(await json('/api/folder',{parent:docs.id,name:'Folder'})).id,child=(await json('/api/new-text',{parent:folder,name:'Child.txt'})).id;
  await json('/api/text',{id:child,version:(await json('/api/text?id='+child)).version,content:'child bytes'});
  assert.equal((await json('/api/recycle-batch',{action:'delete',ids:[a,b,folder,child]})).completed,3);assert.equal((await history()).undo.count,3);
  const persisted=JSON.parse(await fs.readFile(path.join(process.env.DATA_DIR,'database.json'),'utf8')),commands=Object.values(persisted.fileHistory)[0].undo.slice(-3);assert.equal(new Set(commands.map(c=>c.batch)).size,1);
  await step('undo');assert.equal((await nodes()).filter(n=>[a,b,folder,child].includes(n.id)).length,4);assert.equal((await json('/api/text?id='+child)).content,'child bytes');assert.equal((await history()).redo.count,3);
  await step('redo');assert.ok(!(await nodes()).some(n=>[a,b,folder,child].includes(n.id)));
  const records=(await json('/api/trash')).entries.filter(r=>['A.txt','B.txt','Folder'].includes(r.name));await json('/api/recycle-batch',{action:'restore',ids:records.map(r=>r.id)});assert.equal((await history()).undo.count,3);await step('undo');await step('redo');
  // One conflict after the first completed undo keeps both halves recoverable.
  await json('/api/recycle-batch',{action:'delete',ids:[a,b]});const collision=(await json('/api/new-text',{parent:docs.id,name:'A.txt'})).id;
  const response=await request('/api/file-history',{direction:'undo',token:(await history()).undo.id});assert.equal(response.status,409);assert.match((await response.json()).error,/1 von 2/);assert.ok((await nodes()).some(n=>n.id===b));assert.ok((await nodes()).some(n=>n.id===collision));assert.ok(!(await nodes()).some(n=>n.id===a));assert.equal((await history()).undo.count,1);assert.equal((await history()).redo.count,1);await step('redo');assert.equal((await history()).undo.count,2);assert.ok(!(await nodes()).some(n=>n.id===b));assert.ok((await nodes()).some(n=>n.id===collision));
  // Separately deleted parent/child records must return to their original hierarchy.
  const parent=(await json('/api/folder',{parent:docs.id,name:'Parent'})).id,nested=(await json('/api/new-text',{parent,name:'Nested.txt'})).id;
  const childRecord=(await json('/api/delete',{id:nested})).recordId,parentRecord=(await json('/api/delete',{id:parent})).recordId;
  await json('/api/recycle-batch',{action:'restore',ids:[childRecord,parentRecord]});assert.equal((await nodes()).find(n=>n.id===nested).parent,parent);await step('undo');assert.ok(!(await nodes()).some(n=>n.id===parent||n.id===nested));await step('redo');assert.equal((await nodes()).find(n=>n.id===nested).parent,parent);
  // The retention limit counts user actions, not the number of selected files.
  const links=[];for(let i=0;i<60;i++){await json('/api/link',{parent:docs.id,name:'Link '+i,url:'https://example.com/'+i});links.push((await nodes()).find(n=>n.name==='Link '+i).id);}
  await json('/api/recycle-batch',{action:'delete',ids:links});assert.equal((await history()).undo.count,60);await step('undo');assert.equal((await nodes()).filter(n=>links.includes(n.id)).length,60);
  assert.equal((await request('/api/recycle-batch',{action:'delete',ids:Array(101).fill(a)})).status,400);
 }finally{await new Promise(r=>server.close(r));await fs.rm(dir,{recursive:true,force:true});}
});

test('revoked authorization stops remaining batch entries and preserves completed undo',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'batch-revoke-')),user={id:'user'},parent={id:'docs',kind:'folder',name:'Docs',owner:'user'},a={id:'a',kind:'file',name:'A.txt',parent:'docs',owner:'user'},b={id:'b',kind:'file',name:'B.txt',parent:'docs',owner:'user'},db={nodes:[parent,a,b],trash:[]};
 let permitted=true,serial=0,history;const get=id=>db.nodes.find(n=>n.id===id),owned=(n,u)=>n?.owner===u.id,filePath=n=>path.join(dir,n.name),id=()=>String(++serial),storage={enabled:true,volume:()=>null,trashPath:r=>path.join(dir,'trash-'+r.id),register(){},release(){}},save=async()=>{await fs.writeFile(path.join(dir,'db.json'),JSON.stringify(db));if(db.trash.length===1)permitted=false;};
 const operations=createFileOperations({db,storage,id,get,owned,readable:owned,target:()=>parent,duplicate:()=>false,spaceOf:()=> 'documents',filePath,rootFor:()=>parent,save,fail:message=>{throw Error(message);},onTrash:(ids,options)=>history.discardNodes(ids,options?.preserve)});
 history=createFileHistory({db,get,owned,duplicate:()=>false,clean:()=>true,filePath,storage,save,id,operations,assertUnlocked:()=>{if(!permitted)throw Object.assign(Error('session ended'),{status:401});}});
 try{
  await fs.writeFile(filePath(a),'A bytes');await fs.writeFile(filePath(b),'B bytes');
  await assert.rejects(history.batch(user,{action:'delete',ids:['a','b']}),e=>e.status===401&&/1 von 2/.test(e.message));
  assert.ok(!get('a'));assert.ok(get('b'));assert.equal(await fs.readFile(filePath(b),'utf8'),'B bytes');assert.equal(history.state(user).undo.count,1);
  permitted=true;await history.replay(user,{direction:'undo',token:history.state(user).undo.id});assert.equal(await fs.readFile(filePath(a),'utf8'),'A bytes');
 }finally{await fs.rm(dir,{recursive:true,force:true});}
});
