import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {transcodeArguments} from './media-transcode.mjs';
import {createOffice} from './office.mjs';
test('Lock persists private drafts, revokes profile sessions and resumes with a fresh login',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'win7-workspace-'));process.env.DATA_DIR=dir;process.env.EXPLORER_ROOT=path.join(dir,'Explorer');process.env.NODE_ENV='test';
 const {server}=await import('./backend.mjs');await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
 const req=(url,data,cookie='')=>fetch(origin+url,{method:data===undefined?'GET':'POST',headers:{'Content-Type':'application/json',cookie},...(data===undefined?{}:{body:JSON.stringify(data)})});
 const cookie=r=>r.headers.get('set-cookie').split(';')[0];
 try{
  const credentials={username:'admin',password:'workspace-test-password'};
  const first=cookie(await req('/api/setup',credentials)),otherSession=cookie(await req('/api/login',credentials));
  await req('/api/users',{username:'alice',password:'alice-workspace-password'},first);
  const alice=cookie(await req('/api/login',{username:'alice',password:'alice-workspace-password'}));
  assert.equal((await req('/api/workspace')).status,401);
  assert.equal((await req('/api/workspace-lock',{version:1,items:[{type:'invalid'}]},first)).status,400);
  assert.equal((await (await req('/api/session',undefined,first)).json()).authenticated,true);
  assert.equal((await req('/api/desktop',{startPins:['browser','editor','browser']},first)).status,200);
  assert.deepEqual((await(await req('/api/session',undefined,first)).json()).desktop.startPins,['browser','editor']);
  assert.equal((await(await req('/api/session',undefined,alice)).json()).desktop.startPins,undefined);
  assert.equal((await req('/api/desktop',{startPins:[{}]},first)).status,400);
  assert.equal((await req('/api/desktop',{scope:'share',startPins:[]},alice)).status,403);
  assert.equal((await req('/api/desktop',{startPins:[]},first)).status,200);
  assert.deepEqual((await(await req('/api/session',undefined,first)).json()).desktop.startPins,[]);
  const appearance={color:'#AA3377',intensity:65,transparency:true};
  assert.equal((await req('/api/desktop',{appearance},first)).status,200);
  assert.deepEqual((await(await req('/api/session',undefined,first)).json()).desktop.appearance,{...appearance,color:'#aa3377'});
  assert.equal((await(await req('/api/session',undefined,alice)).json()).desktop.appearance,undefined);
  assert.equal((await req('/api/desktop',{appearance:{...appearance,color:'red;display:none'}},first)).status,400);
  assert.equal((await req('/api/desktop',{scope:'share',appearance},alice)).status,403);
  assert.equal((await req('/api/desktop',{scope:'share',appearance},first)).status,200);
  assert.equal((await(await req('/api/session')).json()).publicDesktop.appearance.color,'#aa3377');
  assert.equal((await req('/appearance.js')).status,200);
  const snapshot={version:1,items:[{type:'editor',name:'Unbenannt.txt',content:'Privater ungespeicherter Text',original:'',geometry:{left:.2,top:.1,width:.5,height:.6,mode:'maximized'}},{type:'instance',app:'media',state:{media:{time:123.5,paused:true}}}]};
  assert.equal((await req('/api/workspace-lock',snapshot,first)).status,200);
  for(const session of [first,otherSession])assert.equal((await (await req('/api/session',undefined,session)).json()).authenticated,false);
  assert.deepEqual(await (await req('/api/workspace',undefined,alice)).json(),{version:1,items:[]});
  const fresh=cookie(await req('/api/login',credentials));assert.deepEqual(await (await req('/api/workspace',undefined,fresh)).json(),snapshot);
  const db=JSON.parse(await readFile(path.join(dir,'database.json'),'utf8'));assert.deepEqual(db.users.find(u=>u.username==='admin').workspace,snapshot);
  await req('/api/logout',{},fresh);const next=cookie(await req('/api/login',credentials));assert.deepEqual(await (await req('/api/workspace',undefined,next)).json(),{version:1,items:[]});
 }finally{await new Promise(r=>server.close(r));await rm(dir,{recursive:true,force:true});}
});
test('FFmpeg resumes at the saved timestamp before opening the input',()=>{
 const args=transcodeArguments('/movie.mkv',false,{threads:2,width:1280,height:720,startSeconds:123.5});assert.equal(args[args.indexOf('-ss')+1],'123.5');assert.ok(args.indexOf('-ss')<args.indexOf('-i'));
 assert.ok(!transcodeArguments('/movie.mkv',false,{threads:2,width:1280,height:720,startSeconds:NaN}).includes('-ss'));
});
test('Private Office checkpoint survives restart and belongs only to its owner',async()=>{
 const metadataDir=await mkdtemp(path.join(os.tmpdir(),'win7-office-workspace-'));
 const owner={id:'owner',username:'owner'},other={id:'other',username:'other'};
 const options={metadataDir,get:()=>null,readable:()=>false,owned:()=>false,filePath:()=>'',save:async()=>{},resolveSession:()=>owner,runLocked:(_,fn)=>fn(),config:{OFFICE_URL:'https://office.example.org',EXPLORER_PUBLIC_URL:'https://explorer.example.org'}};
 try{let office=await createOffice(options);const draft=await office.newDraft('text',owner,'old-session');const bytes=Buffer.from('private unsaved document bytes');await writeFile(path.join(metadataDir,'office-drafts',draft.id),bytes);const checkpoint=await office.checkpoint(draft.id,owner,'old-session');
  office=await createOffice(options);await assert.rejects(()=>office.resume(checkpoint.id,other,'new-session'),/nicht gefunden/);const resumed=await office.resume(checkpoint.id,owner,'new-session');assert.equal(resumed.temporary,true);assert.deepEqual(await office.draftBytes(resumed.id,owner,'new-session'),bytes);await assert.rejects(()=>office.draftBytes(resumed.id,owner,'old-session'),/nicht gefunden/);
 }finally{await rm(metadataDir,{recursive:true,force:true});}
});
