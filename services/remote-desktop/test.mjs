import test from 'node:test';
import assert from 'node:assert/strict';
import {promises as fs} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import {once} from 'node:events';
import {createStore,normalizeProfile,targetAllowed} from './core.mjs';
import {createServer,signature} from './server.mjs';
import {instruction,InstructionParser,connectGuacd} from './protocol.mjs';
const temporary=async t=>{const dir=await fs.mkdtemp(path.join(os.tmpdir(),'rdp-test-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));return dir;};
const profile={hostname:'rdp.example',username:'tester',port:3389};
test('profiles are encrypted, owner isolated and passwords bound to target and identity',async t=>{
 const directory=await temporary(t),store=await createStore({directory,targets:['rdp.example','other.example']});
 const saved=await store.put('alice',{...profile,password:'unique-test-secret',savePassword:true});assert.equal(saved.hasPassword,true);assert.equal(saved.password,undefined);
 assert.equal(store.connection('alice',{profileId:saved.id}).password,'unique-test-secret');
 assert.throws(()=>store.connection('bob',{profileId:saved.id}),{status:404});
 assert.equal(store.connection('alice',{profileId:saved.id,hostname:'other.example'}).password,undefined);
 assert.equal(store.connection('alice',{profileId:saved.id,username:'another'}).password,undefined);
 assert.equal(store.connection('alice',{profileId:saved.id,domain:'another'}).password,undefined);
 assert.equal((await fs.readFile(path.join(directory,'profiles.json'),'utf8')).includes('unique-test-secret'),false);
 const reopened=await createStore({directory,targets:['rdp.example']});assert.equal(reopened.connection('alice',{profileId:saved.id}).password,'unique-test-secret');
 const changed=await store.put('alice',{...profile,id:saved.id,hostname:'other.example',savePassword:true});assert.equal(changed.hasPassword,false);
 const unsaved=await store.put('alice',{...profile,password:'not-saved'});assert.equal(unsaved.hasPassword,false);
 await assert.rejects(store.remove('bob',saved.id),{status:404});await store.remove('alice',saved.id);assert.equal(store.list('alice').profiles.length,1);
});
test('targets default to deny and validate exact port and configuration',()=>{
 const p=normalizeProfile(profile);assert.equal(targetAllowed(p,[]),false);assert.equal(targetAllowed(p,['rdp.example:3389']),true);assert.equal(targetAllowed({...p,port:3390},['rdp.example']),false);assert.equal(targetAllowed({...p,hostname:'rdp.example.evil'},['rdp.example']),false);
 for(const invalid of [{hostname:'http://rdp.example'},{port:0},{width:99999},{security:'invalid'}])assert.throws(()=>normalizeProfile({...profile,...invalid}));
});
test('parser handles fragmented Unicode and rejects malformed instructions',()=>{
 const p=new InstructionParser(),out=[],text=instruction('name','Grüße 😀')+instruction('sync',123);for(const character of text)p.receive(character,v=>out.push(v));assert.deepEqual(out,[['name','Grüße 😀'],['sync','123']]);assert.throws(()=>new InstructionParser().receive('x.bad;',()=>{}));
});
test('real TCP handshake forwards drawing data after ready and bidirectional input',async t=>{
 let clientSocket,parameters;const received=[],server=net.createServer(socket=>{clientSocket=socket;const p=new InstructionParser();socket.on('data',b=>p.receive(b.toString(),v=>{received.push(v);if(v[0]==='select'){const bytes=Buffer.from(instruction('args','VERSION_1_5_0','hostname','port','username','password','security'));socket.write(bytes.subarray(0,4));socket.write(bytes.subarray(4));}if(v[0]==='connect'){parameters=v;const bytes=Buffer.from(instruction('ready','test-session')+instruction('name','Grüße 😀')+instruction('sync',123));socket.write(bytes.subarray(0,31));setTimeout(()=>socket.write(bytes.subarray(31)),5);}}));});server.listen(0,'127.0.0.1');await once(server,'listening');
 let connection; t.after(async()=>{connection?.close();clientSocket?.destroy();await new Promise(r=>server.close(r));});const output=[];let readyResolve;const ready=new Promise(r=>readyResolve=r),config={...normalizeProfile({...profile,password:'test-only'}),displayName:'Test'};
 connection=connectGuacd({host:'127.0.0.1',port:server.address().port,config,onReady:readyResolve,onData:v=>output.push(v),onClose:()=>{}});await ready;
 connection.write(instruction('key',65,1));await new Promise(r=>setTimeout(r,40));assert.deepEqual(parameters,['connect','VERSION_1_5_0','rdp.example','3389','tester','test-only','nla']);assert.equal(config.password,undefined);const p=new InstructionParser(),draw=[];p.receive(output.join(''),v=>draw.push(v));assert.deepEqual(draw,[['name','Grüße 😀'],['sync','123']]);assert.ok(received.some(v=>v[0]==='key'&&v[1]==='65'));
});
test('signed API refuses tampering, isolates session owners and closes upstream on browser disconnect',async t=>{
 const secret='test-secret-'.repeat(4),directory=await temporary(t);let closed=false,input='';
 const server=await createServer({secret,directory,targets:['rdp.example'],connector:opts=>{setImmediate(()=>{opts.onReady('uuid');opts.onData(instruction('sync',1));});return{close(){closed=true;},write(text){input+=text;},pause(){},resume(){}};}});server.listen(0,'127.0.0.1');await once(server,'listening');t.after(()=>{server.closeAllConnections();return new Promise(r=>server.close(r));});const base='http://127.0.0.1:'+server.address().port;
 const call=(url,{id='alice',data,mutate=false,time=String(Date.now()),signal}={})=>{const actor=Buffer.from(JSON.stringify({id,name:id})).toString('base64url'),method=data===undefined?'GET':'POST',bytes=data===undefined?'':JSON.stringify(data);return fetch(base+url,{method,headers:{'X-RDP-Actor':actor,'X-RDP-Time':time,'X-RDP-Signature':signature(secret,actor,time,method,url,bytes)},...(data===undefined?{}:{body:mutate?bytes+' ':bytes}),signal});};
 assert.equal((await fetch(base+'/profiles')).status,401);assert.equal((await call('/profiles',{time:String(Date.now()-60000)})).status,401);assert.equal((await call('/profiles',{data:profile,mutate:true})).status,401);
 assert.equal((await call('/sessions',{data:{...profile,hostname:'unauthorized.example'}})).status,403);
 const created=await (await call('/sessions',{data:profile})).json();assert.ok(created.id);assert.equal((await call('/close',{id:'bob',data:{session:created.id}})).status,404);
 const abort=new AbortController(),stream=await call('/stream?session='+created.id,{signal:abort.signal}),reader=stream.body.getReader();assert.equal(stream.status,200);assert.match(new TextDecoder().decode((await reader.read()).value),/sync/);
 assert.equal((await call('/stream?session='+created.id)).status,409);assert.equal((await call('/input',{data:{session:created.id,data:instruction('key',65,1)}})).status,200);assert.equal(input,instruction('key',65,1));
 abort.abort();await new Promise(r=>setTimeout(r,30));assert.equal(closed,true);assert.equal((await call('/close',{data:{session:created.id}})).status,404);
});
