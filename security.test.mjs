import test from 'node:test';import assert from 'node:assert/strict';import {mkdtemp,rm} from 'node:fs/promises';import os from 'node:os';import path from 'node:path';
test('Security page password change checks the old secret, preserves current login and revokes others',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'win7-security-'));Object.assign(process.env,{DATA_DIR:dir,EXPLORER_ROOT:path.join(dir,'Explorer'),NODE_ENV:'test'});const {server}=await import('./backend.mjs');await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 const req=(url,data,cookie='')=>fetch(base+url,{method:data===undefined?'GET':'POST',headers:{cookie,'Content-Type':'application/json'},...(data===undefined?{}:{body:JSON.stringify(data)})});const cookie=r=>r.headers.get('set-cookie').split(';')[0];
 try{const credentials={username:'admin',password:'security-original-password'},first=cookie(await req('/api/setup',credentials)),other=cookie(await req('/api/login',credentials));
  assert.equal((await req('/api/change-password',{currentPassword:credentials.password,newPassword:'security-new-password'})).status,401);
  assert.equal((await req('/api/change-password',{currentPassword:'wrong',newPassword:'security-new-password'},first)).status,401);
  assert.equal((await req('/api/change-password',{currentPassword:credentials.password,newPassword:'short'},first)).status,400);
  assert.equal((await req('/api/change-password',{currentPassword:credentials.password,newPassword:'security-new-password'},first)).status,200);
  assert.equal((await(await req('/api/session',undefined,first)).json()).authenticated,true);assert.equal((await(await req('/api/session',undefined,other)).json()).authenticated,false);
  assert.equal((await req('/api/login',credentials)).status,401);assert.equal((await req('/api/login',{...credentials,password:'security-new-password'})).status,200);
  const html=await(await req('/login',undefined,first)).text();for(const id of ['security-lock','security-switch','security-password','security-taskmanager','security-cancel'])assert.ok(html.includes('id="'+id+'"'));
 }finally{await new Promise(r=>server.close(r));await rm(dir,{recursive:true,force:true});}
});
