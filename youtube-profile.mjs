import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
const queues=new Map();
export function youtubeChannel(value){
 if(!value||typeof value.url!=='string'||typeof(value.name??value.creator)!=='string')throw Error('Ungültiger Kanal.');
 const url=new URL(value.url,'https://www.youtube.com');
 if(!['www.youtube.com','youtube.com','m.youtube.com'].includes(url.hostname)||url.search||url.hash||!/^\/(?:channel\/[A-Za-z0-9_-]{1,100}|user\/[A-Za-z0-9_.-]{1,100}|c\/[A-Za-z0-9_.-]{1,100}|@[A-Za-z0-9_.-]{1,100})\/?$/.test(url.pathname))throw Error('Ungültige Kanaladresse.');
 const name=(value.name??value.creator).replace(/<[^>]*>/g,'').replace(/[\x00-\x1f]/g,'').trim().slice(0,200);if(!name)throw Error('Kanalname fehlt.');return{url:url.pathname.replace(/\/$/,''),name};
}
export function createYoutubeProfiles(directory){
 const file=id=>path.join(directory,'youtube',createHash('sha256').update(id).digest('hex')+'.json');
 async function read(id){try{const data=JSON.parse(await fs.readFile(file(id),'utf8'));return{revision:data.revision||0,subscriptions:data.subscriptions.map(youtubeChannel)};}catch(e){if(e.code==='ENOENT')return{revision:0,subscriptions:[]};throw e;}}
 return{read,async change(id,operation,channel){if(!['subscribe','unsubscribe'].includes(operation))throw Error('Ungültige Abo-Aktion.');channel=youtubeChannel(channel);const location=file(id),prior=queues.get(location)||Promise.resolve();const write=prior.catch(()=>{}).then(async()=>{const profile=await read(id),index=profile.subscriptions.findIndex(c=>c.url===channel.url);if(operation==='unsubscribe'){if(index>=0)profile.subscriptions.splice(index,1);}else{if(index>=0)profile.subscriptions[index]=channel;else{if(profile.subscriptions.length>=500)throw Error('Maximal 500 abonnierte Kanäle.');profile.subscriptions.unshift(channel);}}profile.revision++;await fs.mkdir(path.dirname(location),{recursive:true,mode:0o700});const temp=location+'.'+randomUUID()+'.tmp';try{await fs.writeFile(temp,JSON.stringify(profile),{mode:0o600});await fs.rename(temp,location);}finally{await fs.rm(temp,{force:true}).catch(()=>{});}return profile;});queues.set(location,write);try{return await write;}finally{if(queues.get(location)===write)queues.delete(location);}}};
}
