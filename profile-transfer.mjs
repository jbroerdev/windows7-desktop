import path from 'node:path';
import {promises as fs,createReadStream,createWriteStream} from 'node:fs';
import {Transform} from 'node:stream';
import {pipeline,finished} from 'node:stream/promises';
import {createHash,createHmac,randomBytes} from 'node:crypto';

export function createProfileTransfers({db,storage,id,get,owned,readable,target,creationOwner,spaceOf,save,operations,metadataDir,locked,receipts,assertUnlocked=()=>{},protect=()=>{}}){
 const journalDir=path.join(metadataDir,'profile-transfers'),physical=node=>storage.path(node,{ensure:false}),versionKey=randomBytes(32);
 const fail=(message,status=409)=>{throw Object.assign(Error(message),{status});};
 const valid=name=>typeof name==='string'&&name&&name.length<=180&&name===name.trim()&&!['.','..'].includes(name)&&!/[\\/\x00-\x1f<>:"|?*]/.test(name)&&!/^\.windows7-upload-[a-f0-9]{32}$/.test(name);
 const copyFields=(node,user)=>{const result=structuredClone(node);delete result.proxyEnabled;if(node.owner!==user.id&&!owned(node,user)&&!(user.role==='admin'&&!user.shareEditing)){delete result.authUsername;delete result.authPassword;}return result;};
 const identity=info=>String(info.dev)+':'+String(info.ino);
 const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
 async function fileDigest(filename){const hash=createHash('sha256');for await(const bytes of createReadStream(filename))hash.update(bytes);return hash.digest('hex');}
 async function version(node){if(node.kind==='link')return createHmac('sha256',versionKey).update(JSON.stringify(node)).digest('hex');const info=await fs.lstat(physical(node));if(info.isSymbolicLink()||node.kind==='file'&&!info.isFile()||node.kind==='folder'&&!info.isDirectory())fail('Der Dateityp wurde geändert.');return digest([node.id,node.parent,node.name,identity(info),info.size,info.mtimeMs,info.ctimeMs,info.mode]);}
 async function writeJournal(key,value){await fs.mkdir(journalDir,{recursive:true,mode:0o700});const temporary=path.join(journalDir,key+'.tmp'),handle=await fs.open(temporary,'w',0o600);try{await handle.writeFile(JSON.stringify(value));await handle.sync();}finally{await handle.close();}await fs.rename(temporary,path.join(journalDir,key+'.json'));}
 async function removeJournal(key){await fs.unlink(path.join(journalDir,key+'.json')).catch(error=>{if(error.code!=='ENOENT')throw error;});}
 async function recover(){
  await fs.mkdir(journalDir,{recursive:true,mode:0o700});
  for(const name of await fs.readdir(journalDir)){
   if(!/^[a-f0-9]{32}\.json$/.test(name))continue;
   try{const record=JSON.parse(await fs.readFile(path.join(journalDir,name),'utf8')),key=name.slice(0,-5);if(!record.node||record.node.kind!=='file'||!record.identity)continue;
    const destination=physical(record.node),temporary=path.join(path.dirname(destination),'.windows7-upload-'+key);
    const published=await fs.lstat(destination).catch(()=>null);
    if(published?.isFile()&&identity(published)===record.identity){if(!record.digest||published.size!==record.node.size||await fileDigest(destination)!==record.digest)continue;const existing=get(record.node.id)||db.nodes.find(n=>n.parent===record.node.parent&&n.name===record.node.name&&(n.parent!==null||n.owner===record.node.owner));if(existing)Object.assign(existing,{...record.node,id:existing.id});else db.nodes.push(record.node);if(record.receipt)await receipts?.recover(record.receipt,record.mutation,existing||record.node);await save(false);}
    const stage=await fs.lstat(temporary).catch(()=>null);if(stage?.isFile()&&identity(stage)===record.identity)await fs.unlink(temporary);
    await removeJournal(key);
   }catch{/* Unknown or displaced files are retained for inspection. */}
  }
 }
 function descendants(root){const result=[],seen=new Set();function visit(node,relative,depth){if(depth>128||result.length>=10000||seen.has(node.id))fail('Maximal 10.000 Einträge und 128 Ordnerebenen je Übertragung.');seen.add(node.id);result.push({node,relative});for(const child of db.nodes.filter(n=>n.parent===node.id))visit(child,relative?relative+'/'+child.name:child.name,depth+1);}visit(root,'',0);return result;}
 async function synchronizeSource(root,user,moving,check){
  let imported=false,count=0;
  async function visit(node,depth){check();if(depth>128||++count>10000)fail('Zu viele Quelleinträge.',413);if(!readable(node,user)||moving&&!owned(node,user))fail('Ein Quelleintrag ist nicht zugänglich.',403);if(node.kind!=='folder')return;
   const before=await version(node),folder=physical(node),entries=await fs.opendir(folder);let physicalCount=0;
   for await(const entry of entries){if(++physicalCount>10000||count+physicalCount>10000)fail('Zu viele Quelleinträge.',413);if(/^\.windows7-upload-[a-f0-9]{32}$/.test(entry.name))continue;if(entry.isSymbolicLink()||!entry.isFile()&&!entry.isDirectory())fail('Spezialdateien und symbolische Links werden nicht als Profil-Dateien übertragen.');if(!valid(entry.name))fail('Ein enthaltenes Element hat einen ungültigen Profil-Dateinamen.');let child=db.nodes.find(n=>n.parent===node.id&&n.name===entry.name);
    if(child&&child.kind!==(entry.isDirectory()?'folder':'file'))fail('Ein Dateityp im Quellordner wurde geändert.');
    if(!child){child={id:id(),owner:node.owner,parent:node.id,name:entry.name,kind:entry.isDirectory()?'folder':'file',space:node.space,created:new Date().toISOString(),shared:false};if(child.kind==='file')child.size=(await fs.stat(path.join(folder,entry.name))).size;db.nodes.push(child);imported=true;}
   }
   if(await version(node)!==before)fail('Der Quellordner wurde während der Vorbereitung geändert.');
   for(const child of db.nodes.filter(n=>n.parent===node.id))await visit(child,depth+1);
  }
  await visit(root,0);if(imported)await save(false);
 }
 async function transfer(user,data,{signal,onProgress,authorized=()=>true,protect:protectRequest=protect}={}){
  const check=()=>{signal?.throwIfAborted();if(!user?.id||!authorized())fail('Sitzung oder Zugriffsrechte nicht mehr gültig.',401);};check();
  if(!['copy','move'].includes(data.mode)||typeof data.id!=='string'||typeof data.parent!=='string')fail('Ungültige Dateiübertragung.',400);
  const moving=data.mode==='move',source=get(data.id),destination=target(user,data.parent);
  if(!source||source.system||!readable(source,user)||moving&&!owned(source,user))fail('Datei oder Ordner nicht gefunden.',404);
  for(let parent=destination,seen=new Set();parent&&!seen.has(parent.id);parent=get(parent.parent)){if(parent.id===source.id)fail('Ein Ordner kann nicht in sich selbst übertragen werden.');seen.add(parent.id);}
  await synchronizeSource(source,user,moving,check);
  const sourceEntries=descendants(source),versions=new Map();for(const {node}of sourceEntries){check();if(!readable(node,user)||moving&&!owned(node,user))fail('Nicht alle enthaltenen Einträge sind zugänglich.',403);versions.set(node.id,await version(node));}
  let xcopy=null;if(data.xcopy!==undefined){const value=data.xcopy;if(moving||source.kind!=='folder'||!value||typeof value!=='object'||Array.isArray(value)||typeof value.pattern!=='string'||value.pattern.length>180||!value.pattern||/[\\/\x00-\x1f]/.test(value.pattern)||typeof value.recursive!=='boolean'||typeof value.empty!=='boolean'||value.createRoot!==undefined&&typeof value.createRoot!=='boolean')fail('Ungültige XCOPY-Auswahl.',400);xcopy={pattern:value.pattern,recursive:value.recursive||value.empty,empty:value.empty,createRoot:value.createRoot===true};}
  const sourceVersion=digest([sourceEntries.map(({node,relative})=>[relative,node.kind,versions.get(node.id)]),xcopy]);
  let selectedEntries=sourceEntries;if(xcopy){const escape=text=>text.replace(/[.+^${}()|[\]\\]/g,'\\$&'),pattern=xcopy.pattern==='*.*'?'[^/]*':escape(xcopy.pattern).replace(/\*/g,'[^/]*').replace(/\?/g,'[^/]'),mask=new RegExp('^'+pattern+'$','i'),selected=new Set(['']);for(const {node,relative}of sourceEntries){if(!relative)continue;if(node.kind!=='folder'&&mask.test(node.name)&&(xcopy.recursive||!relative.includes('/'))){selected.add(relative);let parent=path.posix.dirname(relative);while(parent!=='.'){selected.add(parent);parent=path.posix.dirname(parent);}}else if(node.kind==='folder'&&xcopy.empty)selected.add(relative);}selectedEntries=sourceEntries.filter(entry=>selected.has(entry.relative));}

  if(data.confirmed&&data.sourceVersion!==sourceVersion)fail('Die Quelle wurde seit der Bestätigung geändert.');
  const choices=data.choices||{};if(typeof choices!=='object'||Array.isArray(choices))fail('Ungültige Konfliktauswahl.',400);
  const created=[],plans=[],conflicts=[],folders=new Map(),skipped=[],reserved=new Set();let receipt;let rootName=data.name||source.name;
  const siblings=parent=>db.nodes.filter(n=>n.parent===parent.id&&(parent.id!==null||n.owner===parent.owner));
  const collision=(parent,name)=>siblings(parent).find(n=>n.name.toLowerCase()===name.toLowerCase());
  const reserveKey=(parent,name)=>JSON.stringify([parent.id,parent.owner,name.toLowerCase()]);
  const freeName=(parent,name,kind,copyLabel=false)=>{const dot=kind==='folder'?-1:name.lastIndexOf('.'),stem=dot>0?name.slice(0,dot):name,extension=dot>0?name.slice(dot):'';for(let index=copyLabel?1:2;index<10000;index++){const candidate=stem+(copyLabel?' - Kopie'+(index===1?'':' ('+index+')'):' ('+index+')')+extension;if(!collision(parent,candidate)&&!reserved.has(reserveKey(parent,candidate)))return candidate;}fail('Kein freier Zielname gefunden.');};
  if(!xcopy&&source.parent===destination.id&&(destination.id!==null||source.owner===destination.owner)&&rootName.toLowerCase()===source.name.toLowerCase()){if(moving)fail('Quelle und Ziel sind identisch.');rootName=freeName(destination,rootName,source.kind,true);}
  try{
   if(xcopy&&!xcopy.createRoot)folders.set('',destination);
   for(const {node:original,relative}of selectedEntries){
    if(xcopy&&!xcopy.createRoot&&relative==='')continue;
    check();if(skipped.some(prefix=>prefix===''||relative===prefix||relative.startsWith(prefix+'/')))continue;
    const parent=relative?folders.get(path.posix.dirname(relative)==='.'?'':path.posix.dirname(relative)):destination;if(!parent)continue;
    if(parent.id&&get(parent.id)&&!owned(parent,user)&&!parent.programRoot&&!parent.driveRoot)fail('Ein Zielordner ist schreibgeschützt.',403);
    let name=relative?original.name:rootName;if(!valid(name))fail('Ungültiger Dateiname.',400);let existing=collision(parent,name),overwrite=false;
    if(existing&&(!owned(existing,user)||existing.system))fail('Ein vorhandener Zieleintrag ist schreibgeschützt.',403);
    if(existing&&!(original.kind==='folder'&&existing.kind==='folder')){
     const expected=await version(existing),decision=Object.hasOwn(choices,relative)?choices[relative]:relative===''&&data.overwrite?{action:'replace',version:data.version}:null;
     if(!decision){conflicts.push({relative,name,kind:original.kind,existing:{kind:existing.kind,version:expected}});if(data.confirmed)fail('Bitte alle Namenskonflikte entscheiden.');continue;}
     if(decision.version!==expected)fail('Ein vorhandenes Ziel wurde geändert.');
     if(decision.action==='skip'){skipped.push(relative);continue;}
     if(decision.action==='both'){name=freeName(parent,name,original.kind);existing=null;}
     else if(decision.action==='replace'){if(existing.kind==='folder'||original.kind==='folder'||existing.kind!==original.kind)fail('Verschiedene Eintragsarten können nicht ersetzt werden.');overwrite=true;}
     else fail('Ungültige Konfliktauswahl.',400);
    }
    const key=reserveKey(parent,name);if(reserved.has(key))fail('Mehrere Quelleinträge belegen denselben Zielnamen.');reserved.add(key);
    let node=existing;
    if(!node){node={...copyFields(original,user),id:id(),parent:parent.id,owner:creationOwner(user,parent),name,space:parent.id?spaceOf(parent):'home',shared:!!user.shareEditing,shareBlocked:false,created:new Date().toISOString()};for(const key of ['system','programRoot','driveRoot','personalPrograms','proxyEnabled'])delete node[key];created.push(node);storage.register([node]);}
    plans.push({original,relative,parent,node,existing,overwrite,existingVersion:existing?await version(existing):null});if(original.kind==='folder')folders.set(relative,node);
   }
   const bytes=(await Promise.all(plans.filter(p=>p.original.kind==='file').map(async p=>(await fs.stat(physical(p.original))).size))).reduce((sum,size)=>sum+size,0);
   if(!data.confirmed){const rootConflict=conflicts.find(c=>c.relative==='');return {requiresConfirmation:true,kind:source.kind,tree:source.kind==='folder',sourceVersion,size:bytes,totalItems:plans.length,conflicts,existing:rootConflict?.existing||null,merge:plans.some(p=>p.original.kind==='folder'&&p.existing),preview:source.name+(xcopy?' (Inhalt)':'')+' → '+(destination.name||'Benutzerordner')+(xcopy&&!xcopy.createRoot?'':'/'+rootName)};}
   receipt=receipts?.begin(user,{mode:data.mode,source,parent:destination,batch:data.batch});
   const note=async(plan,backup,digest,key=id())=>{if(receipt)await receipts.record(receipt,{key,kind:plan.overwrite?'replaced':'created',node:plan.node,backup,digest});};
   const sourceTrashed=async record=>{if(receipt)await receipts.record(receipt,{key:record.id,kind:'source',node:record.entries[0],trash:record});};
   let loaded=0,completed=0;const progress=(name,chunk=0)=>onProgress?.({name,totalBytes:bytes,loadedBytes:loaded+chunk,totalItems:plans.length,completedItems:completed});
   const verify=async plan=>{check();if(get(plan.original.id)!==plan.original||!readable(plan.original,user)||moving&&!owned(plan.original,user)||await version(plan.original)!==versions.get(plan.original.id))fail('Die Quelle wurde geändert oder ist nicht mehr zugänglich.');if(plan.parent.id&&get(plan.parent.id)!==plan.parent)fail('Der Zielordner wurde geändert.');if(plan.parent.id&&!owned(plan.parent,user)&&!plan.parent.programRoot&&!plan.parent.driveRoot)fail('Der Zielordner ist nicht mehr beschreibbar.',403);if(plan.existing&&(!owned(plan.existing,user)||get(plan.existing.id)!==plan.existing||await version(plan.existing)!==plan.existingVersion))fail('Das vorhandene Ziel wurde geändert.');assertUnlocked([...(moving?[plan.original.id]:[]),...(plan.overwrite?[plan.node.id]:[])]);};
   const affected=plans.flatMap(p=>[...(moving?[p.original.id]:[]),...(p.overwrite?[p.node.id]:[])]);assertUnlocked(affected);protectRequest([...new Set(plans.flatMap(p=>[p.original.id,p.node.id,p.parent.id]).filter(Boolean))]);progress(source.name);
   for(const plan of plans){
    await verify(plan);const {original,node}=plan;
    if(original.kind==='folder'){if(!plan.existing){await fs.mkdir(physical(node));db.nodes.push(node);await note(plan);await save(false);}completed++;progress(original.name);continue;}
    if(original.kind==='link'){
     await locked(node.id,async()=>{await verify(plan);let originalBackup;if(plan.overwrite){originalBackup=await backup(user,plan.existing,plan.existingVersion);const identity={id:node.id,owner:node.owner,parent:node.parent,name:node.name,shared:node.shared,shareBlocked:node.shareBlocked};delete node.authUsername;delete node.authPassword;Object.assign(node,copyFields(original,user),identity);}else db.nodes.push(node);await note(plan,originalBackup);await save(false);});
    }else await copyFile(user,plan,verify,progress);
    if(original.kind==='file')loaded+=(await fs.stat(physical(node))).size;
    if(moving){check();if(get(original.id)!==original||await version(original)!==versions.get(original.id)||!owned(original,user))fail('Ziel fertig kopiert; die geänderte Quelle bleibt erhalten.');await operations.trash(user,original,{preserveHistory:user,beforeSave:sourceTrashed,onRollback:record=>{if(receipt)receipts.remove(receipt,record.id);}});}
    completed++;progress(original.name);
   }
   if(moving)for(const plan of [...plans].reverse().filter(p=>p.original.kind==='folder')){check();const original=plan.original;if(db.nodes.some(n=>n.parent===original.id)||(await fs.readdir(physical(original))).length)continue;if(get(original.id)!==original||!owned(original,user))fail('Der Quellordner bleibt erhalten.');await operations.trash(user,original,{preserveHistory:user,beforeSave:sourceTrashed,onRollback:record=>{if(receipt)receipts.remove(receipt,record.id);}});}
   if(receipt)await receipts.finish(receipt,'completed');
   return {ok:true,tree:source.kind==='folder',copied:true,completedItems:completed,completedFiles:plans.filter(p=>p.original.kind!=='folder').length,skipped:skipped.length,...(receipt?.items.length?{receipt:receipt.id}:{})};
   async function copyFile(user,plan,verify,progress){
    const target=physical(plan.node),key=id(),temporary=path.join(path.dirname(target),'.windows7-upload-'+key),output=createWriteStream(temporary,{flags:'wx',mode:0o600}),hash=createHash('sha256');let stageIdentity,recorded=false,published=false,count=0;
    try{await new Promise((resolve,reject)=>{output.once('open',resolve);output.once('error',reject);});stageIdentity=identity(await fs.lstat(temporary));await writeJournal(key,{node:{...plan.node,size:plan.original.size},identity:stageIdentity});recorded=true;
     const meter=new Transform({transform(chunk,encoding,callback){try{check();count+=chunk.length;hash.update(chunk);progress(plan.original.name,count);callback(null,chunk);}catch(error){callback(error);}}});await pipeline(createReadStream(physical(plan.original)),meter,output,{signal});
     const handle=await fs.open(temporary,'r+');try{const info=await handle.stat();if(info.size!==count||identity(info)!==stageIdentity)fail('Die temporäre Datei wurde geändert.');await handle.sync();}finally{await handle.close();}
     const publication={node:{...plan.node,size:count},identity:stageIdentity,digest:hash.digest('hex')};await writeJournal(key,publication);
     await locked(plan.node.id,async()=>{await verify(plan);if(identity(await fs.lstat(temporary))!==stageIdentity)fail('Die temporäre Datei wurde ausgetauscht.');let originalBackup;if(plan.overwrite){originalBackup=await backup(user,plan.existing,plan.existingVersion);await verify(plan);}if(receipt)await writeJournal(key,{...publication,receipt:receipts.descriptor(receipt),mutation:{key,kind:plan.overwrite?'replaced':'created',backup:originalBackup?.id,digest:publication.digest}});if(plan.overwrite){await fs.rename(temporary,target);published=true;}else{await fs.link(temporary,target);published=true;await fs.unlink(temporary);}plan.node.size=count;if(!plan.existing)db.nodes.push(plan.node);await note(plan,originalBackup,publication.digest,key);await save(false);await removeJournal(key);});
    }catch(error){output.destroy();await finished(output).catch(()=>{});if(published)error.message='Die Zieldatei wurde vollständig kopiert: '+error.message;throw error;}
    finally{if(!published){const candidates=new Set([temporary]);try{candidates.add(path.join(path.dirname(physical(plan.node)),path.basename(temporary)));}catch{}let removed=false;for(const candidate of candidates){const info=await fs.lstat(candidate).catch(()=>null);if(info&&identity(info)===stageIdentity){await fs.unlink(candidate);removed=true;}}if(recorded&&removed)await removeJournal(key);}}
   }
  }catch(error){if(receipt)try{await receipts.finish(receipt,'partial');}catch{}throw error;}finally{storage.release(created);}
 }
 async function backup(user,node,expected){
  const record={id:id(),owner:user.id,name:node.name,kind:node.kind,reason:'replaced',deletedAt:new Date().toISOString(),originalParent:node.parent,mountName:storage.volume(node)?.mountName||null,entries:[{...structuredClone(node),id:id()}]};let payload;
  try{if(await version(node)!==expected)fail('Das vorhandene Ziel wurde geändert.');if(node.kind==='file'){payload=storage.trashPath(record);await fs.copyFile(physical(node),payload,fs.constants.COPYFILE_EXCL);if(await version(node)!==expected)fail('Das vorhandene Ziel wurde während der Sicherung geändert.');}db.trash??=[];db.trash.push(record);await save(false);return record;}
  catch(error){db.trash=(db.trash||[]).filter(entry=>entry!==record);if(payload)await fs.unlink(payload).catch(()=>{});throw error;}
 }
 return {transfer,recover};
}
