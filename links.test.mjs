import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import {scryptSync} from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import {launchRoute} from './public/launch-route.js';

test('Alte Proxy-Verknüpfungen bleiben direkte Apps; Weiterleitung und Proxy-Oberfläche sind entfernt',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'direct-app-links-'));
 Object.assign(process.env,{DATA_DIR:dir,EXPLORER_ROOT:path.join(dir,'Explorer'),NODE_ENV:'test'});
 const user={id:'a'.repeat(32),username:'admin',role:'admin',salt:'test-salt',password:scryptSync('direct-link-password','test-salt',64).toString('hex')};
 const legacy={id:'b'.repeat(32),owner:user.id,parent:null,space:'desktop',name:'Vorhandene App',kind:'link',url:'http://127.0.0.1:8790/',openInWindow:true,appMode:true,proxyEnabled:true,shared:true};
 await writeFile(path.join(dir,'database.json'),JSON.stringify({schema:2,users:[user],nodes:[legacy]}));
 const {server}=await import('./backend.mjs');await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const base='http://127.0.0.1:'+server.address().port;let cookie='';
 const api=(route,data)=>fetch(base+route,{method:data===undefined?'GET':'POST',headers:{cookie,'Content-Type':'application/json'},body:data===undefined?undefined:JSON.stringify(data)});
 try{
  const login=await api('/api/login',{username:'admin',password:'direct-link-password'});cookie=login.headers.get('set-cookie').split(';')[0];
  const nodes=(await(await api('/api/nodes')).json()).nodes,link=nodes.find(n=>n.id===legacy.id);
  assert.equal(link.url,legacy.url);assert.equal(link.appMode,true);assert.equal(link.openInWindow,true);assert.ok(!('proxyEnabled' in link));
  assert.ok(!(await api('/api/proxy-launch?id='+legacy.id)).ok);
  assert.equal((await api('/app/vorhandene-app/'+'c'.repeat(64)+'/')).status,404);
  assert.equal((await api('/app/vorhandene-app/'+'c'.repeat(64)+'/__desktop_storage/local')).status,404);
  assert.equal(launchRoute('/app/vorhandene-app'),null);
  assert.equal(launchRoute('/notepad/C/Users/admin/Documents/Test.txt').app,'editor');
  const html=await(await api('/')).text();assert.doesNotMatch(html,/linkproxy|Über Server-Proxy/);
  const source=await(await api('/app.js')).text();assert.doesNotMatch(source,/proxy-launch|linkproxy|__desktopProxy/);
  assert.equal((await api('/api/link',{id:legacy.id,name:legacy.name,url:'https://example.org',openInWindow:true,appMode:true})).status,200);
  const stored=JSON.parse(await readFile(path.join(dir,'database.json'),'utf8')).nodes.find(n=>n.id===legacy.id);
  assert.ok(!('proxyEnabled' in stored));assert.equal(stored.url,'https://example.org/');
 }finally{await new Promise(r=>server.close(r));await rm(dir,{recursive:true,force:true});}
});
