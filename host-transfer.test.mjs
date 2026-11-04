import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {transferHostFile} from './host-transfer.mjs';
import {transferHostEntry} from './public/host-upload.js';

function fixture(){
 const bytes=Buffer.alloc(700000,171),calls=[],progress=[];let offset=0,finished=0,version='original';
 const options={user:{id:'admin',role:'admin'},source:{path:'/source/file.bin'},destination:{path:'/target',profile:true,uid:982,gid:982},name:'file.bin',sourceVersion:'original',confirmed:true,onProgress:p=>progress.push(p),
  finish:async()=>finished++,call:async(user,action,data)=>{calls.push({user,action,data});if(action==='stat')return{node:{kind:'file',version,size:bytes.length}};if(action==='upload-start')return data.confirmed?{uploadId:'stage'}:{requiresConfirmation:true,existing:null};if(action==='chunk'){assert.equal(data.version,'original');const end=Math.min(bytes.length,data.offset+262144);return{data:bytes.subarray(data.offset,end).toString('base64'),size:bytes.length,offset:end};}if(action==='upload-chunk'){assert.equal(data.offset,offset);offset+=Buffer.from(data.data,'base64').length;return{offset};}if(action==='upload-commit')return{ok:true,node:{path:'/target/file.bin',size:offset}};return{ok:true};}};
 return{options,bytes,calls,progress,get finished(){return finished;},set version(value){version=value;}};
}
test('cross-filesystem transfer is bounded, versioned, checksummed and assigns the profile owner',async()=>{
 const f=fixture();await transferHostFile(f.options);assert.equal(f.finished,1);assert.equal(f.calls.filter(c=>c.action==='chunk').length,3);assert.equal(f.progress.at(-1).loadedBytes,f.bytes.length);
 const start=f.calls.find(c=>c.action==='upload-start'&&c.data.confirmed);assert.equal(start.data.uid,982);assert.equal(start.data.gid,982);const commit=f.calls.find(c=>c.action==='upload-commit');assert.equal(commit.data.digest,createHash('sha256').update(f.bytes).digest('hex'));assert.equal(f.calls.some(c=>c.action==='upload-abort'),false);
});
test('preview and rejected roles never allocate a transfer stage',async()=>{
 const f=fixture();const preview=await transferHostFile({...f.options,confirmed:false});assert.equal(preview.sourceVersion,'original');assert.equal(f.calls.some(c=>c.data.confirmed),false);f.calls.length=0;
 await assert.rejects(transferHostFile({...f.options,user:{id:'user',role:'user'}}),e=>e.status===403);assert.equal(f.calls.length,0);
 await assert.rejects(transferHostFile({...f.options,destination:{path:'/source'}}),/identisch/);
});
test('source changes and cancellations abort the stage and never run source removal',async()=>{
 const f=fixture(),call=f.options.call;f.options.call=async(...args)=>{const result=await call(...args);if(args[1]==='upload-chunk')f.version='changed';return result;};await assert.rejects(transferHostFile(f.options),/Quelldatei/);assert.equal(f.finished,0);assert.equal(f.calls.at(-1).action,'upload-abort');assert.equal(f.calls.some(c=>c.action==='upload-commit'),false);
 const g=fixture(),controller=new AbortController();g.options.onProgress=e=>{if(e.loadedBytes)controller.abort();};await assert.rejects(transferHostFile({...g.options,signal:controller.signal}),e=>e.name==='AbortError');assert.equal(g.finished,0);assert.equal(g.calls.at(-1).action,'upload-abort');
});
test('revoked session stops before publication and uses only its own cleanup identity',async()=>{
 const f=fixture();let active=true;f.options.onProgress=e=>{if(e.loadedBytes)active=false;};await assert.rejects(transferHostFile({...f.options,authorized:()=>active}),e=>e.status===401);assert.equal(f.calls.at(-1).action,'upload-abort');assert.equal(f.calls.at(-1).user.id,'admin');assert.equal(f.finished,0);
});
test('failed move finalization explicitly retains its completed destination',async()=>{
 const f=fixture();f.options.finish=async()=>{throw Error('source changed');};await assert.rejects(transferHostFile(f.options),/vollständig kopiert.*source changed/);assert.equal(f.calls.some(c=>c.action==='upload-abort'),false);
});
test('zero-size sources are actually read so pseudo files cannot become fabricated empty copies',async()=>{
 const f=fixture(),call=f.options.call;f.options.call=async(user,action,data)=>{if(action==='stat')return{node:{kind:'file',version:'original',size:0}};if(action==='chunk')throw Error('Systemeintrag unterstützt keinen stabilen Download');return call(user,action,data);};
 await assert.rejects(transferHostFile(f.options),/stabilen Download/);assert.equal(f.finished,0);assert.equal(f.calls.at(-1).action,'upload-abort');
});
test('Explorer transfer planning preserves source and destination versions and skips without executing',async()=>{
 const calls=[],executed=[];let choice='both';const options={id:'host:/a.txt',parent:'folder',mode:'move',name:'a.txt',request:async(url,data)=>{calls.push({...data});return{preview:'/source → /target',sourceVersion:'source-v',existing:data.name==='a.txt'?{kind:'file',version:'target-v'}:null};},confirm:async()=>true,conflict:async()=>choice,execute:async data=>{executed.push(data);return{ok:true};}};
 await transferHostEntry(options);assert.equal(executed[0].name,'a (2).txt');assert.equal(executed[0].sourceVersion,'source-v');choice='replace';await transferHostEntry(options);assert.equal(executed[1].version,'target-v');assert.equal(executed[1].overwrite,true);choice='skip';assert.deepEqual(await transferHostEntry(options),{skipped:true});assert.equal(executed.length,2);
});
