/**
 * Opt-in real-app browser regression. Run with:
 *   node --test recent-release-races.test.mjs
 * Requires the installed Playwright/Chromium under services/browser. It starts
 * an isolated temporary backend and does not use the live site or user data.
 * Keep it separate from the default CI test command, whose Docker image has no browser.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {chromium} from './services/browser/node_modules/playwright/index.mjs';

test('actual app startup restores a text document without adding a recent-history event',async()=>{
 const env={NODE_ENV:process.env.NODE_ENV,DATA_DIR:process.env.DATA_DIR,EXPLORER_ROOT:process.env.EXPLORER_ROOT};
 const temp=await mkdtemp(path.join(os.tmpdir(),'recent-restore-race-'));
 let server,browser;
 try{
  process.env.NODE_ENV='test';
  process.env.DATA_DIR=path.join(temp,'metadata');
  process.env.EXPLORER_ROOT=path.join(temp,'Explorer');
  ({server}=await import('./backend.mjs?recent-restore-race='+Date.now()));
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base='http://127.0.0.1:'+server.address().port;
  const call=(route,data,cookie='')=>fetch(base+route,{method:data===undefined?'GET':'POST',headers:{...(cookie?{cookie}:{}),'content-type':'application/json'},body:data===undefined?undefined:JSON.stringify(data)});
  const setup=await call('/api/setup',{username:'admin',password:'recent-restore-admin'});
  const admin=setup.headers.get('set-cookie').split(';')[0];
  await call('/api/users',{username:'alice',password:'recent-restore-alice'},admin);
  const signIn=async()=>{
   const response=await call('/api/login',{username:'alice',password:'recent-restore-alice'});
   assert.equal(response.status,200);
   return response.headers.get('set-cookie').split(';')[0];
  };
  const firstCookie=await signIn();
  const nodes=await (await call('/api/nodes',undefined,firstCookie)).json();
  const documents=nodes.nodes.find(node=>node.system&&node.space==='documents');
  const file=await (await call('/api/new-text',{parent:documents.id,name:'Restore-check.txt'},firstCookie)).json();
  const manualFile=await (await call('/api/new-text',{parent:documents.id,name:'Manual-open-check.txt'},firstCookie)).json();
  const locked=await call('/api/workspace-lock',{version:1,items:[{type:'document',id:file.id}]},firstCookie);
  assert.equal(locked.status,200);

  const cookie=await signIn(),[name,value]=cookie.split('=');
  browser=await chromium.launch({headless:true});
  const context=await browser.newContext();
  await context.addCookies([{name,value,domain:'127.0.0.1',path:'/',httpOnly:true,sameSite:'Strict'}]);
  const page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto(base+'/');
  await page.waitForFunction(()=>window.workspaceReady===true,{timeout:30000});
  assert.ok(await page.locator('dialog[id^="editor-window-"]').count()>0,'workspace file should be restored in the actual app');
  await page.waitForTimeout(150);
  const history=await (await call('/api/recent-items',undefined,cookie)).json();
  assert.equal(history.documents.length,0,'restored files must not be recorded as newly opened');
  assert.equal(errors.length,0,errors.join('\n'));

  const refreshedNodes=await (await call('/api/nodes',undefined,cookie)).json();
  const manualNode=refreshedNodes.nodes.find(node=>node.id===manualFile.id);
  assert.ok(manualNode?.path,'manual-open fixture should have a canonical route');
  await page.goto(base+manualNode.path);
  await page.waitForFunction(()=>window.workspaceReady===true,{timeout:30000});
  await page.locator('dialog[id^="editor-window-"]').waitFor({timeout:10000});
  let manualHistory;
  for(let attempt=0;attempt<20;attempt++){
   manualHistory=await (await call('/api/recent-items',undefined,cookie)).json();
   if(manualHistory.documents.length)break;
   await page.waitForTimeout(50);
  }
  assert.deepEqual(manualHistory.documents.map(entry=>entry.id),[manualFile.id],'a normal manual open must still record exactly once');
 }finally{
  await browser?.close();
  if(server?.listening)await new Promise(resolve=>server.close(resolve));
  await rm(temp,{recursive:true,force:true});
  for(const [key,value]of Object.entries(env))if(value===undefined)delete process.env[key];else process.env[key]=value;
 }
});
