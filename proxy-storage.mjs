import {promises as fs} from 'node:fs';
import path from 'node:path';
export function createProxyStorage(directory){
 const locks=new Map(),limit=5*1024*1024;
 async function read(grant,area){if(area==='session'||!grant.userId)return grant[area]||{};try{return JSON.parse(await fs.readFile(path.join(directory,grant.userId,grant.node,area+'.json'),'utf8'));}catch(error){if(error.code==='ENOENT')return {};throw error;}}
 async function mutate(grant,area,change){const key=(grant.userId||grant.prefix)+':'+grant.node+':'+area,prior=locks.get(key)||Promise.resolve();let release;const gate=new Promise(r=>release=r);locks.set(key,gate);await prior;try{const values=await read(grant,area),data=Object.assign(Object.create(null),values);if(change.op==='clear')for(const k of Object.keys(data))delete data[k];else if(change.op==='remove')delete data[String(change.key)];else if(change.op==='set')data[String(change.key)]=String(change.value);else throw Object.assign(Error('Ungültiger Speicherbefehl.'),{status:400});const json=JSON.stringify(data);if(Buffer.byteLength(json)>limit)throw Object.assign(Error('App-Speicher ist voll (5 MB).'),{status:413});if(grant.userId&&area==='local'){const folder=path.join(directory,grant.userId,grant.node);await fs.mkdir(folder,{recursive:true});const temp=path.join(folder,'local.tmp');await fs.writeFile(temp,json);await fs.rename(temp,path.join(folder,'local.json'));}else grant[area]=data;return data;}finally{release();if(locks.get(key)===gate)locks.delete(key);}}
 return {read:async(g,area)=>area==='session'?(g.session||{}):read(g,area),mutate};
}
