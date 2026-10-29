import {promises as fs} from 'node:fs';
import path from 'node:path';
import {randomBytes,randomUUID,createCipheriv,createDecipheriv} from 'node:crypto';
const fail=(message,status=400)=>{throw Object.assign(Error(message),{status});};
const text=(v,max=200)=>typeof v==='string'?v.trim().slice(0,max):'';
const sameIdentity=(a,b)=>a&&a.hostname===b.hostname&&a.port===b.port&&a.username===b.username&&a.domain===b.domain;
const host=v=>{const h=text(v,253).toLowerCase();if(!h||! /^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/.test(h))fail('Bitte einen gültigen Computernamen oder eine IPv4-Adresse eingeben.');return h;};
export function normalizeProfile(data={}){
 const port=Number(data.port??3389),width=Number(data.width??1280),height=Number(data.height??800);
 if(!Number.isInteger(port)||port<1||port>65535||!Number.isInteger(width)||width<640||width>3840||!Number.isInteger(height)||height<480||height>2160)fail('Ungültiger Port oder Bildschirmgröße.');
 if(!['nla','tls','rdp','any'].includes(data.security??'nla'))fail('Ungültige Verbindungssicherheit.');
 if(data.password!==undefined&&(typeof data.password!=='string'||data.password.length>1024))fail('Ungültiges Kennwort.');
 return{name:text(data.name)||text(data.hostname),hostname:host(data.hostname),port,username:text(data.username),domain:text(data.domain),width,height,colorDepth:data.colorDepth===16?16:data.colorDepth===24?24:32,security:data.security??'nla',ignoreCertificate:data.ignoreCertificate===true,clipboard:data.clipboard!==false,audio:data.audio===true,...(data.password?{password:data.password}:{})};
}
export function targetAllowed(profile,targets){return targets.some(value=>value==='*'||value.toLowerCase()===profile.hostname+':'+profile.port||value.toLowerCase()===profile.hostname&&profile.port===3389);}
export async function createStore({directory,targets=[]}){
 await fs.mkdir(directory,{recursive:true});const keyPath=path.join(directory,'encryption.key');let key;
 try{key=await fs.readFile(keyPath);}catch(e){if(e.code!=='ENOENT')throw e;await fs.writeFile(keyPath,randomBytes(32),{flag:'wx',mode:0o600}).catch(e=>{if(e.code!=='EEXIST')throw e;});key=await fs.readFile(keyPath);}
 if(key.length!==32)throw Error('Invalid RDP storage key');
 const file=path.join(directory,'profiles.json');let profiles={};
 try{const v=JSON.parse(await fs.readFile(file,'utf8')),dec=createDecipheriv('aes-256-gcm',key,Buffer.from(v.iv,'base64'));dec.setAuthTag(Buffer.from(v.tag,'base64'));profiles=JSON.parse(Buffer.concat([dec.update(Buffer.from(v.data,'base64')),dec.final()]).toString());}catch(e){if(e.code!=='ENOENT')throw e;}
 let queue=Promise.resolve();
 const save=()=>{const snapshot=JSON.stringify(profiles);queue=queue.catch(()=>{}).then(async()=>{const iv=randomBytes(12),enc=createCipheriv('aes-256-gcm',key,iv),data=Buffer.concat([enc.update(snapshot),enc.final()]);await fs.writeFile(file+'.tmp',JSON.stringify({iv:iv.toString('base64'),tag:enc.getAuthTag().toString('base64'),data:data.toString('base64')}),{mode:0o600});await fs.rename(file+'.tmp',file);});return queue;};
 const redact=p=>{const{password,...rest}=p;return{...rest,hasPassword:!!password};};
 const owned=(actor,id)=>{const p=profiles[actor]?.find(p=>p.id===id);if(!p)fail('Verbindung nicht gefunden.',404);return p;};
 return{
  list:actor=>({profiles:(profiles[actor]||[]).map(redact),targetsConfigured:targets.length>0}),
  async put(actor,data){const previous=data.id?owned(actor,data.id):null,list=profiles[actor]||[];if(!previous&&list.length>=50)fail('Maximal 50 gespeicherte Verbindungen erlaubt.');const p={...normalizeProfile(data),id:previous?.id||randomUUID()};if(data.savePassword===true){if(!p.password&&previous?.password&&sameIdentity(previous,p))p.password=previous.password;}else delete p.password;profiles[actor]=[...list.filter(v=>v.id!==p.id),p];await save();return redact(p);},
  async remove(actor,id){owned(actor,id);profiles[actor]=profiles[actor].filter(p=>p.id!==id);await save();return{ok:true};},
  connection(actor,data){const saved=data.profileId?owned(actor,data.profileId):{};const p=normalizeProfile({...saved,...data,password:data.password});if(!p.password&&saved.password&&sameIdentity(saved,p))p.password=saved.password;if(!targetAllowed(p,targets))fail('Dieser Computer wurde noch nicht vom Administrator für Remotedesktop freigegeben.',403);if(!p.username)fail('Bitte einen Benutzernamen eingeben.');return p;},
  close:()=>queue
 };
}
