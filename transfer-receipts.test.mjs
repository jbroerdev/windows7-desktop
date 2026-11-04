import test from 'node:test';
import assert from 'node:assert/strict';
import {promises as fs} from 'node:fs';
import {randomBytes} from 'node:crypto';
import path from 'node:path';
import os from 'node:os';
import {createTransferReceipts} from './transfer-receipts.mjs';

test('transfer receipt versions survive restart, separate profiles, hide link credentials and retain whole operations',async()=>{
 const metadataDir=await fs.mkdtemp(path.join(os.tmpdir(),'transfer-receipts-')),user={id:'alice'},db={},storage={path(){throw Error('Links have no payload');}},id=()=>randomBytes(16).toString('hex'),save=async()=>fs.writeFile(path.join(metadataDir,'db.json'),JSON.stringify(db));
 const node={id:'link',parent:'docs',owner:'alice',kind:'link',name:'Portal',url:'https://example.com',authUsername:'private-login',authPassword:'private-password'};
 try{
  let receipts=await createTransferReceipts({db,storage,metadataDir,id,save});const version=await receipts.snapshot(node),receipt=receipts.begin(user,{mode:'copy',source:node,parent:{id:'target'}});
  await receipts.record(receipt,{key:'mutation',kind:'created',node});await receipts.record(receipt,{key:'mutation',kind:'created',node});assert.equal(receipt.items.length,1);await save();
  receipts=await createTransferReceipts({db,storage,metadataDir,id,save});assert.equal(await receipts.snapshot(node),version);assert.equal(receipts.list(user)[0].status,'interrupted');assert.notEqual(await receipts.snapshot({...node,authPassword:'changed'}),version);
  assert.deepEqual(receipts.list({id:'bob'}),[]);assert.deepEqual(receipts.list({...user,shareEditing:true}),[]);assert.ok(!JSON.stringify(db).includes('private-password'));assert.ok(!JSON.stringify(db).includes('private-login'));
  if(process.platform!=='win32')assert.equal((await fs.stat(path.join(metadataDir,'transfer-receipt.key'))).mode&0o777,0o600);
  for(let i=0;i<51;i++){const next=receipts.begin(user,{mode:'copy',source:{...node,name:'Operation '+i},parent:{id:'target'}});for(let j=0;j<3;j++)await receipts.record(next,{key:String(j),kind:'created',node});await receipts.finish(next,'completed');}
  const retained=receipts.list(user);assert.equal(retained.length,50);assert.ok(retained.every(r=>r.items.length===3));assert.equal(retained[0].name,'Operation 1');
 }finally{await fs.rm(metadataDir,{recursive:true,force:true});}
});

test('filesystem size-cache refresh does not invalidate a receipt, actual byte changes do',async()=>{
 const metadataDir=await fs.mkdtemp(path.join(os.tmpdir(),'transfer-size-')),filename=path.join(metadataDir,'data.bin'),db={},node={id:'file',parent:'docs',owner:'alice',kind:'file',name:'data.bin',size:0};
 try{await fs.writeFile(filename,'three');const receipts=await createTransferReceipts({db,storage:{path:()=>filename},metadataDir,id:()=>randomBytes(16).toString('hex'),save:async()=>{}}),before=await receipts.snapshot(node);assert.equal(await receipts.snapshot({...node,size:5}),before);await fs.writeFile(filename,'changed bytes');assert.notEqual(await receipts.snapshot({...node,size:13}),before);}finally{await fs.rm(metadataDir,{recursive:true,force:true});}
});

test('new receipt format ignores derived modification cache while legacy hashes retain their exact rules',async()=>{
 const metadataDir=await fs.mkdtemp(path.join(os.tmpdir(),'transfer-modified-')),filename=path.join(metadataDir,'data.bin'),db={},node={id:'file',parent:'docs',owner:'alice',kind:'file',name:'data.bin',modified:'source-cache-time'};
 try{await fs.writeFile(filename,'same bytes');const receipts=await createTransferReceipts({db,storage:{path:()=>filename},metadataDir,id:()=>randomBytes(16).toString('hex'),save:async()=>{}}),version=await receipts.snapshot(node),legacy=await receipts.snapshot(node,undefined,1);node.modified=(await fs.stat(filename)).mtime.toISOString();assert.equal(await receipts.snapshot(node),version);assert.notEqual(await receipts.snapshot(node,undefined,1),legacy);const receipt=receipts.begin({id:'alice'},{mode:'copy',source:node,parent:{id:'docs'}});await receipts.record(receipt,{key:'copy',kind:'created',node});assert.equal(receipt.items[0].versionFormat,2);await fs.writeFile(filename,'other byte');assert.notEqual(await receipts.snapshot(node),version);}finally{await fs.rm(metadataDir,{recursive:true,force:true});}
});


test('receipt retention keeps all roots of a selected group and drops expired groups together',async()=>{
 const metadataDir=await fs.mkdtemp(path.join(os.tmpdir(),'transfer-group-')),user={id:'alice'},db={fileHistory:{'alice:personal':{undo:[],redo:[]}}},id=()=>randomBytes(16).toString('hex'),node={id:'link',owner:'alice',kind:'link',name:'Link',parent:'docs'},pruned=[];
 try{const receipts=await createTransferReceipts({db,storage:{},metadataDir,id,save:async()=>{},onRecord:r=>db.fileHistory['alice:personal'].undo.push({batch:r.batch||r.id}),onPrune:ids=>pruned.push(...ids)}),batch='33333333-3333-4333-8333-333333333333',group=[];
 for(let n=0;n<60;n++){const r=receipts.begin(user,{mode:'copy',source:node,parent:{id:'target'},batch});group.push(r.id);await receipts.record(r,{key:id(),kind:'created',node});await receipts.finish(r,'completed');}assert.equal(receipts.list(user).length,60);assert.ok(receipts.list(user).every(r=>r.batch===batch));
 for(let n=0;n<49;n++){const r=receipts.begin(user,{mode:'copy',source:node,parent:{id:'target'}});await receipts.record(r,{key:id(),kind:'created',node});await receipts.finish(r,'completed');}assert.equal(receipts.list(user).length,109);
 const r=receipts.begin(user,{mode:'copy',source:node,parent:{id:'target'}});await receipts.record(r,{key:id(),kind:'created',node});assert.equal(receipts.list(user).length,50);assert.ok(group.every(id=>pruned.includes(id)));
 }finally{await fs.rm(metadataDir,{recursive:true,force:true});}
});
