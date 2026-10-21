import assert from 'node:assert/strict';
if(process.env.EXPLORER_SMOKE_TEST!=='1')throw Error('Only for a fresh CI container.');
let cookie='';
async function api(route,data){const r=await fetch('http://127.0.0.1:3000'+route,{method:data===undefined?'GET':'POST',headers:{cookie,'Content-Type':'application/json'},body:data===undefined?undefined:JSON.stringify(data)});const result=await r.json();assert.ok(r.ok,JSON.stringify(result));if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];return result;}
await api('/api/setup',{username:'docker-test',password:'docker-smoke-test-password'});
const {nodes}=await api('/api/nodes'),documents=nodes.find(n=>n.system&&n.space==='documents'),disk=nodes.find(n=>n.driveRoot&&n.letter==='D');assert.ok(disk);
const {id}=await api('/api/new-text',{parent:documents.id,name:'Docker-Test.txt'});
let text=await api('/api/text?id='+id);await api('/api/text',{id,content:'Across real filesystems',version:text.version});
await api('/api/move',{ids:[id],parent:disk.id});
assert.equal((await api('/api/text?id='+id)).content,'Across real filesystems');
await api('/api/copy',{ids:[id],parent:documents.id});
await api('/api/delete',{id});let bin=(await api('/api/trash')).entries;assert.equal(bin.length,1);
await api('/api/trash-restore',{id:bin[0].id});assert.equal((await api('/api/text?id='+id)).content,'Across real filesystems');
await api('/api/delete',{id});bin=(await api('/api/trash')).entries;await api('/api/trash-purge',{id:bin[0].id});
const {drives}=await api('/api/drives');assert.ok(drives.find(d=>d.letter==='D').available);assert.ok(drives.every(d=>d.totalBytes>0));
console.log('Docker: real cross-filesystem move, copy, recycle, restore and capacity passed.');
