import sanitizeHtml from 'sanitize-html';
import {createCipheriv,createDecipheriv,randomBytes,createHash} from 'node:crypto';
import {promises as fs} from 'node:fs';
import path from 'node:path';
import {ImapFlow} from 'imapflow';
import nodemailer from 'nodemailer';
import {simpleParser} from 'mailparser';
import {mailCache,imapPool} from './cache.mjs';
import {createCalendarService} from './calendar.mjs';

export class MailError extends Error{constructor(message,status=400){super(message);this.status=status;}}
const fail=(text,status)=>{throw new MailError(text,status);};
const text=(v,max=300)=>typeof v==='string'&&v.length<=max?v:'';
const host=v=>{v=text(v,253).trim();if(!v||! /^[a-z0-9][a-z0-9.-]*[a-z0-9]$/i.test(v))fail('Bitte einen gültigen Servernamen eingeben.');return v;};
export function validateAccount(v){
 if(!v||typeof v!=='object')fail('Ungültiges E-Mail-Konto.');
 const email=text(v.email).trim();if(!/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(email))fail('Bitte eine gültige E-Mail-Adresse eingeben.');
 const server=(s,kind)=>{if(!s||!['tls','starttls'].includes(s.security)||!Number.isInteger(Number(s.port))||Number(s.port)<1||Number(s.port)>65535)fail('Ungültige '+kind+'-Servereinstellungen.');return{host:host(s.host),port:Number(s.port),security:s.security};};
 if(/[\r\n\0]/.test(v.name||''))fail('Ungültiger Anzeigename.');const username=text(v.username,320).trim()||email,password=text(v.password,4096);if(!password)fail('Bitte das Kennwort eingeben.');
 const specialFolders={};for(const k of ['sent','trash','junk']){const value=v.folders?.[k];if(value!==undefined&&(typeof value!=='string'||value.length>500||/[\r\n\0]/.test(value)))fail('Ungültiger IMAP-Ordner.');if(value)specialFolders[k]=value;}
 return{email,label:text(v.label,100).trim()||email,folders:specialFolders,name:text(v.name,100).trim()||email,username,password:v.imap?.host?.toLowerCase()==='imap.gmail.com'&&v.smtp?.host?.toLowerCase()==='smtp.gmail.com'?password.replace(/\s+/g,''):password,remember:v.remember!==false,imap:server(v.imap,'IMAP'),smtp:server(v.smtp,'SMTP')};
}
export function encrypt(value,key){const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key,iv),bytes=Buffer.concat([cipher.update(JSON.stringify(value),'utf8'),cipher.final()]);return JSON.stringify({iv:iv.toString('base64'),tag:cipher.getAuthTag().toString('base64'),data:bytes.toString('base64')});}
export function decrypt(value,key){const v=JSON.parse(value),dec=createDecipheriv('aes-256-gcm',key,Buffer.from(v.iv,'base64'));dec.setAuthTag(Buffer.from(v.tag,'base64'));return JSON.parse(Buffer.concat([dec.update(Buffer.from(v.data,'base64')),dec.final()]).toString('utf8'));}
const publicAccount=a=>{const{password,...safe}=a;return safe;};
export async function createMailService({directory,imapFactory=options=>new ImapFlow(options),smtpFactory=options=>nodemailer.createTransport(options),cacheTtl=15000,prefetchCount=10,onBackgroundError=()=>{}}={}){
 await fs.mkdir(directory,{recursive:true});let key;const keyFile=path.join(directory,'encryption.key');try{key=await fs.readFile(keyFile);}catch(e){if(e.code!=='ENOENT')throw e;key=randomBytes(32);try{await fs.writeFile(keyFile,key,{flag:'wx',mode:0o600});}catch(e){if(e.code!=='EEXIST')throw e;key=await fs.readFile(keyFile);}}if(key.length!==32)throw Error('Invalid mail encryption key.');
 const ephemeral=new Map(),queues=new Map(),htmlCache=new Map();
 const cache=mailCache({directory,seal:v=>encrypt(v,key),open:v=>decrypt(v,key)}),jobs=new Map(),prefetches=new Map(),sourceJobs=new Map();
 const scope=a=>JSON.stringify([a.id,a.email,a.username,a.imap]);
 async function refresh(a,k,fn){const jobKey=JSON.stringify([a._owner,scope(a),k]);if(jobs.has(jobKey))return jobs.get(jobKey);const task=Promise.resolve().then(fn).then(async value=>{await cache.set(a._owner,scope(a),k,{time:Date.now(),value});return value;});jobs.set(jobKey,task);try{return await task;}finally{if(jobs.get(jobKey)===task)jobs.delete(jobKey);}}
 async function cached(a,k,ttl,fn,force=false){const entry=await cache.get(a._owner,scope(a),k);if(!entry||force)return refresh(a,k,fn);if(Math.max(0,Date.now()-entry.time)>ttl)refresh(a,k,fn).catch(onBackgroundError);return entry.value;}
 const file=user=>path.join(directory,createHash('sha256').update(user).digest('hex')+'.json');
 async function read(user){try{return decrypt(await fs.readFile(file(user),'utf8'),key);}catch(e){if(e.code==='ENOENT')return{accounts:[],drafts:[],settings:{reading:'right',calendar:true,compact:false}};throw e;}}
 async function write(user,value){const temp=file(user)+'.tmp-'+randomBytes(4).toString('hex');await fs.writeFile(temp,encrypt(value,key),{mode:0o600});await fs.rename(temp,file(user));}
 async function mutate(user,fn){const prev=queues.get(user)||Promise.resolve(),next=prev.catch(()=>{}).then(async()=>{const db=await read(user),result=await fn(db);await write(user,db);return result;});queues.set(user,next);try{return await next;}finally{if(queues.get(user)===next)queues.delete(user);}}
 const calendars=createCalendarService({directory,read,mutate,seal:v=>encrypt(v,key),open:v=>decrypt(v,key)});
 async function account(user,id){const a=(await read(user)).accounts.find(a=>a.id===id);if(!a)fail('E-Mail-Konto nicht gefunden.',404);const pass=a.password||ephemeral.get(user+':'+id);if(!pass)fail('Bitte das Kennwort für dieses Konto erneut eingeben.',428);return{...a,password:pass,_owner:user};}
 const options=a=>({host:a.imap.host,port:a.imap.port,secure:a.imap.security==='tls',doSTARTTLS:a.imap.security==='starttls'?true:undefined,auth:{user:a.username,pass:a.password},logger:false,connectionTimeout:15000,greetingTimeout:15000,socketTimeout:45000,disableAutoIdle:true});
 const smtpOptions=a=>({host:a.smtp.host,port:a.smtp.port,secure:a.smtp.security==='tls',requireTLS:a.smtp.security==='starttls',auth:{user:a.username,pass:a.password},connectionTimeout:15000,greetingTimeout:15000,socketTimeout:45000,disableFileAccess:true,disableUrlAccess:true,logger:false});
 const pool=imapPool({factory:imapFactory,options});
 const withImap=(a,fn,lane)=>pool.run(a,fn,lane);
 async function mailbox(c,folder,fn){const lock=await c.getMailboxLock(folder||'INBOX');try{return await fn(c);}finally{lock.release();}}
 async function folders(c){const list=await c.list();return list.filter(f=>!f.flags?.has('\\Noselect')).map(f=>({path:f.path,name:f.name,specialUse:f.specialUse,delimiter:f.delimiter}));}
 const folderKey=folder=>'mailbox:'+JSON.stringify(folder||'INBOX');
 const sourceKey=(folder,validity,uid)=>'source:'+JSON.stringify([folder||'INBOX',validity,String(uid)]);
 async function source(a,folder,uid,lane='foreground',maxSize=30*1024*1024){
  const state=await cache.get(a._owner,scope(a),folderKey(folder));
  if(state){const hit=await cache.get(a._owner,scope(a),sourceKey(folder,state.validity,uid));if(hit)return Buffer.from(hit.source,'base64');}
  const jobKey=JSON.stringify([a._owner,scope(a),folder,uid]);if(sourceJobs.has(jobKey))return sourceJobs.get(jobKey);
  const task=withImap(a,c=>mailbox(c,folder,async()=>{
   const validity=String(c.mailbox?.uidValidity||'unknown');
   if(!state||state.validity!==validity)await cache.set(a._owner,scope(a),folderKey(folder),{validity});
   const hit=await cache.get(a._owner,scope(a),sourceKey(folder,validity,uid));if(hit)return Buffer.from(hit.source,'base64');
   const meta=await c.fetchOne(Number(uid),{size:true},{uid:true});if(!meta)fail('Nachricht nicht gefunden.',404);if(meta.size>maxSize)fail('Diese Nachricht ist größer als das Downloadlimit.',413);
   const m=await c.fetchOne(Number(uid),{source:true},{uid:true});if(!m)fail('Nachricht nicht gefunden.',404);if(m.source.length>maxSize)fail('Diese Nachricht ist größer als das Downloadlimit.',413);
   await cache.set(a._owner,scope(a),sourceKey(folder,validity,uid),{source:m.source.toString('base64')});return m.source;
  }),lane);sourceJobs.set(jobKey,task);try{return await task;}finally{if(sourceJobs.get(jobKey)===task)sourceJobs.delete(jobKey);}
 }
 function prefetch(a,folder,messages){const k=JSON.stringify([a._owner,scope(a),folder]);if(prefetches.has(k)||!prefetchCount)return;const task=(async()=>{for(const m of messages.slice(0,prefetchCount)){if(m.size>2*1024*1024)continue;try{await source(a,folder,m.uid,'background',2*1024*1024);}catch{/* A bad or large message must not prevent the remaining prefetch. */}}})();prefetches.set(k,task);task.finally(()=>prefetches.delete(k)).catch(()=>{});}
 async function clearCache(a){await Promise.allSettled([...jobs.values(),...prefetches.values(),...sourceJobs.values()]);await pool.drop(a);await cache.clear(a._owner,scope(a));for(const k of htmlCache.keys()){const [user,id]=JSON.parse(k);if(user===a._owner&&id===a.id)htmlCache.delete(k);}}
 return{published:(...args)=>calendars.published(...args),async flush(){await Promise.allSettled([...jobs.values(),...prefetches.values(),...sourceJobs.values()]);},async close(){await this.flush();await pool.close();},async handle(user,method,route,q,data={}){
  if(route==='/calendars'||route.startsWith('/calendar/'))return calendars.handle(user,method,route,q,data);
  if(route==='/state'&&method==='GET'){const db=await read(user);return{accounts:db.accounts.map(publicAccount),drafts:db.drafts.map(({body,attachments,...d})=>d),settings:{quickViews:true,statusBar:true,...db.settings}};}
  if(route==='/settings'&&method==='POST')return mutate(user,db=>{const s=data;if(!['right','bottom','off'].includes(s.reading)||typeof s.calendar!=='boolean'||typeof s.compact!=='boolean')fail('Ungültige Ansicht.');return db.settings={reading:s.reading,calendar:s.calendar,compact:s.compact,quickViews:s.quickViews!==false,statusBar:s.statusBar!==false};});
  if(route==='/accounts'&&method==='POST'){
   const a=validateAccount(data.id&&!data.password?{...data,password:(await account(user,data.id)).password}:data);await withImap(a,c=>c.list());const transport=smtpFactory(smtpOptions(a));try{await transport.verify();}finally{transport.close?.();}
   if(data.id){const old=(await read(user)).accounts.find(a=>a.id===data.id);if(!old)fail('E-Mail-Konto nicht gefunden.',404);await clearCache({...old,password:old.password||ephemeral.get(user+':'+old.id),_owner:user});}
   return mutate(user,db=>{if(db.accounts.length>=10&&!data.id)fail('Maximal zehn E-Mail-Konten.');const old=data.id&&db.accounts.find(a=>a.id===data.id);if(data.id&&!old)fail('E-Mail-Konto nicht gefunden.',404);const saved={...a,id:old?.id||randomBytes(16).toString('hex')};ephemeral.set(user+':'+saved.id,a.password);if(!a.remember)delete saved.password;db.accounts=db.accounts.filter(v=>v.id!==saved.id);db.accounts.push(saved);return publicAccount(saved);});
  }
  if(route==='/accounts/remove'&&method==='POST'){const old=(await read(user)).accounts.find(a=>a.id===data.id);if(!old)fail('E-Mail-Konto nicht gefunden.',404);await clearCache({...old,_owner:user});return mutate(user,db=>{db.accounts=db.accounts.filter(a=>a.id!==data.id);ephemeral.delete(user+':'+data.id);return{ok:true};});}
  if(route==='/drafts'&&method==='POST')return mutate(user,db=>{if(db.drafts.length>=100&&!data.id)fail('Maximal 100 Entwürfe.');const draft=validateMessage(data),id=data.id||randomBytes(16).toString('hex');if(data.id&&!db.drafts.some(d=>d.id===id))fail('Entwurf nicht gefunden.',404);db.drafts=db.drafts.filter(d=>d.id!==id);db.drafts.push({...draft,id,date:new Date().toISOString()});return{id};});
  if(route==='/drafts'&&method==='GET'){const d=(await read(user)).drafts.find(d=>d.id===q.get('id'));if(!d)fail('Entwurf nicht gefunden.',404);return d;}
  if(route==='/drafts/remove'&&method==='POST')return mutate(user,db=>{db.drafts=db.drafts.filter(d=>d.id!==data.id);return{ok:true};});
  const id=q.get('account')||data.account,a=await account(user,id);
  if(q.get('validity')){const current=await cache.get(user,scope(a),folderKey(q.get('folder')));if(current&&q.get('validity')!==current.validity)fail('Der Ordner wurde neu aufgebaut. Bitte die Nachrichtenliste aktualisieren.',409);}
  const htmlKey=async()=>JSON.stringify([user,id,q.get('folder'),(await cache.get(user,scope(a),folderKey(q.get('folder'))))?.validity,q.get('uid')]);
  const revision=(await cache.get(user,scope(a),'revision'))?.value||'initial';
  const invalidate=()=>cache.set(user,scope(a),'revision',{value:randomBytes(8).toString('hex')});
  if(route==='/folders'&&method==='GET')return cached(a,'folders:'+revision,60000,()=>withImap(a,folders),q.get('refresh')==='1');
  if(route==='/messages'&&method==='GET'){
   const page=Math.max(0,Math.min(10000,Number(q.get('page'))||0)),search=q.get('search')?.slice(0,300)||'',unread=q.get('unread')==='1',folder=q.get('folder')||'INBOX',pageKey='page:'+JSON.stringify([folder,page,search,unread,revision]);
   const load=()=>withImap(a,c=>mailbox(c,folder,async()=>{
    const validity=String(c.mailbox?.uidValidity||'unknown'),prior=await cache.get(user,scope(a),pageKey),known=new Map(prior?.value?.validity===validity?prior.value.messages.map(m=>[m.uid,m]):[]);
    await cache.set(user,scope(a),folderKey(folder),{validity});
    const criteria={...(search?{text:search}:{}),...(unread?{seen:false}:{})},all=await c.search(Object.keys(criteria).length?criteria:{all:true},{uid:true}),ids=(all||[]).slice().sort((a,b)=>b-a).slice(page*50,page*50+50),messages=new Map(ids.filter(id=>known.has(id)).map(id=>[id,{...known.get(id)}])),missing=ids.filter(id=>!known.has(id)),existing=ids.filter(id=>known.has(id));
    if(missing.length)for await(const m of c.fetch(missing,{envelope:true,flags:true,size:true},{uid:true})){const e=m.envelope||{};messages.set(m.uid,{uid:m.uid,subject:e.subject||'(Kein Betreff)',from:e.from||[],to:e.to||[],date:e.date,seen:m.flags.has('\\Seen'),flagged:m.flags.has('\\Flagged'),size:m.size});}
    if(existing.length)for await(const m of c.fetch(existing,{flags:true},{uid:true})){const old=messages.get(m.uid);if(old){old.seen=m.flags.has('\\Seen');old.flagged=m.flags.has('\\Flagged');}}
    return{total:(all||[]).length,page,validity,messages:[...messages.values()].sort((a,b)=>b.uid-a.uid)};
   }));let result=await cached(a,pageKey,cacheTtl,load,q.get('refresh')==='1');const current=await cache.get(user,scope(a),folderKey(folder));if(current&&current.validity!==result.validity)result=await refresh(a,pageKey,load);prefetch(a,folder,result.messages);return result;
  }
  if(route==='/message-html'&&method==='GET'){let key=await htmlKey(),entry=htmlCache.get(key);if(!entry||Date.now()-entry.time>120000){await this.handle(user,'GET','/message',q);key=await htmlKey();entry=htmlCache.get(key);}return{htmlPage:entry.html};}
  if(route==='/message'&&method==='GET'){const bytes=await source(a,q.get('folder'),q.get('uid')),m=await simpleParser(bytes,{skipHtmlToText:false,skipTextToHtml:true,maxHtmlLengthToParse:2*1024*1024});refresh(a,'seen:'+JSON.stringify([q.get('folder'),q.get('uid')]),()=>withImap(a,c=>mailbox(c,q.get('folder'),async()=>{await c.messageFlagsAdd(q.get('uid'),['\\Seen'],{uid:true});return true;}))).catch(()=>{});const result={uid:Number(q.get('uid')),subject:m.subject||'(Kein Betreff)',from:m.from?.text||'',to:m.to?.text||'',cc:m.cc?.text||'',date:m.date,messageId:m.messageId,replyTo:m.replyTo?.text||m.from?.text||'',text:m.text||'',html:m.html?sanitizeHtml(m.html,{allowedTags:sanitizeHtml.defaults.allowedTags.concat(['img']),allowedAttributes:{...sanitizeHtml.defaults.allowedAttributes,'*':['style'],a:['href','name','target','rel'],img:['src','alt','width','height']},allowedSchemes:['http','https','mailto','data'],allowedSchemesByTag:{img:['data']},transformTags:{a:sanitizeHtml.simpleTransform('a',{target:'_blank',rel:'noopener noreferrer'})}}):'',attachments:m.attachments.map((x,i)=>({index:i,name:x.filename||'Anhang',type:x.contentType,size:x.size}))};const escape=v=>String(v).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');const html='<!doctype html><html><head><meta charset="utf-8"><style>body{font:14px Segoe UI,Arial,sans-serif;color:#111;margin:15px;overflow-wrap:anywhere}pre{white-space:pre-wrap}img{max-width:100%}</style></head><body>'+(result.html||'<pre>'+escape(result.text)+'</pre>')+'</body></html>';if(htmlCache.size>=32)htmlCache.delete(htmlCache.keys().next().value);htmlCache.set(await htmlKey(),{html,time:Date.now()});return result;}
  if(route==='/export'&&method==='GET')return{binary:await source(a,q.get('folder'),q.get('uid')),name:'Nachricht.eml',type:'message/rfc822'};
  if(route==='/import'&&method==='POST'){
   if(!Array.isArray(data.messages)||!data.messages.length||data.messages.length>20)fail('Bitte bis zu 20 EML-Dateien auswählen.');let total=0;const sources=[];for(const item of data.messages){if(typeof item!=='string'||!/^[A-Za-z0-9+/]*={0,2}$/.test(item))fail('Ungültige EML-Datei.');const bytes=Buffer.from(item,'base64');total+=bytes.length;if(total>20*1024*1024)fail('Importdateien dürfen zusammen maximal 20 MB groß sein.',413);if(!/^(From|Subject|Date|MIME-Version|Received|Return-Path|To|Message-ID):/im.test(bytes.subarray(0,16384).toString()))fail('Diese Datei enthält keine gültige E-Mail.');sources.push(bytes);}
   let imported=0;try{await withImap(a,async c=>{for(const bytes of sources){await c.append(data.folder||'INBOX',bytes,[]);imported++;}});}catch{await invalidate();fail(imported+' von '+sources.length+' Nachrichten importiert. Der Import wurde unterbrochen; bereits importierte Nachrichten bleiben erhalten.',502);}await invalidate();return{ok:true,imported};
  }
  if(route==='/forward'&&method==='GET'){const m=await simpleParser(await source(a,q.get('folder'),q.get('uid')));return{attachments:m.attachments.map(x=>({name:x.filename||'Anhang',type:x.contentType,data:x.content.toString('base64')}))};}
  if(route==='/attachment'&&method==='GET'){const m=await simpleParser(await source(a,q.get('folder'),q.get('uid'))),attachment=m.attachments[Number(q.get('index'))];if(!attachment)fail('Anhang nicht gefunden.',404);return{binary:attachment.content,name:attachment.filename||'Anhang',type:attachment.contentType};}
  if(route==='/flags'&&method==='POST'){const result=await withImap(a,c=>mailbox(c,data.folder,async()=>{const flag=data.flag==='flagged'?'\\Flagged':'\\Seen';await(data.value?c.messageFlagsAdd(data.uid,[flag],{uid:true}):c.messageFlagsRemove(data.uid,[flag],{uid:true}));return{ok:true};}));await invalidate();return result;}
  if(route==='/move'&&method==='POST'){const result=await withImap(a,c=>mailbox(c,data.folder,async()=>{let target=data.target||a.folders?.trash;if(!target){const list=await c.list();target=list.find(f=>f.specialUse==='\\Trash')?.path;if(!target){target='Deleted Items';await c.mailboxCreate(target);}}await c.messageMove(data.uid,target,{uid:true});return{ok:true};}));await invalidate();return result;}
  if(route==='/folders'&&method==='POST'){const result=await withImap(a,async c=>{const name=text(data.name,200).trim();if(!name||/[\r\n\0]/.test(name))fail('Ungültiger Ordnername.');await c.mailboxCreate(name);return{ok:true};});await invalidate();return result;}
  if(route==='/send'&&method==='POST'){
   const m=validateMessage(data);if(!m.to.trim()&&!m.cc.trim()&&!m.bcc.trim())fail('Bitte einen Empfänger eingeben.');
   const attachments=m.attachments.map(x=>({filename:x.name,content:Buffer.from(x.data,'base64'),contentType:x.type})),message={from:{name:a.name,address:a.email},to:m.to,cc:m.cc,bcc:m.bcc,subject:m.subject,text:m.body,attachments,...(m.inReplyTo?{inReplyTo:m.inReplyTo,references:m.inReplyTo}:{})};
   const transport=smtpFactory(smtpOptions(a));let sent;try{sent=await transport.sendMail(message);}finally{transport.close?.();}
   let warning=sent.rejected?.length?'Einige Empfänger wurden vom Server abgewiesen: '+sent.rejected.join(', '):'';try{const raw=await nodemailer.createTransport({streamTransport:true,buffer:true,newline:'windows'}).sendMail({...message,messageId:sent.messageId});await withImap(a,async c=>{const list=await c.list();let folder=a.folders?.sent||list.find(f=>f.specialUse==='\\Sent')?.path;if(!folder){folder='Sent';await c.mailboxCreate(folder);}await c.append(folder,raw.message,['\\Seen']);});}catch{warning='Die Nachricht wurde versendet, konnte aber nicht im Ordner „Gesendet“ abgelegt werden.';}
   if(data.id)await mutate(user,db=>{db.drafts=db.drafts.filter(d=>d.id!==data.id);});await invalidate();return{ok:true,messageId:sent.messageId,warning};
  }
  fail('Unbekannte Mailfunktion.',404);
 }};
}
export function validateMessage(v){for(const[key,max]of [['to',4000],['cc',4000],['bcc',4000],['subject',1000],['body',2*1024*1024],['inReplyTo',1000]])if(v[key]!==undefined&&(typeof v[key]!=='string'||v[key].length>max))fail('Das Nachrichtenfeld „'+key+'“ ist ungültig oder zu groß.');const result={account:text(v.account,80),to:text(v.to,4000),cc:text(v.cc,4000),bcc:text(v.bcc,4000),subject:text(v.subject,1000),body:text(v.body,2*1024*1024),inReplyTo:text(v.inReplyTo,1000),attachments:[]};if([result.to,result.cc,result.bcc,result.subject,result.inReplyTo].some(s=>/[\r\n\0]/.test(s)))fail('Ungültige Nachrichtenkopfzeile.');if(!Array.isArray(v.attachments)||v.attachments.length>20)fail('Maximal 20 Anhänge.');let total=0;for(const a of v.attachments){if(!a||typeof a.data!=='string'||!/^[A-Za-z0-9+/]*={0,2}$/.test(a.data))fail('Ungültiger Anhang.');const bytes=Buffer.from(a.data,'base64');total+=bytes.length;if(total>20*1024*1024)fail('Anhänge dürfen zusammen maximal 20 MB groß sein.',413);result.attachments.push({name:text(a.name,200).replace(/[\r\n\0]/g,'')||'Anhang',type:text(a.type,100)||'application/octet-stream',data:a.data});}return result;}
