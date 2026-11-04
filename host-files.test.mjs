import test from 'node:test';
import assert from 'node:assert/strict';
import {hostFile} from './host-command.mjs';
import {createHostFiles,hostIdFromURL,HOST_ROOT,HOST_TRASH} from './public/host-files.js';
test('host filesystem gateway rejects guests, shares and non-administrators',()=>{
 for(const user of [null,{id:'a',role:'user'},{id:'a',role:'admin',shareEditing:true}])assert.throws(()=>hostFile(user,'list',{path:'/'},{socket:'fixture'}),e=>e.status===403);
 assert.throws(()=>hostFile({id:'a',role:'admin'},'read',{path:'relative'},{socket:'fixture'}),e=>e.status===400);
});
test('host Explorer uses network paths and role-isolated cached nodes',async()=>{
 let state={authenticated:true,role:'admin',readonly:false,hostCommandsEnabled:true};const calls=[];
 const client=createHostFiles({getState:()=>state,confirm:async()=>true,request:async(url,data)=>{calls.push(url);return url.endsWith('/stat')?{node:{path:data.path,name:'etc',kind:'folder'}}:{node:{path:'/',name:'',kind:'folder'},entries:[{path:'/etc',name:'etc',kind:'folder'},{path:'/a.txt',name:'a.txt',kind:'file',version:'v'}]};}});
 await client.ensure(HOST_ROOT);assert.equal(client.get('host:/etc').parent,HOST_ROOT);assert.equal(client.get('host:/etc').path,'/Network/Hostsystem/etc');assert.equal(client.children(HOST_ROOT).length,3);assert.equal(hostIdFromURL('/Network/Hostsystem/etc'),'host:/etc');assert.equal(hostIdFromURL('/Network/Hostsystem/?hostTrash=1'),HOST_TRASH);state={...state,role:'user'};assert.equal(client.get(HOST_ROOT),null);assert.deepEqual(client.children(HOST_ROOT),[]);
});
test('host editor writes retain the read version and require mutation confirmation',async()=>{
 const requests=[];let confirms=0;const client=createHostFiles({getState:()=>({authenticated:true,role:'admin',hostCommandsEnabled:true}),confirm:async()=>{confirms++;return true;},request:async(url,data)=>{requests.push(data);return data.confirmed?{ok:true,version:'new'}:{requiresConfirmation:true,preview:'save'};}});
 await client.adapt('/api/text',{id:'host:/a.txt',content:'hello',version:'old'});assert.equal(confirms,1);assert.equal(requests[1].version,'old');assert.equal(requests[1].confirmed,true);assert.equal(await client.adapt('/api/session'),null);
});


test('removed host files do not reappear as invented directory placeholders',async()=>{
 const client=createHostFiles({getState:()=>({authenticated:true,role:'admin',hostCommandsEnabled:true}),confirm:async()=>true,request:async(url,data)=>url.endsWith('/stat')?{node:{path:'/',name:'',kind:'folder'}}:url.endsWith('/list')?{node:{path:'/',name:'',kind:'folder'},entries:[{path:'/a.txt',name:'a.txt',kind:'file',version:'v'}]}:{ok:true}});
 await client.ensure(HOST_ROOT);assert.ok(client.get('host:/a.txt'));await client.adapt('/api/delete',{id:'host:/a.txt'});assert.equal(client.get('host:/a.txt'),null);assert.equal(client.get('host:/unknown'),null);
});


test('host downloads stream binary chunks and refuse non-administrators before reading',async()=>{
 const {default:http}=await import('node:http'),{default:os}=await import('node:os'),{default:path}=await import('node:path'),{randomUUID}=await import('node:crypto'),{hostFilesGateway}=await import('./host-files.mjs');
 const socket=process.platform==='win32'?'\\\\.\\pipe\\host-files-'+randomUUID():path.join(os.tmpdir(),'host-files-'+randomUUID()+'.sock'),bytes=Buffer.alloc(400000,153),seen=[];
 const agent=http.createServer(async(req,res)=>{let raw='';for await(const chunk of req)raw+=chunk;const data=JSON.parse(raw);seen.push(data);const start=data.offset||0,end=Math.min(bytes.length,start+262144);res.end(JSON.stringify({data:bytes.subarray(start,end).toString('base64'),offset:end,size:bytes.length,name:'Host-Test.bin',version:'same'}));});await new Promise(resolve=>agent.listen(socket,resolve));const previous=process.env.HOST_AGENT_SOCKET;process.env.HOST_AGENT_SOCKET=socket;
 const server=http.createServer(async(req,res)=>{try{await hostFilesGateway({req,res,url:new URL(req.url,'http://fixture'),user:{id:'a',role:req.headers['x-role']==='user'?'user':'admin'},json:(status,data)=>{res.writeHead(status);res.end(JSON.stringify(data));}});}catch(error){res.writeHead(error.status||500);res.end(error.message);}});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{const url='http://127.0.0.1:'+server.address().port+'/api/host-files/download?path=/example.bin',denied=await fetch(url,{headers:{'x-role':'user'}});assert.equal(denied.status,403);assert.equal(seen.length,0);const response=await fetch(url);assert.match(response.headers.get('content-disposition'),/attachment/);assert.equal(response.headers.get('cache-control'),'no-store');assert.deepEqual(Buffer.from(await response.arrayBuffer()),bytes);assert.equal(seen.length,2);assert.equal(seen[1].version,'same');assert.equal(seen[0].admin,true);}
 finally{if(previous===undefined)delete process.env.HOST_AGENT_SOCKET;else process.env.HOST_AGENT_SOCKET=previous;await new Promise(resolve=>server.close(resolve));await new Promise(resolve=>agent.close(resolve));}
});

test('host upload streams bounded chunks, verifies a digest and cleans rejected sessions',async()=>{
 const http=await import('node:http'),os=await import('node:os'),path=await import('node:path'),{randomUUID,createHash}=await import('node:crypto'),{hostFilesGateway}=await import('./host-files.mjs');
 const socket=process.platform==='win32'?'\\\\.\\pipe\\host-upload-'+randomUUID():path.join(os.tmpdir(),'host-upload-'+randomUUID()+'.sock'),bytes=Buffer.alloc(700000,157),seen=[];let offset=0,authorized=true,mutations=0;
 const agent=http.createServer(async(req,res)=>{let raw='';for await(const chunk of req)raw+=chunk;const data=JSON.parse(raw);seen.push({action:req.url,data});let result={ok:true};if(req.url.endsWith('/upload-status')){offset=0;result={size:bytes.length,offset:0};}if(req.url.endsWith('/upload-chunk')){assert.equal(data.offset,offset);const chunk=Buffer.from(data.data,'base64');assert.ok(chunk.length<=262144);assert.deepEqual(chunk,bytes.subarray(offset,offset+chunk.length));offset+=chunk.length;result={offset};}res.end(JSON.stringify(result));});await new Promise(resolve=>agent.listen(socket,resolve));const previous=process.env.HOST_AGENT_SOCKET;process.env.HOST_AGENT_SOCKET=socket;
 const server=http.createServer(async(req,res)=>{try{await hostFilesGateway({req,res,url:new URL(req.url,'http://fixture'),user:{id:'alice',role:'admin'},authorized:()=>authorized,beginMutation:()=>{mutations++;return()=>mutations--;},json:(status,value)=>{res.writeHead(status);res.end(JSON.stringify(value));}});}catch(error){res.writeHead(error.status||500);res.end(error.message);}});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{
  const url='http://127.0.0.1:'+server.address().port+'/api/host-files/upload?uploadId=fixture';const response=await fetch(url,{method:'POST',body:bytes});assert.equal(response.status,200);assert.equal(offset,bytes.length);assert.equal(mutations,0);const commit=seen.find(c=>c.action.endsWith('/upload-commit'));assert.equal(commit.data.digest,createHash('sha256').update(bytes).digest('hex'));assert.equal(commit.data.owner,'alice');assert.equal(seen.some(c=>c.action.endsWith('/upload-abort')),false);
  seen.length=0;const mismatch=await fetch(url,{method:'POST',body:bytes.subarray(0,10)});assert.equal(mismatch.status,400);assert.equal(seen.at(-1).action,'/files/upload-abort');assert.equal(seen.some(c=>c.action.endsWith('/upload-commit')),false);
  authorized=false;seen.length=0;assert.equal((await fetch(url,{method:'POST',body:bytes})).status,401);assert.equal(seen.length,0);
 }finally{if(previous===undefined)delete process.env.HOST_AGENT_SOCKET;else process.env.HOST_AGENT_SOCKET=previous;await new Promise(resolve=>server.close(resolve));await new Promise(resolve=>agent.close(resolve));}
});
