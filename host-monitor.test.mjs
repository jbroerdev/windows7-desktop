import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {readHostMonitor} from './host-monitor.mjs';

test('Host-Monitor übernimmt nur aktuelle vollständige Snapshots',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'host-monitor-')),file=path.join(dir,'monitor.json'),now=Date.now();
 try{
  assert.equal(await readHostMonitor(file,now),null);
  const snapshot={version:1,generatedAt:new Date(now).toISOString(),host:{hostname:'Docker-Host',cpuPercent:24,totalMemory:1024},processes:[{pid:12,name:'dockerd'}],containers:[{name:'collabora',state:'running'}]};
  await writeFile(file,JSON.stringify(snapshot));assert.deepEqual(await readHostMonitor(file,now),snapshot);
  assert.equal(await readHostMonitor(file,now+16000),null);
  await writeFile(file,'{"version":1');assert.equal(await readHostMonitor(file,now),null);
  await writeFile(file,JSON.stringify({...snapshot,processes:null}));assert.equal(await readHostMonitor(file,now),null);
 }finally{await rm(dir,{recursive:true,force:true});}
});

test('Docker-Status und fremde Sitzungen bleiben auf Administratoren begrenzt',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'host-monitor-api-'));
 process.env.DATA_DIR=path.join(dir,'metadata');process.env.EXPLORER_ROOT=path.join(dir,'Explorer');process.env.NODE_ENV='test';
 const {server}=await import('./backend.mjs');await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin='http://127.0.0.1:'+server.address().port;
 async function request(route,data,cookie=''){return fetch(origin+route,{method:data?'POST':'GET',headers:{cookie,'Content-Type':'application/json'},body:data?JSON.stringify(data):undefined});}
 try{
  const setup=await request('/api/setup',{username:'admin',password:'monitor-admin-test-123'}),admin=setup.headers.get('set-cookie').split(';')[0];
  await writeFile(path.join(process.env.DATA_DIR,'host-monitor.json'),JSON.stringify({version:1,generatedAt:new Date().toISOString(),scope:'host',host:{hostname:'real-host',cpuPercent:23},processes:[],containers:[{name:'collabora',state:'running'}],interfaces:[],dockerAvailable:true}));
  const adminData=await(await request('/api/task-manager',undefined,admin)).json();assert.equal(adminData.scope,'host');assert.equal(adminData.containers[0].name,'collabora');assert.equal(adminData.canViewServices,true);
  await request('/api/users',{username:'normal',password:'monitor-normal-test-123'},admin);
  const login=await request('/api/login',{username:'normal',password:'monitor-normal-test-123'}),normal=login.headers.get('set-cookie').split(';')[0];
  const normalData=await(await request('/api/task-manager',undefined,normal)).json();assert.deepEqual(normalData.containers,[]);assert.equal(normalData.canViewServices,false);assert.deepEqual(normalData.users.map(u=>u.username),['normal']);
  const allUsers=await(await request('/api/task-manager',undefined,admin)).json();assert.deepEqual(allUsers.users.map(u=>u.username).sort(),['admin','normal']);
 }finally{await new Promise(resolve=>server.close(resolve));await rm(dir,{recursive:true,force:true});}
});
