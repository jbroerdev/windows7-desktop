import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,stat,readdir,rm} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import {createStorage} from './storage.mjs';
import {createProfileTransfers} from './profile-transfer.mjs';
import {createTransferReceipts} from './transfer-receipts.mjs';
import {createFileOperations} from './file-operations.mjs';
import {createFileHistory} from './file-history.mjs';

async function fixture(){
 const temp=await mkdtemp(path.join(os.tmpdir(),'profile-journal-')),metadata=path.join(temp,'metadata'),user={id:'u',username:'alice',role:'user'},db={users:[user],nodes:[{id:'source',owner:'u',parent:null,name:'Source',kind:'folder',space:'home'},{id:'target',owner:'u',parent:null,name:'Target',kind:'folder',space:'home'},{id:'file',owner:'u',parent:'source',name:'data.bin',kind:'file',size:400000,space:'home'}]};await mkdir(metadata);const storage=createStorage({root:path.join(temp,'Explorer'),metadataDir:metadata,db});storage.initialize();await writeFile(storage.path(db.nodes[2]),Buffer.alloc(400000,171));let failSave=false;
 const persist=async state=>{if(failSave)throw Error('metadata unavailable');await writeFile(path.join(metadata,'database.json'),JSON.stringify(state));};
 const create=(state=db,receipts,operations)=>createProfileTransfers({db:state,storage:state===db?storage:createStorage({root:path.join(temp,'Explorer'),metadataDir:metadata,db:state}),id:()=>randomBytes(16).toString('hex'),get:id=>state.nodes.find(n=>n.id===id),owned:n=>n?.owner==='u',readable:n=>n?.owner==='u',target:(actor,id)=>state.nodes.find(n=>n.id===id),creationOwner:()=> 'u',spaceOf:()=> 'home',save:()=>persist(state),receipts,operations:operations||{trash:async()=>{throw Error('unexpected trash');}},metadataDir:metadata,locked:async(key,fn)=>fn()});
 return{temp,metadata,user,db,storage,create,persist,set failSave(value){failSave=value;},close:()=>rm(temp,{recursive:true,force:true})};
}
test('profile cancellation and revoked sessions clean unpublished stages and journals',async()=>{
 for(const revoked of [false,true]){const f=await fixture();try{const transfers=f.create(),data={id:'file',parent:'target',name:'data.bin',mode:'copy'},preview=await transfers.transfer(f.user,data),controller=new AbortController();let active=true;
  await assert.rejects(transfers.transfer(f.user,{...data,sourceVersion:preview.sourceVersion,confirmed:true},{signal:controller.signal,authorized:()=>active,onProgress:event=>{if(event.loadedBytes){if(revoked)active=false;else controller.abort();}}}));
  assert.deepEqual(await readdir(f.storage.path(f.db.nodes.find(n=>n.id==='target'))),[]);assert.deepEqual(await readdir(path.join(f.metadata,'profile-transfers')),[]);assert.equal((await readFile(f.storage.path(f.db.nodes.find(n=>n.id==='file')))).length,400000);
 }finally{await f.close();}}
});
test('publication before a failed metadata save is completed from its durable receipt after restart',async()=>{
 const f=await fixture();try{const initial=structuredClone(f.db),transfers=f.create(),data={id:'file',parent:'target',name:'data.bin',mode:'copy'},preview=await transfers.transfer(f.user,data);f.failSave=true;
  await assert.rejects(transfers.transfer(f.user,{...data,sourceVersion:preview.sourceVersion,confirmed:true}),/vollständig kopiert/);const journal=await readdir(path.join(f.metadata,'profile-transfers'));assert.equal(journal.length,1);f.failSave=false;
  await f.create(initial).recover();assert.equal(initial.nodes.filter(n=>n.parent==='target').length,1);assert.equal(initial.nodes.find(n=>n.parent==='target').size,400000);assert.deepEqual(await readdir(path.join(f.metadata,'profile-transfers')),[]);
 }finally{await f.close();}
});
test('a changed published file is retained without trusting stale journal metadata',async()=>{
 const f=await fixture();try{const initial=structuredClone(f.db),transfers=f.create(),data={id:'file',parent:'target',name:'data.bin',mode:'copy'},preview=await transfers.transfer(f.user,data);f.failSave=true;await assert.rejects(transfers.transfer(f.user,{...data,sourceVersion:preview.sourceVersion,confirmed:true}));f.failSave=false;
  const destination=path.join(f.storage.path(f.db.nodes.find(n=>n.id==='target')),'data.bin');await writeFile(destination,Buffer.alloc(400000,42));await f.create(initial).recover();assert.equal(initial.nodes.some(n=>n.parent==='target'),false);assert.equal((await readFile(destination))[0],42);assert.equal((await readdir(path.join(f.metadata,'profile-transfers'))).length,1);
 }finally{await f.close();}
});
test('a stale overwrite preview cannot alter the target or create a backup',async()=>{
 const f=await fixture();try{const transfers=f.create(),target={id:'old',owner:'u',parent:'target',name:'data.bin',kind:'file',space:'home'};f.db.nodes.push(target);await writeFile(f.storage.path(target),'old');const data={id:'file',parent:'target',name:'data.bin',mode:'copy'},preview=await transfers.transfer(f.user,data);await writeFile(f.storage.path(target),'changed');
  await assert.rejects(transfers.transfer(f.user,{...data,sourceVersion:preview.sourceVersion,overwrite:true,version:preview.existing.version,confirmed:true}),/Ziel wurde geändert/);assert.equal(await readFile(f.storage.path(target),'utf8'),'changed');assert.equal(f.db.trash?.length||0,0);
 }finally{await f.close();}
});

test('published file recovery also reconstructs its transfer operation and mutation exactly once',async()=>{
 const f=await fixture();try{const initial=structuredClone(f.db),receipts=await createTransferReceipts({db:f.db,storage:f.storage,metadataDir:f.metadata,id:()=>randomBytes(16).toString('hex'),save:()=>f.persist(f.db)}),transfers=f.create(f.db,receipts),data={id:'file',parent:'target',name:'data.bin',mode:'copy'},preview=await transfers.transfer(f.user,data);f.failSave=true;
  await assert.rejects(transfers.transfer(f.user,{...data,sourceVersion:preview.sourceVersion,confirmed:true}),/vollständig kopiert/);f.failSave=false;
  const journal=JSON.parse(await readFile(path.join(f.metadata,'profile-transfers',(await readdir(path.join(f.metadata,'profile-transfers')))[0]),'utf8'));assert.ok(journal.receipt.id);assert.equal(journal.mutation.kind,'created');
  const restoredStorage=createStorage({root:path.join(f.temp,'Explorer'),metadataDir:f.metadata,db:initial}),restoredReceipts=await createTransferReceipts({db:initial,storage:restoredStorage,metadataDir:f.metadata,id:()=>randomBytes(16).toString('hex'),save:()=>f.persist(initial)}),restarted=f.create(initial,restoredReceipts);
  await restarted.recover();await restarted.recover();const entries=restoredReceipts.list(f.user);assert.equal(entries.length,1);assert.equal(entries[0].items.length,1);assert.equal(entries[0].status,'interrupted');assert.equal(entries[0].items[0].node,initial.nodes.find(n=>n.parent==='target').id);assert.equal(entries[0].items[0].digest,journal.digest);assert.deepEqual(await readdir(path.join(f.metadata,'profile-transfers')),[]);
 }finally{await f.close();}
});

test('cancelled folder copy records only the completed directory, never its unpublished file',async()=>{
 const f=await fixture();try{
  const receipts=await createTransferReceipts({db:f.db,storage:f.storage,metadataDir:f.metadata,id:()=>randomBytes(16).toString('hex'),save:()=>f.persist(f.db)}),transfers=f.create(f.db,receipts),data={id:'source',parent:'target',name:'Partial',mode:'copy'},preview=await transfers.transfer(f.user,data),controller=new AbortController();
  await assert.rejects(transfers.transfer(f.user,{...data,sourceVersion:preview.sourceVersion,confirmed:true},{signal:controller.signal,onProgress:event=>{if(event.loadedBytes)controller.abort();}}));
  const entries=receipts.list(f.user);assert.equal(entries.length,1);assert.equal(entries[0].status,'partial');assert.equal(entries[0].items.length,1);assert.equal(entries[0].items[0].nodeKind,'folder');assert.equal(entries[0].items[0].name,'Partial');assert.deepEqual(await readdir(path.join(f.storage.path(f.db.nodes.find(n=>n.id==='target')),'Partial')),[]);assert.equal((await readFile(f.storage.path(f.db.nodes.find(n=>n.id==='file')))).length,400000);
 }finally{await f.close();}
});

test('failed source removal rolls back its receipt while retaining the completed destination copy',async()=>{
 const f=await fixture();try{const get=id=>f.db.nodes.find(n=>n.id===id),id=()=>randomBytes(16).toString('hex'),history=createFileHistory({db:f.db,id,get,storage:f.storage}),receipts=await createTransferReceipts({db:f.db,storage:f.storage,metadataDir:f.metadata,id,save:()=>f.persist(f.db),onRecord:(receipt,item)=>{history.recordTransfer(receipt,item);if(item.kind==='source')f.failSave=true;},onRemove:(receipt,item)=>{history.discardTransferItem(receipt.id,item.key);f.failSave=false;}}),operations=createFileOperations({db:f.db,storage:f.storage,id,get,owned:n=>n?.owner==='u',filePath:n=>f.storage.path(n),save:()=>f.persist(f.db),fail:message=>{throw Error(message);}}),transfers=f.create(f.db,receipts,operations),data={id:'file',parent:'target',name:'data.bin',mode:'move'},preview=await transfers.transfer(f.user,data);
  await assert.rejects(transfers.transfer(f.user,{...data,sourceVersion:preview.sourceVersion,confirmed:true}),/metadata unavailable/);const entries=receipts.list(f.user);assert.equal(entries.length,1);assert.equal(entries[0].status,'partial');assert.equal(entries[0].items.length,1);assert.equal(entries[0].items[0].kind,'created');assert.equal(f.db.fileHistory['u:personal'].undo.length,1);assert.equal((await readFile(f.storage.path(get('file')))).length,400000);assert.equal((await readFile(f.storage.path(f.db.nodes.find(n=>n.parent==='target')))).length,400000);assert.equal(f.db.trash.length,0);
 }finally{await f.close();}
});
