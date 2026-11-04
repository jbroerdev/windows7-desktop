import test from 'node:test';
import assert from 'node:assert/strict';
import {createHostTerminal} from './public/host-terminal.js';
const id='12345678-1234-1234-1234-123456789abc';
test('host terminal streams output, persists cursors and asks before mutations',async()=>{
 const seen=[],out=[],states=[];let polls=0,confirmations=0;
 const client=createHostTerminal({onState:s=>states.push(s),sleep:async()=>{},confirm:async preview=>{confirmations++;assert.equal(preview,'touch /tmp/example');return true;},api:async(url,data)=>{seen.push([url,data]);if(url.endsWith('/start'))return data.confirmed?{sessionId:id,cwd:'/tmp'}:{requiresConfirmation:true,preview:'touch /tmp/example'};polls++;return polls===1?{output:'first',offset:5,status:'running',cwd:'/tmp'}:{output:' second\n',offset:13,status:'completed',exitCode:0,cwd:'/tmp'};}});
 const result=await client.run('touch example','/tmp',{onOutput:x=>out.push(x)});assert.deepEqual(out,['first',' second\n']);assert.equal(confirmations,1);assert.equal(result.exitCode,0);assert.equal(client.snapshot(),null);assert.ok(states.some(s=>s?.offset===5));assert.equal(seen.filter(([u])=>u.endsWith('/start')).length,2);
});
test('host terminal resumes at saved offset without replaying output',async()=>{
 let request;const out=[],client=createHostTerminal({confirm:async()=>true,api:async(url,data)=>{request=data;return{output:'tail',offset:14,status:'completed',exitCode:2,cwd:'/'};}});
 const result=await client.resume({sessionId:id,offset:10,cwd:'/'},{onOutput:x=>out.push(x)});assert.equal(request.offset,10);assert.deepEqual(out,['tail']);assert.equal(result.exitCode,2);
});
test('host terminal cancellation targets the current server session',async()=>{
 const controller=new AbortController(),seen=[];let polls=0;
 const client=createHostTerminal({confirm:async()=>true,sleep:async()=>controller.abort(),api:async(url,data)=>{seen.push([url,data]);if(url.endsWith('/start'))return{sessionId:id,cwd:'/'};if(url.endsWith('/cancel'))return{requested:true};return{output:'',offset:0,status:++polls===1?'running':'cancelled',exitCode:130,cwd:'/'};}});
 const result=await client.run('long command','/',{signal:controller.signal});assert.equal(result.exitCode,130);assert.ok(seen.some(([url,data])=>url.endsWith('/cancel')&&data.sessionId===id));
});
test('cancelled confirmation never starts a privileged command',async()=>{
 const calls=[],client=createHostTerminal({confirm:async()=>false,api:async(url,data)=>{calls.push(data);return{requiresConfirmation:true,preview:'a change'};}});const result=await client.run('change','/');assert.equal(result.exitCode,130);assert.equal(calls.length,1);
});


test('reconnection metadata stores no output and remains tied to its profile key',async()=>{
 const values=new Map(),storage={getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};let profile='alice';
 const client=createHostTerminal({storage,key:()=>profile,confirm:async()=>true,sleep:async()=>{},api:async(url,data)=>{if(url.endsWith('/start'))return{sessionId:id,cwd:'/'};throw Object.assign(Error('offline'),{status:503});}});
 await assert.rejects(client.run('hostname','/'),/offline/);assert.equal(client.saved().sessionId,id);assert.ok(!values.get('alice').includes('output'));profile='bob';assert.equal(client.saved(),null);profile='alice';
 const restored=createHostTerminal({storage,key:()=>profile,confirm:async()=>true,api:async()=>({output:'',offset:0,status:'completed',exitCode:0,cwd:'/'})});await restored.resume(restored.saved());assert.equal(values.has('alice'),false);
});
