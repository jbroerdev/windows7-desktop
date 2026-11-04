import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile,readdir} from 'node:fs/promises';
import {createHash,randomUUID} from 'node:crypto';
import path from 'node:path';
import os from 'node:os';
import {downloadSignature} from './browser-downloads.mjs';
test('browser downloads enter the initiating profile, preserve duplicates and reject forged or corrupt transfers',async t=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'browser-downloads-'));Object.assign(process.env,{NODE_ENV:'test',DATA_DIR:dir,EXPLORER_ROOT:path.join(dir,'Explorer'),BROWSER_SERVICE_SECRET:'browser-download-test-secret-123456789'});const {server}=await import('./backend.mjs');await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(async()=>{server.closeAllConnections();await new Promise(r=>server.close(r));await rm(dir,{recursive:true,force:true});});const base='http://127.0.0.1:'+server.address().port;
 const setup=await fetch(base+'/api/setup',{method:'POST',body:JSON.stringify({username:'admin',password:'download-test-password'})});const cookie=setup.headers.get('set-cookie').split(';')[0];const created=await fetch(base+'/api/computer-management',{method:'POST',headers:{cookie},body:JSON.stringify({action:'user-create',username:'alice',password:'alice-download-password'})});const alice=(await created.json()).users.find(u=>u.username==='alice');
 function headers({user=alice.id,name='Test.gpx',body='GPX fixture',id=randomUUID()}={}){const h={actor:Buffer.from(user).toString('base64url'),time:String(Date.now()),id,name:Buffer.from(name).toString('base64url'),size:String(Buffer.byteLength(body)),digest:createHash('sha256').update(body).digest('hex')};return{cookie,'x-browser-actor':h.actor,'x-browser-time':h.time,'x-download-id':h.id,'x-download-name':h.name,'x-download-size':h.size,'x-download-digest':h.digest,'x-download-signature':downloadSignature(process.env.BROWSER_SERVICE_SECRET,h)};}
 const transfer=async(h,body='GPX fixture')=>fetch(base+'/api/browser/import',{method:'POST',headers:h,body});const first=headers();assert.equal((await transfer(first)).status,201);assert.equal(await readFile(path.join(dir,'Explorer/Users/alice/Downloads/Test.gpx'),'utf8'),'GPX fixture');assert.deepEqual(await readdir(path.join(dir,'Explorer/Users/admin/Downloads')),[]);
 assert.equal((await transfer(headers())).status,201);assert.equal(await readFile(path.join(dir,'Explorer/Users/alice/Downloads/Test (1).gpx'),'utf8'),'GPX fixture');assert.equal((await transfer({...first,'x-browser-time':first['x-browser-time']})).status,201);assert.equal((await readdir(path.join(dir,'Explorer/Users/alice/Downloads'))).length,2);
 assert.equal((await transfer({...headers(),'x-browser-actor':Buffer.from('forged-user').toString('base64url')})).status,401);assert.equal((await transfer(headers(),'BAD fixture')).status,400);assert.equal((await transfer(headers({user:'missing-account'}))).status,403);
 assert.equal((await transfer(headers({name:'../../outside.txt'}))).status,201);assert.equal(await readFile(path.join(dir,'Explorer/Users/alice/Downloads/outside.txt'),'utf8'),'GPX fixture');assert.deepEqual(await readdir(path.join(dir,'files')),[]);
});
