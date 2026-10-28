import {promises as fs} from 'node:fs';
import path from 'node:path';
import {createHash,randomBytes} from 'node:crypto';

const hash=value=>createHash('sha256').update(value).digest('hex');
// All records, including headers, folder names and MIME sources, are encrypted.
export function mailCache({directory,seal,open,maxBytes=128*1024*1024,maxEntries=2000}){
 const queues=new Map();
 const root=user=>path.join(directory,'cache',hash(user));
 const file=(user,scope,key)=>path.join(root(user),hash(scope)+'-'+hash(key)+'.json');
 async function serial(user,fn){const next=(queues.get(user)||Promise.resolve()).catch(()=>{}).then(fn);queues.set(user,next);try{return await next;}finally{if(queues.get(user)===next)queues.delete(user);}}
 return{
  async get(user,scope,key){try{return open(await fs.readFile(file(user,scope,key),'utf8'));}catch{return null;}},
  async set(user,scope,key,value){return serial(user,async()=>{const bytes=seal(value);if(Buffer.byteLength(bytes)>maxBytes)return;await fs.mkdir(root(user),{recursive:true});const dest=file(user,scope,key),temp=dest+'.tmp-'+randomBytes(4).toString('hex');await fs.writeFile(temp,bytes,{mode:0o600});await fs.rename(temp,dest);const entries=await Promise.all((await fs.readdir(root(user))).filter(n=>n.endsWith('.json')).map(async n=>{const p=path.join(root(user),n),s=await fs.stat(p);return{p,size:s.size,time:s.mtimeMs};}));let total=entries.reduce((n,e)=>n+e.size,0),count=entries.length;for(const e of entries.sort((a,b)=>a.time-b.time)){if(total<=maxBytes&&count<=maxEntries)break;await fs.unlink(e.p);total-=e.size;count--;}});},
  async clear(user,scope){return serial(user,async()=>{let names;try{names=await fs.readdir(root(user));}catch(e){if(e.code==='ENOENT')return;throw e;}for(const name of names)if(name.startsWith(hash(scope)+'-'))await fs.unlink(path.join(root(user),name));});}
 };
}

// A foreground lane stays available while prefetch downloads on its own lane.
// Commands on each connection run serially; failed connections are never reused.
export function imapPool({factory,options,idleMs=20000}){
 const entries=new Map();let closed=false;
 const identity=a=>JSON.stringify([a._owner,a.id,a.imap,a.username,a.password]);
 return{
  async run(a,fn,lane='foreground'){
   if(closed)throw Error('Mail service closed');
   if(!a.id){const c=factory(options(a));c.on?.('error',()=>{});try{await c.connect();return await fn(c);}finally{await c.logout().catch(()=>{});}}
   const key=hash(identity(a))+':'+lane;let entry=entries.get(key);
   if(!entry){entry={tail:Promise.resolve(),client:null,timer:null,owner:a._owner,id:a.id};entries.set(key,entry);}
   const task=entry.tail.catch(()=>{}).then(async()=>{clearTimeout(entry.timer);try{if(!entry.client){const c=factory(options(a));c.on?.('error',()=>{});c.on?.('close',()=>{if(entry.client===c)entry.client=null;});entry.client=c;await c.connect();}return await fn(entry.client);}catch(e){entry.client?.close?.();entry.client=null;throw e;}finally{entry.timer=setTimeout(()=>{if(entries.get(key)!==entry)return;entries.delete(key);const c=entry.client;entry.client=null;c?.logout().catch(()=>{});},idleMs);entry.timer.unref?.();}});
   entry.tail=task;return task;
  },
  async drop(a){for(const [k,e]of entries){if(e.owner!==a._owner||e.id!==a.id)continue;await e.tail.catch(()=>{});clearTimeout(e.timer);entries.delete(k);await e.client?.logout().catch(()=>{});e.client=null;}},
  async close(){closed=true;await Promise.allSettled([...entries.values()].map(e=>e.tail));await Promise.allSettled([...entries.values()].map(async e=>{clearTimeout(e.timer);await e.client?.logout();}));entries.clear();}
 };
}
