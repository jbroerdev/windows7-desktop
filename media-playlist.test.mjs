import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

test('Abbruch einer Playlist-Anfrage beendet auch den wartenden externen Abruf',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'playlist-cancel-'));
 process.env.NODE_ENV='test';process.env.DATA_DIR=path.join(dir,'metadata');process.env.EXPLORER_ROOT=path.join(dir,'Explorer');
 const {server}=await import('./backend.mjs');await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const nativeFetch=globalThis.fetch;let started,aborted;const start=new Promise(r=>started=r),cancel=new Promise(r=>aborted=r);
 globalThis.fetch=(input,options)=>{
  if(new URL(input).hostname!=='radio.example.test')return nativeFetch(input,options);
  return new Promise((resolve,reject)=>{started();options.signal.addEventListener('abort',()=>{aborted();reject(options.signal.reason);},{once:true});});
 };
 const controller=new AbortController();
 try{
  const response=nativeFetch('http://127.0.0.1:'+server.address().port+'/stream-playlist?url='+encodeURIComponent('https://radio.example.test/live.m3u8'),{signal:controller.signal}).catch(error=>error);
  await start;controller.abort();await response;
  await Promise.race([cancel,new Promise((resolve,reject)=>setTimeout(()=>reject(Error('Externer Abruf wurde nicht abgebrochen.')),1500).unref())]);
  assert.equal(controller.signal.aborted,true);
 }finally{globalThis.fetch=nativeFetch;server.closeAllConnections();await new Promise(r=>server.close(r));await rm(dir,{recursive:true,force:true});}
});
