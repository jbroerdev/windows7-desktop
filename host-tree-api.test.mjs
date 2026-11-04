import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,stat,rm} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import os from 'node:os';
import path from 'node:path';

test('Linux: real recursive HostFiles transfers merge, move and retain skipped profile files',{skip:process.platform!=='linux'},async()=>{
 const temp=await mkdtemp(path.join(os.tmpdir(),'windows7-tree-api-')),socket=path.join(temp,'agent.sock');process.env.DATA_DIR=path.join(temp,'metadata');process.env.EXPLORER_ROOT=path.join(temp,'Explorer');process.env.NODE_ENV='test';process.env.HOST_AGENT_SOCKET=socket;
 const agent=spawn('python3',['scripts/host-files-fixture.py',socket,path.join(temp,'journal')],{stdio:['ignore','pipe','pipe']});let errors='';agent.stderr.on('data',bytes=>errors+=bytes);
 let server;
 const hostSource=path.join(temp,'host','Bundle');
 try{
  await Promise.race([once(agent.stdout,'data'),once(agent,'exit').then(()=>{throw Error(errors||'agent exited');}),new Promise((_,reject)=>{const timer=setTimeout(()=>reject(Error('agent timeout')),5000);timer.unref();})]);
  await mkdir(path.join(hostSource,'Nested'),{recursive:true});await mkdir(path.join(hostSource,'Empty'));await writeFile(path.join(hostSource,'a.txt'),'alpha');await writeFile(path.join(hostSource,'Nested','b.txt'),'beta');
  ({server}=await import('./backend.mjs'));await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port;let cookie='';
  const request=async(route,data)=>{const response=await fetch(base+route,{method:data===undefined?'GET':'POST',headers:{cookie,'Content-Type':'application/json'},body:data===undefined?undefined:JSON.stringify(data)});const value=await response.json();assert.ok(response.ok,JSON.stringify(value));return value;};
  const setup=await fetch(base+'/api/setup',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:'admin',password:'tree-api-admin-password'})});cookie=setup.headers.get('set-cookie').split(';')[0];const nodes=()=>request('/api/nodes');
  let list=(await nodes()).nodes;const documents=list.find(n=>n.system&&n.space==='documents'),target=(await request('/api/folder',{parent:documents.id,name:'TreeTarget'})).id;
  const transfer=async data=>{const preview=await request('/api/host-transfer',data);assert.equal(preview.tree,true);return request('/api/host-transfer',{...data,confirmed:true,sourceVersion:preview.sourceVersion});};
  await transfer({id:'host:'+hostSource,parent:target,name:'Bundle',mode:'copy'});
  const profileRoot=path.join(process.env.EXPLORER_ROOT,'Users/admin/Documents/TreeTarget/Bundle');assert.equal(await readFile(path.join(profileRoot,'Nested/b.txt'),'utf8'),'beta');assert.ok((await stat(path.join(profileRoot,'Empty'))).isDirectory());
  list=(await nodes()).nodes;const bundle=list.find(n=>n.name==='Bundle'&&n.parent===target);assert.ok(bundle);assert.equal(list.filter(n=>n.parent===bundle.id).length,3);
  // Existing profile entries must merge by their physical/metadata identity.
  await writeFile(path.join(hostSource,'fresh.txt'),'fresh');const data={id:'host:'+hostSource,parent:target,name:'Bundle',mode:'copy'},preview=await request('/api/host-transfer',data);assert.equal(preview.conflicts.length,2);
  const choices=Object.fromEntries(preview.conflicts.map(c=>[c.relative,{action:'skip',version:c.existing.version}]));await request('/api/host-transfer',{...data,choices,sourceVersion:preview.sourceVersion,confirmed:true});assert.equal(await readFile(path.join(profileRoot,'fresh.txt'),'utf8'),'fresh');
  const back=path.join(temp,'back');await mkdir(back);await transfer({id:bundle.id,parent:'host:'+back,name:'Moved',mode:'move'});assert.equal(await readFile(path.join(back,'Moved/Nested/b.txt'),'utf8'),'beta');await assert.rejects(stat(profileRoot),e=>e.code==='ENOENT');assert.equal((await nodes()).nodes.some(n=>n.id===bundle.id),false);
 }finally{if(server)await new Promise(resolve=>server.close(resolve));if(agent.exitCode===null&&agent.signalCode===null){const stopped=once(agent,'exit');agent.kill();await stopped.catch(()=>{});}await rm(temp,{recursive:true,force:true});}
});
