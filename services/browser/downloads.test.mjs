import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {once} from 'node:events';
import {mkdtemp,mkdir,rm,readFile,writeFile,readdir} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {createDownloads} from './downloads.mjs';
import {createBrowserDownloadReceiver} from '../../browser-downloads.mjs';
test('completed downloads survive an unavailable desktop and a browser-service restart',async t=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'browser-download-queue-')),secret='durable-download-test-secret-123456',actor=Buffer.from('alice').toString('base64url'),received=[];let queue;
 const receiver=createBrowserDownloadReceiver({secret:()=>secret,temporaryDir:path.join(dir,'spool'),resolveUser:id=>id==='alice'?{id}:null,store:async({user,file,name,transferId})=>{received.push({user:user.id,name,text:await readFile(file,'utf8'),transferId});return{id:'result',name};}}),server=http.createServer(receiver);server.listen(0,'127.0.0.1');await once(server,'listening');t.after(async()=>{queue?.close();server.closeAllConnections();await new Promise(r=>server.close(r));await rm(dir,{recursive:true,force:true});});
 queue=await createDownloads({directory:path.join(dir,'pending'),secret,endpoint:'http://127.0.0.1:1'});await queue.capture(actor,{suggestedFilename:()=> 'Reise.gpx',saveAs:file=>writeFile(file,'GPX download'),delete:async()=>{},cancel:async()=>{}},dir);assert.deepEqual(queue.pending(actor),[{state:'pending',name:'Reise.gpx'}]);assert.deepEqual(queue.pending(Buffer.from('bob').toString('base64url')),[]);queue.close();
 queue=await createDownloads({directory:path.join(dir,'pending'),secret,endpoint:'http://127.0.0.1:'+server.address().port});for(let i=0;i<100&&(received.length===0||queue.pending(actor).length);i++)await new Promise(r=>setTimeout(r,20));assert.equal(received.length,1);assert.equal(received[0].user,'alice');assert.equal(received[0].text,'GPX download');assert.deepEqual(await readdir(path.join(dir,'pending')),[]);
});
test('a persisted delivery receipt finishes local cleanup without importing the download again',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'browser-download-receipt-')),id='12345678-1234-1234-1234-123456789abc',actor=Buffer.from('alice').toString('base64url');let queue;
 try{await mkdir(path.join(dir,'pending'));await writeFile(path.join(dir,'pending',id+'.bin'),'already imported');await writeFile(path.join(dir,'pending',id+'.json'),JSON.stringify({id,actor,name:'done.txt',size:16,digest:'unused',delivered:true,result:{id:'stored',name:'done.txt'}}));
  queue=await createDownloads({directory:path.join(dir,'pending'),secret:'receipt-test-secret',endpoint:'http://127.0.0.1:1'});for(let index=0;index<100&&queue.pending(actor).length;index++)await new Promise(resolve=>setTimeout(resolve,20));assert.deepEqual(queue.pending(actor),[]);assert.deepEqual(await readdir(path.join(dir,'pending')),[]);
 }finally{queue?.close();await rm(dir,{recursive:true,force:true});}
});
