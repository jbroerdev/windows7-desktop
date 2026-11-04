import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {transferHostTree} from './host-tree-transfer.mjs';
import {transferHostEntry} from './public/host-upload.js';

function fixture(){
 const nodes=new Map(),uploads=new Map(),calls=[],progress=[];let serial=0;
 const touch=target=>{const parent=nodes.get(path.posix.dirname(target));if(parent)parent.version='v'+(++serial);};
 function add(target,kind='folder',content=''){nodes.set(target,{path:target,resolved:target,name:path.posix.basename(target),kind,version:'v'+(++serial),size:kind==='file'?Buffer.byteLength(content):0,bytes:Buffer.from(content)});touch(target);}
 const meta=target=>{const node=nodes.get(target);if(!node)throw Object.assign(Error('not found'),{status:404});const {bytes,...result}=node;return {...result};};
 const children=target=>[...nodes.keys()].filter(p=>p!==target&&path.posix.dirname(p)===target);
 const remove=target=>{assert.equal(children(target).length,0);nodes.delete(target);touch(target);};
 for(const target of ['/','/source','/target','/source/Set','/source/Set/Nested','/source/Set/Empty'])add(target);
 add('/source/Set/a.txt','file','alpha');add('/source/Set/Nested/b.txt','file','beta');
 const call=async(user,action,data)=>{
  calls.push({action,data});
  if(action==='stat')return{node:meta(data.path)};
  if(action==='list')return{node:meta(data.path),entries:children(data.path).map(meta)};
  if(action==='trash'){if(data.confirmed){assert.equal(meta(data.path).version,data.version);remove(data.path);return{ok:true};}return{requiresConfirmation:true};}
  if(action==='mkdir'){const target=path.posix.join(data.path,data.name);assert.equal(nodes.has(target),false);add(target);return{node:meta(target)};}
  if(action==='upload-start'){const target=path.posix.join(data.path,data.name);if(!data.confirmed)return{existing:nodes.has(target)?meta(target):null};if(nodes.has(target)){assert.equal(data.overwrite,true);assert.equal(data.version,meta(target).version);}const ident='u'+(++serial);uploads.set(ident,{target,bytes:Buffer.alloc(0),size:data.size});return{uploadId:ident};}
  if(action==='chunk'){const node=nodes.get(data.path);assert.equal(node.version,data.version);const bytes=node.bytes.subarray(data.offset,data.offset+262144);return{data:bytes.toString('base64'),offset:data.offset+bytes.length,size:node.size};}
  if(action==='upload-chunk'){const item=uploads.get(data.uploadId);assert.equal(data.offset,item.bytes.length);item.bytes=Buffer.concat([item.bytes,Buffer.from(data.data,'base64')]);return{offset:item.bytes.length};}
  if(action==='upload-commit'){const item=uploads.get(data.uploadId);assert.equal(item.bytes.length,item.size);assert.equal(data.digest,createHash('sha256').update(item.bytes).digest('hex'));add(item.target,'file',item.bytes);uploads.delete(data.uploadId);return{node:meta(item.target)};}
  if(action==='upload-abort'){uploads.delete(data.uploadId);return{ok:true};}
  throw Error(action);
 };
 const options={user:{id:'admin',role:'admin'},source:{path:'/source/Set'},destination:{path:'/target'},name:'Set',call,onProgress:event=>progress.push(event)};
 return{nodes,uploads,calls,progress,options,add,meta,remove};
}
test('recursive preview does not mutate and copying includes empty and nested folders',async()=>{
 const f=fixture(),before=f.nodes.size,preview=await transferHostTree(f.options);assert.equal(f.nodes.size,before);assert.equal(preview.totalItems,5);assert.equal(preview.size,9);assert.deepEqual(preview.conflicts,[]);
 const result=await transferHostTree({...f.options,confirmed:true,sourceVersion:preview.sourceVersion});assert.equal(result.completedItems,5);assert.equal(f.nodes.get('/target/Set/Nested/b.txt').bytes.toString(),'beta');assert.ok(f.nodes.has('/target/Set/Empty'));assert.ok(f.nodes.has('/source/Set/a.txt'));assert.equal(f.progress.at(-1).loadedBytes,9);
});
test('merge keeps unrelated files and nested conflicts support both, replace and skip',async()=>{
 for(const action of ['both','replace','skip']){
  const f=fixture();f.add('/target/Set');f.add('/target/Set/a.txt','file','old');f.add('/target/Set/unrelated.txt','file','keep');const preview=await transferHostTree(f.options);assert.equal(preview.merge,true);assert.equal(preview.conflicts.length,1);
  const choices={'a.txt':{action,version:preview.conflicts[0].existing.version}},review=await transferHostTree({...f.options,choices});assert.deepEqual(review.conflicts,[]);
  await transferHostTree({...f.options,choices,confirmed:true,sourceVersion:review.sourceVersion});assert.equal(f.progress.at(-1).loadedBytes,action==='skip'?4:9);assert.equal(f.progress.at(-1).totalBytes,action==='skip'?4:9);assert.equal(f.nodes.get('/target/Set/unrelated.txt').bytes.toString(),'keep');assert.equal(f.nodes.get('/target/Set/a.txt').bytes.toString(),action==='replace'?'alpha':'old');if(action==='both')assert.equal(f.nodes.get('/target/Set/a (2).txt').bytes.toString(),'alpha');
 }
});
test('moving removes only committed files and then empty folders; skipped sources stay',async()=>{
 const f=fixture();f.add('/target/Set');f.add('/target/Set/a.txt','file','old');const preview=await transferHostTree({...f.options,moving:true});const choices={'a.txt':{action:'skip',version:preview.conflicts[0].existing.version}};
 const options={...f.options,moving:true,choices,confirmed:true,sourceVersion:preview.sourceVersion,finishFile:async info=>f.remove(info.sourcePath),finishDirectory:async info=>f.remove(info.sourcePath)};
 await transferHostTree(options);assert.ok(f.nodes.has('/source/Set/a.txt'));assert.ok(f.nodes.has('/source/Set'));assert.equal(f.nodes.has('/source/Set/Nested'),false);assert.equal(f.nodes.has('/source/Set/Empty'),false);
});
test('changed trees, nested targets, symlinks and denied descendants fail before writing',async()=>{
 const f=fixture(),preview=await transferHostTree(f.options);f.add('/source/Set/added.txt','file','later');await assert.rejects(transferHostTree({...f.options,confirmed:true,sourceVersion:preview.sourceVersion}),/geändert/);assert.equal(f.nodes.has('/target/Set'),false);
 await assert.rejects(transferHostTree({...f.options,destination:{path:'/source/Set'}}),/Unterordner/);
 f.nodes.get('/source/Set/Nested').symlink=true;await assert.rejects(transferHostTree(f.options),/Links/);f.nodes.get('/source/Set/Nested').symlink=false;
 await assert.rejects(transferHostTree({...f.options,authorizeEntry:async e=>{if(e.relative==='Nested/b.txt')throw Error('denied');}}),/denied/);assert.equal(f.nodes.has('/target/Set'),false);
 f.nodes.get('/target').resolved='/source/Set';await assert.rejects(transferHostTree(f.options),/Unterordner/);
});
test('cancellation retains completed copies and leaves the unfinished source untouched',async()=>{
 const f=fixture(),preview=await transferHostTree(f.options),controller=new AbortController();let first;
 await assert.rejects(transferHostTree({...f.options,confirmed:true,sourceVersion:preview.sourceVersion,signal:controller.signal,finishFile:async info=>{first=info.target;controller.abort();}}),e=>e.name==='AbortError');assert.ok(f.nodes.has(first));assert.ok(f.nodes.has('/source/Set/a.txt'));assert.ok(f.nodes.has('/source/Set/Nested/b.txt'));assert.equal(f.uploads.size,0);
});
test('Explorer resolves tree conflicts before its aggregate confirmation',async()=>{
 const requests=[],executed=[];let conflictCalls=0;
 const result=await transferHostEntry({id:'host:/source/Set',parent:'host:/target',mode:'copy',name:'Set',request:async(url,data)=>{requests.push(data);return{tree:true,sourceVersion:'tree-v',totalItems:5,preview:'source → target',merge:true,conflicts:data.choices?[]:[{relative:'a.txt',name:'a.txt',kind:'file',existing:{kind:'file',version:'v'}}]};},conflict:async()=>{conflictCalls++;return 'both';},confirm:async message=>{assert.match(message,/zusammengeführt/);return true;},execute:async data=>{executed.push(data);return{ok:true};}});
 assert.equal(result.ok,true);assert.equal(conflictCalls,1);assert.equal(requests.length,2);assert.equal(executed[0].choices['a.txt'].action,'both');assert.equal(executed[0].sourceVersion,'tree-v');
});
