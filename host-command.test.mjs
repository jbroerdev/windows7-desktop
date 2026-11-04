import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {hostCommand,hostTerminal} from './host-command.mjs';
test('host command role comes from the authenticated user, never from request data',async()=>{const socket=process.platform==='win32'?'\\\\.\\pipe\\windows7-host-test-'+randomUUID():path.join(os.tmpdir(),'w7-host-'+randomUUID()+'.sock'),seen=[];const server=http.createServer(async(req,res)=>{let raw='';for await(const chunk of req)raw+=chunk;seen.push(JSON.parse(raw));res.end(JSON.stringify({output:'fixture',exitCode:0}));});await new Promise(r=>server.listen(socket,r));try{assert.throws(()=>hostCommand(null,{command:'hostname',cwd:'/'},{socket}),e=>e.status===401);assert.throws(()=>hostCommand({role:'admin',shareEditing:true},{command:'hostname',cwd:'/'},{socket}),e=>e.status===401);await hostCommand({role:'user'},{command:'hostname',cwd:'/',admin:true},{socket});assert.equal(seen[0].admin,false);await hostCommand({role:'admin'},{command:'hostname',cwd:'/'},{socket});assert.equal(seen[1].admin,true);assert.throws(()=>hostCommand({role:'admin'},{command:123,cwd:'/'},{socket}),e=>e.status===400);}finally{await new Promise(r=>server.close(r));}});


test('terminal sessions bind ownership and privilege to authenticated server identity',async()=>{
 const socket=process.platform==='win32'?'\\\\.\\pipe\\windows7-terminal-test-'+randomUUID():path.join(os.tmpdir(),'w7-terminal-'+randomUUID()+'.sock'),seen=[];
 const server=http.createServer(async(req,res)=>{let raw='';for await(const chunk of req)raw+=chunk;seen.push({path:req.url,...JSON.parse(raw)});res.end(JSON.stringify({sessionId:'12345678-1234-1234-1234-123456789abc'}));});await new Promise(r=>server.listen(socket,r));
 try{
  assert.throws(()=>hostTerminal({role:'admin'},'start',{command:'hostname',cwd:'/'},{socket}),e=>e.status===401);
  await hostTerminal({id:'alice',role:'user'},'start',{command:'hostname',cwd:'/',owner:'admin',admin:true},{socket});assert.equal(seen[0].owner,'alice');assert.equal(seen[0].admin,false);assert.equal(seen[0].path,'/sessions/start');
  await hostTerminal({id:'bob',role:'admin'},'poll',{sessionId:'12345678-1234-1234-1234-123456789abc',offset:5,owner:'alice'},{socket});assert.equal(seen[1].owner,'bob');assert.equal(seen[1].offset,5);
  assert.throws(()=>hostTerminal({id:'alice',role:'user'},'poll',{sessionId:'invalid',offset:-1},{socket}),e=>e.status===400);
 }finally{await new Promise(r=>server.close(r));}
});
