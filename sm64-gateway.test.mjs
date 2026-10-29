import {test} from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {sm64Gateway,validSm64Save} from './sm64-gateway.mjs';
test('SM64 saves are isolated by authenticated desktop identity and survive restarts',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'sm64-save-'));
 const save=Buffer.alloc(512,42).toString('base64');assert.equal(validSm64Save(save),true);assert.equal(validSm64Save('x'.repeat(684)),false);
 const call=async(user,method,data)=>{let answer;await sm64Gateway({req:{method},res:{},url:new URL('http://test/api/sm64/save'),user,metadataDir:dir,body:async()=>Buffer.from(JSON.stringify(data)),json:(status,data)=>answer={status,data}});return answer;};
 try{assert.equal((await call(null,'POST',{save})).status,401);assert.equal((await call({id:'alice',shareEditing:true},'POST',{save})).status,401);
 assert.equal((await call({id:'alice'},'POST',{save:'bad'})).status,400);
 assert.equal((await call({id:'bob'},'POST',{save,userId:'alice'})).status,409);
 assert.equal((await call({id:'alice'},'POST',{save})).status,200);
 assert.equal((await call({id:'alice'},'GET')).data.save,save);
 assert.equal((await call({id:'bob'},'GET')).data.save,null);
 assert.equal((await call({id:'alice'},'DELETE')).status,405);
 }finally{await fs.rm(dir,{recursive:true,force:true});}
});
test('SM64 proxy exposes only fixed assets to authenticated users',async()=>{
 const upstream=http.createServer((req,res)=>{res.end(req.url==='/health'?'ready':'wasm');});await new Promise(r=>upstream.listen(0,'127.0.0.1',r));
 const server=http.createServer(async(req,res)=>{try{await sm64Gateway({req,res,url:new URL(req.url,'http://test'),user:req.headers.authorization?{id:'alice'}:null,metadataDir:os.tmpdir(),service:'http://127.0.0.1:'+upstream.address().port,json:(status,data)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(data));}});}catch{res.writeHead(500);res.end();}});await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 try{assert.equal((await fetch(base+'/api/sm64/assets/index.html')).status,401);assert.equal((await fetch(base+'/api/sm64/assets/private.env',{headers:{authorization:'yes'}})).status,404);const r=await fetch(base+'/api/sm64/assets/sm64.eu.f3dex2e.wasm',{headers:{authorization:'yes'}});assert.equal(r.status,200);assert.equal(r.headers.get('content-type'),'application/wasm');assert.equal(await r.text(),'wasm');assert.deepEqual(await(await fetch(base+'/api/sm64/status',{headers:{authorization:'yes'}})).json(),{ready:true});}finally{await Promise.all([new Promise(r=>server.close(r)),new Promise(r=>upstream.close(r))]);}
});
