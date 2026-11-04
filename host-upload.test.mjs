import test from 'node:test';
import assert from 'node:assert/strict';
import {uploadHostFiles} from './public/host-upload.js';

function fixture(existing={}){
 const calls=[],uploaded=[],updates=[],aborted=[];let confirmed=0,closed=0;
 const progress={cancelled:false,update:data=>updates.push(data),close:()=>closed++};
 const options={files:[{name:'same.txt',size:3}],path:'/tmp',
  request:async(url,data)=>{calls.push({url,data});if(url.endsWith('/upload-start'))return data.confirmed?{uploadId:data.name}:{requiresConfirmation:true,existing:existing[data.name]||null};if(url.endsWith('/upload-abort'))aborted.push(data.uploadId);return{ok:true};},
  confirm:async()=>{confirmed++;return true;},conflict:async()=> 'both',transfer:()=>progress,
  upload:async(url,file,update)=>{uploaded.push(url);update({loaded:file.size});}};
 return{options,calls,uploaded,updates,aborted,progress,get confirmed(){return confirmed;},get closed(){return closed;}};
}
test('keep both probes names and publishes only the chosen free name',async()=>{
 const f=fixture({'same.txt':{kind:'file',version:'old'},'same (2).txt':{kind:'file'}});
 assert.deepEqual(await uploadHostFiles(f.options),{cancelled:false,completed:1});assert.equal(f.confirmed,1);assert.equal(f.closed,1);
 const starts=f.calls.filter(c=>c.data.confirmed);assert.equal(starts.length,1);assert.equal(starts[0].data.name,'same (3).txt');assert.equal(starts[0].data.overwrite,false);assert.deepEqual(f.aborted,[]);
});
test('replace sends the exact preview version and skip never allocates a stage',async()=>{
 const f=fixture({'same.txt':{kind:'file',version:'original'}});f.options.conflict=async()=> 'replace';await uploadHostFiles(f.options);
 assert.equal(f.calls.find(c=>c.data.confirmed).data.version,'original');assert.equal(f.calls.find(c=>c.data.confirmed).data.overwrite,true);
 const skipped=fixture({'same.txt':{kind:'file'}});skipped.options.conflict=async()=> 'skip';assert.equal((await uploadHostFiles(skipped.options)).completed,0);assert.equal(skipped.confirmed,0);assert.equal(skipped.uploaded.length,0);
});
test('rejected aggregate confirmation and cancelled stage never upload bytes',async()=>{
 const f=fixture();f.options.confirm=async()=>false;assert.equal((await uploadHostFiles(f.options)).cancelled,true);assert.equal(f.calls.length,1);
 const cancelled=fixture();const request=cancelled.options.request;cancelled.options.request=async(url,data)=>{const result=await request(url,data);if(data.confirmed)cancelled.progress.cancelled=true;return result;};await uploadHostFiles(cancelled.options);assert.deepEqual(cancelled.aborted,['same.txt']);assert.equal(cancelled.uploaded.length,0);
});
test('failed transfer aborts its stage and closes progress while retaining completed files',async()=>{
 const f=fixture();f.options.files.push({name:'second.txt',size:4});let count=0;f.options.upload=async()=>{if(count++)throw Error('connection lost');};
 await assert.rejects(uploadHostFiles(f.options),/connection lost/);assert.deepEqual(f.aborted,['second.txt']);assert.equal(f.closed,1);assert.ok(f.updates.some(update=>update.completed===1));
});
