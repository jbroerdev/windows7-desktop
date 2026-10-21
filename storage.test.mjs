import{test}from'node:test';
import assert from'node:assert/strict';
import{mkdtemp,rm,readFile,stat,writeFile,mkdir}from'node:fs/promises';
import os from'node:os';import path from'node:path';
import{createStorage}from'./storage.mjs';

test('Migration bevorzugt aktuelle Ordnerdateien vor alten ID-Sicherungen',async()=>{
const temp=await mkdtemp(path.join(os.tmpdir(),'explorer-migration-'));
try{
const metadataDir=path.join(temp,'metadata'),root=path.join(temp,'volume');
const db={users:[{id:'u',username:'alice'}],nodes:[{id:'f',owner:'u',parent:null,name:'Aktuell.txt',kind:'file'}]};
await mkdir(path.join(metadataDir,'files'),{recursive:true});
await mkdir(path.join(metadataDir,'Explorer','Users','alice'),{recursive:true});
await writeFile(path.join(metadataDir,'files','f'),'Veraltet');
await writeFile(path.join(metadataDir,'Explorer','Users','alice','Aktuell.txt'),'Aktuell');
const storage=createStorage({root,metadataDir,db});storage.initialize();
const dest=path.join(root,'Users','alice','Aktuell.txt');
assert.equal(await readFile(dest,'utf8'),'Aktuell');
await writeFile(dest,'Zieldatei');storage.initialize();
assert.equal(await readFile(dest,'utf8'),'Zieldatei');
}finally{await rm(temp,{recursive:true,force:true});}
});

test('Explorer-Volume: Standardordner, Upload, Editor, Rename und ZIP',async()=>{
const temp=await mkdtemp(path.join(os.tmpdir(),'explorer-volume-'));process.env.NODE_ENV='test';process.env.DATA_DIR=path.join(temp,'metadata');process.env.EXPLORER_ROOT=path.join(temp,'Explorer');
const{server}=await import('./backend.mjs');await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;let cookie='';
async function api(route,data){const r=await fetch(origin+route,{method:data===undefined?'GET':'POST',headers:{cookie,'Content-Type':'application/json'},body:data===undefined?undefined:JSON.stringify(data)});const result=await r.json();assert.ok(r.ok,JSON.stringify(result));return{result,response:r};}
try{
const setup=await api('/api/setup',{username:'admin',password:'volume-admin-password'});cookie=setup.response.headers.get('set-cookie').split(';')[0];
await api('/api/users',{username:'alice',password:'volume-alice-password'});
for(const username of['admin','alice'])for(const folder of['Desktop','Downloads','Documents','Music','Pictures','Videos'])assert.ok((await stat(path.join(process.env.EXPLORER_ROOT,'Users',username,folder))).isDirectory());
const folder=(await api('/api/folder',{name:'Projekt',space:'documents'})).result.id;
const uploaded=await fetch(origin+'/api/upload?'+new URLSearchParams({name:'Test.txt',parent:folder}),{method:'POST',headers:{cookie},body:'Original'});assert.equal(uploaded.status,201);const file=(await uploaded.json()).id;
const physical=path.join(process.env.EXPLORER_ROOT,'Users','admin','Documents','Projekt','Test.txt');assert.equal(await readFile(physical,'utf8'),'Original');
const text=(await api('/api/text?id='+file)).result;await api('/api/text',{id:file,content:'Bearbeitet',version:text.version});assert.equal(await readFile(physical,'utf8'),'Bearbeitet');
const zip=(await api('/api/zip',{id:folder})).result.id;assert.ok((await stat(path.join(process.env.EXPLORER_ROOT,'Users','admin','Documents','Projekt.zip'))).isFile());await api('/api/unzip',{id:zip,name:'Entpackt'});assert.equal(await readFile(path.join(process.env.EXPLORER_ROOT,'Users','admin','Documents','Entpackt','Projekt','Test.txt'),'utf8'),'Bearbeitet');
await api('/api/rename',{id:folder,name:'Neuer Name'});assert.equal(await readFile(path.join(process.env.EXPLORER_ROOT,'Users','admin','Documents','Neuer Name','Test.txt'),'utf8'),'Bearbeitet');assert.equal(await(await fetch(origin+'/download/'+file,{headers:{cookie}})).text(),'Bearbeitet');
const link=await api('/api/link',{name:'Website',url:'https://example.com',space:'documents'});assert.ok(link.result.ok);const nodes=(await api('/api/nodes')).result.nodes;await api('/api/rename',{id:nodes.find(n=>n.kind==='link').id,name:'Neue Website'});

// Public access must disappear for revoked inherited items and entire subtrees.
await api('/api/share',{id:folder,shared:true});
assert.equal((await fetch(origin+'/download/'+file)).status,200);
await api('/api/share',{id:file,shared:false});
assert.equal((await fetch(origin+'/download/'+file)).status,404);
await api('/api/share',{id:file,shared:true});
assert.equal((await fetch(origin+'/download/'+file)).status,200);
await api('/api/share',{id:folder,shared:false});
assert.equal((await fetch(origin+'/download/'+file)).status,404);
// Ordinary users can delete their own data, but never someone else's or system folders.
const adminCookie=cookie;
const login=await api('/api/login',{username:'alice',password:'volume-alice-password'});
cookie=login.response.headers.get('set-cookie').split(';')[0];
let denied=await fetch(origin+'/api/delete',{method:'POST',headers:{cookie,'Content-Type':'application/json'},body:JSON.stringify({id:folder})});assert.equal(denied.status,404);
const aliceNodes=(await api('/api/nodes')).result.nodes;
const hostFolder=path.join(process.env.EXPLORER_ROOT,'Users','alice','Documents','Vom Host','Unterordner');
await mkdir(hostFolder,{recursive:true});await writeFile(path.join(hostFolder,'Notiz.txt'),'Host-Inhalt');
await new Promise(resolve=>setTimeout(resolve,2100));
let discovered=(await api('/api/nodes')).result.nodes;
const imported=discovered.find(n=>n.name==='Notiz.txt');assert.ok(imported);
assert.equal(discovered.find(n=>n.id===imported.parent).name,'Unterordner');
assert.equal(imported.path,'/C/Users/alice/Documents/Vom%20Host/Unterordner/Notiz.txt');
assert.equal(imported.shared,false);assert.equal(imported.effectiveShared,false);
assert.equal((await fetch(origin+'/download/'+imported.id)).status,404);
assert.equal(await(await fetch(origin+'/download/'+imported.id,{headers:{cookie}})).text(),'Host-Inhalt');
assert.ok((await(await fetch(origin+'/api/nodes',{headers:{cookie:adminCookie}})).json()).nodes.some(n=>n.id===imported.id&&!n.writable));
await api('/api/share',{id:discovered.find(n=>n.name==='Vom Host').id,shared:true});
await writeFile(path.join(hostFolder,'Später.txt'),'Nachträglich');
await writeFile(path.join(hostFolder,'Notiz.txt'),'Aktualisierter Host-Inhalt');
await new Promise(resolve=>setTimeout(resolve,2100));
const publicList=(await(await fetch(origin+'/api/nodes')).json()).nodes;
assert.ok(publicList.some(n=>n.name==='Später.txt'));
discovered=(await api('/api/nodes')).result.nodes;
assert.equal(discovered.find(n=>n.id===imported.id).size,Buffer.byteLength('Aktualisierter Host-Inhalt'));
assert.equal(discovered.find(n=>n.name==='Später.txt').shared,false);
assert.equal(discovered.find(n=>n.name==='Später.txt').effectiveShared,true);

denied=await fetch(origin+'/api/delete',{method:'POST',headers:{cookie,'Content-Type':'application/json'},body:JSON.stringify({id:aliceNodes.find(n=>n.system&&!n.programRoot).id})});assert.equal(denied.status,400);
// A listing during a streamed upload must not import the unfinished file.
let uploadController;
const streamingBody=new ReadableStream({start(controller){uploadController=controller;controller.enqueue(Buffer.from('Beginn'));}});
const streamingUpload=fetch(origin+'/api/upload?name=Laufend.txt&space=documents',{method:'POST',headers:{cookie},body:streamingBody,duplex:'half'});
const streamingPath=path.join(process.env.EXPLORER_ROOT,'Users','alice','Documents','Laufend.txt');
for(let attempt=0;attempt<100;attempt++){try{await stat(streamingPath);break;}catch{await new Promise(resolve=>setTimeout(resolve,10));}}
await new Promise(resolve=>setTimeout(resolve,2100));
assert.ok(!(await api('/api/nodes')).result.nodes.some(n=>n.name==='Laufend.txt'));
uploadController.enqueue(Buffer.from(' Ende'));uploadController.close();
assert.equal((await streamingUpload).status,201);
assert.equal((await api('/api/nodes')).result.nodes.filter(n=>n.name==='Laufend.txt').length,1);
const ownFolder=(await api('/api/folder',{name:'Loeschen',space:'documents'})).result.id;
const ownUpload=await fetch(origin+'/api/upload?'+new URLSearchParams({name:'Eigen.txt',parent:ownFolder}),{method:'POST',headers:{cookie},body:'Test'});assert.equal(ownUpload.status,201);
const ownFile=(await ownUpload.json()).id;
await api('/api/delete',{id:ownFile});
await assert.rejects(stat(path.join(process.env.EXPLORER_ROOT,'Users','alice','Documents','Loeschen','Eigen.txt')),{code:'ENOENT'});
await api('/api/delete',{id:ownFolder});
await assert.rejects(stat(path.join(process.env.EXPLORER_ROOT,'Users','alice','Documents','Loeschen')),{code:'ENOENT'});

// Move folders, files and virtual links together while preserving IDs and ownership.
const musicId=(await api('/api/nodes')).result.nodes.find(n=>n.system&&n.space==='music').id;
const docsId=(await api('/api/nodes')).result.nodes.find(n=>n.system&&n.space==='documents').id;
const movingFolder=(await api('/api/folder',{name:'Verschieben',space:'documents'})).result.id;
const movingFile=(await api('/api/new-text',{name:'Quelle.txt',parent:movingFolder})).result.id;
await api('/api/link',{name:'Move-Link',url:'https://example.com',space:'documents'});
const movingLink=(await api('/api/nodes')).result.nodes.find(n=>n.name==='Move-Link').id;
await api('/api/share',{id:musicId,shared:true});
const moved=await api('/api/move',{ids:[movingFolder,movingFile,movingLink],parent:musicId});assert.equal(moved.result.moved,2);
assert.ok((await stat(path.join(process.env.EXPLORER_ROOT,'Users','alice','Music','Verschieben','Quelle.txt'))).isFile());
await assert.rejects(stat(path.join(process.env.EXPLORER_ROOT,'Users','alice','Documents','Verschieben')),{code:'ENOENT'});
let movedNodes=(await api('/api/nodes')).result.nodes;
assert.equal(movedNodes.find(n=>n.id===movingFile).path,'/C/Users/alice/Music/Verschieben/Quelle.txt');
assert.equal(movedNodes.find(n=>n.id===movingLink).parent,musicId);
assert.equal(movedNodes.find(n=>n.id===movingFile).effectiveShared,true);
async function rejectedMove(ids,parent,status){const r=await fetch(origin+'/api/move',{method:'POST',headers:{cookie,'Content-Type':'application/json'},body:JSON.stringify({ids,parent})});assert.equal(r.status,status);}
await rejectedMove([musicId],docsId,400);
await rejectedMove([movingFolder],movingFolder,400);
const nested=(await api('/api/folder',{name:'Tiefer',parent:movingFolder})).result.id;
await rejectedMove([movingFolder],nested,400);
await rejectedMove([movingFolder],folder,404);
await rejectedMove([folder],docsId,404);
await api('/api/new-text',{name:'Move-Link',space:'documents'});
await rejectedMove([movingFolder,movingLink],docsId,409);
assert.equal((await api('/api/nodes')).result.nodes.find(n=>n.id===movingFolder).parent,musicId);
assert.ok((await stat(path.join(process.env.EXPLORER_ROOT,'Users','alice','Music','Verschieben'))).isDirectory());
await api('/api/move',{ids:[movingFolder],parent:'@home'});
movedNodes=(await api('/api/nodes')).result.nodes;
assert.equal(movedNodes.find(n=>n.id===movingFile).effectiveShared,false);
assert.equal(movedNodes.find(n=>n.id===movingFile).path,'/C/Users/alice/Verschieben/Quelle.txt');
assert.equal((await api('/api/move',{ids:[movingFolder],parent:'@home'})).result.moved,0);
cookie=adminCookie;await api('/api/share',{id:folder,shared:true});await api('/api/delete',{id:folder});
await assert.rejects(stat(path.join(process.env.EXPLORER_ROOT,'Users','admin','Documents','Neuer Name')),{code:'ENOENT'});
assert.equal((await fetch(origin+'/download/'+file)).status,404);
assert.ok(!(await api('/api/nodes')).result.nodes.some(n=>n.id===file||n.id===folder));
}finally{await new Promise(r=>server.close(r));await rm(temp,{recursive:true,force:true});}
});

test('Explorer-Dateisystem importiert Dateien privat und übernimmt alte ID-Dateien',async()=>{
const temp=await mkdtemp(path.join(os.tmpdir(),'explorer-import-'));try{const root=path.join(temp,'Explorer'),metadataDir=path.join(temp,'metadata'),db={users:[{id:'u1',username:'alice'}],nodes:[{id:'docs',owner:'u1',parent:null,name:'Documents',kind:'folder',space:'documents',system:true},{id:'old',owner:'u1',parent:'docs',name:'Alt.txt',kind:'file',size:3,space:'documents'}]};await mkdir(path.join(metadataDir,'files'),{recursive:true});await writeFile(path.join(metadataDir,'files','old'),'Alt');const storage=createStorage({root,metadataDir,db});storage.initialize();assert.equal(await readFile(path.join(root,'Users','alice','Documents','Alt.txt'),'utf8'),'Alt');await writeFile(path.join(root,'Users','alice','Documents','Vom Host.txt'),'Privat');assert.equal(storage.initialize(),true);assert.equal(db.nodes.find(n=>n.name==='Vom Host.txt').shared,false);assert.throws(()=>storage.path({id:'escape',owner:'u1',parent:'docs',name:'../escape',kind:'file'}));}finally{await rm(temp,{recursive:true,force:true});}
});
