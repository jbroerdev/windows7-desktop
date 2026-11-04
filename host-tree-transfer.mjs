import path from 'node:path';
import {createHash} from 'node:crypto';
import {hostFile} from './host-command.mjs';
import {transferHostFile} from './host-transfer.mjs';

const error=(message,status=409)=>Object.assign(Error(message),{status});
const join=(base,relative)=>relative?path.posix.join(base,relative):base;
function validName(name){if(typeof name!=='string'||!name||name!==name.trim()||name==='.'||name==='..'||/[\\/\x00-\x1f<>:"|?*]/.test(name)||Buffer.byteLength(name)>255)throw error('Ungültiger Dateiname.',400);return name;}
function childOf(base,child){const relative=path.posix.relative(base,child);return relative===''||relative!=='..'&&!relative.startsWith('../')&&!path.posix.isAbsolute(relative);}

export async function transferHostTree(options){
 const {user,source,destination,name,confirmed=false,sourceVersion,choices={},signal,authorized=()=>true,onProgress,finishFile=async()=>{},finishDirectory=async()=>{},publishDirectory=async()=>{},authorizeEntry=async()=>{},canonicalTarget=target=>target,call=hostFile,moving=false}=options;
 const check=()=>{signal?.throwIfAborted();if(!authorized())throw error('Sitzung oder Zugriffsrechte nicht mehr gültig.',401);};
 check();if(!user?.id||user.role!=='admin'||user.shareEditing)throw error('Host-Übertragungen erfordern ein Administratorkonto.',403);validName(name);
 if(!choices||typeof choices!=='object'||Array.isArray(choices))throw error('Ungültige Konfliktauswahl.',400);
 const root=(await call(user,'stat',{path:source.path})).node,parent=(await call(user,'stat',{path:destination.path})).node;
 if(root.kind!=='folder'||root.symlink||parent.kind!=='folder'||parent.symlink)throw error('Bitte reguläre Quell- und Zielordner wählen.',400);
 const sourceReal=root.resolved||source.path,destinationReal=join(parent.resolved||destination.path,name);
 if(childOf(sourceReal,destinationReal))throw error('Ein Ordner kann nicht in sich selbst oder einen Unterordner übertragen werden.');
 if(moving)await call(user,'trash',{path:source.path,version:root.version}); // Protected roots fail before copying.
 const entries=[];let totalBytes=0;
 async function scan(relative,node,depth){
  check();if(depth>128||entries.length>=10000)throw error('Maximal 10.000 Einträge und 128 Ordnerebenen je Übertragung.',413);
  if(node.symlink||!['folder','file'].includes(node.kind))throw error('Symbolische Links und Spezialdateien können hier nicht übertragen werden: '+relative,400);
  entries.push({relative,node});if(node.kind==='file'){totalBytes+=node.size;if(!Number.isSafeInteger(totalBytes))throw error('Die Gesamtgröße ist zu groß.',413);return;}
  const listing=await call(user,'list',{path:join(source.path,relative)});
  if(listing.node.version!==node.version)throw error('Der Quellordner wurde während der Vorbereitung geändert.');
  for(const child of listing.entries.sort((a,b)=>a.name.localeCompare(b.name,'de'))){validName(child.name);await scan(relative?relative+'/'+child.name:child.name,child,depth+1);}
  if((await call(user,'stat',{path:join(source.path,relative)})).node.version!==node.version)throw error('Der Quellordner wurde während der Vorbereitung geändert.');
 }
 await scan('',root,0);
 const treeVersion=createHash('sha256').update(JSON.stringify(entries.map(({relative,node})=>[relative,node.kind,node.version]))).digest('hex');
 if(confirmed&&sourceVersion!==treeVersion)throw error('Der Quellordner wurde seit der Bestätigung geändert.');
 const conflicts=[],plans=[],directories=new Map(),skipped=[],reserved=new Set();let targetRoot=join(destination.path,name);
 const stat=async target=>{try{return(await call(user,'stat',{path:target})).node;}catch(e){if(e.status===404||e.code==='ENOENT')return null;throw e;}};
 async function choose(relative,node,target,existing){
  const decision=Object.hasOwn(choices,relative)?choices[relative]:undefined;
  if(!existing)return {target,existing:null};
  if(node.kind==='folder'&&existing.kind==='folder'&&!existing.symlink){return {target,existing,merge:true};}
  if(!decision)conflicts.push({relative,name:node.name,kind:node.kind,existing});
  if(!confirmed&&!decision)return {target,existing,unresolved:true};
  if(!decision||!['replace','skip','both'].includes(decision.action))throw error('Bitte den Namenskonflikt erneut entscheiden: '+relative);
  if(decision.version!==existing.version)throw error('Das vorhandene Ziel wurde geändert: '+relative);
  if(decision.action==='skip')return {skip:true,target,existing};
  if(decision.action==='replace'){if(node.kind!=='file'||existing.kind!=='file'||existing.symlink)throw error('Ordner und Links werden nicht durch eine andere Art von Eintrag ersetzt.');return {target,existing,overwrite:true};}
  const original=path.posix.basename(target),dot=node.kind==='file'?original.lastIndexOf('.'):-1,stem=dot>0?original.slice(0,dot):original,ext=dot>0?original.slice(dot):'';
  for(let index=2;index<10000;index++){const candidate=join(path.posix.dirname(target),stem+' ('+index+')'+ext);if(!await stat(candidate)&&!plans.some(p=>p.target===candidate))return {target:candidate,existing:null};}
  throw error('Es wurde kein freier Zielname gefunden.');
 }
 for(const {relative,node}of entries){
  check();if(skipped.some(prefix=>prefix===''||relative===prefix||relative.startsWith(prefix+'/')))continue;
  const directory=relative?directories.get(path.posix.dirname(relative)==='.'?'':path.posix.dirname(relative)):null;
  if(relative&&!directory)continue; // A conflicting ancestor is unresolved in the preview.
  const target=await canonicalTarget(relative?join(directory,path.posix.basename(relative)):targetRoot);
  const existing=await stat(target);
  if(relative===''&&childOf(sourceReal,existing?.resolved||target))throw error('Quelle und Ziel liegen ineinander.');
  const choice=await choose(relative,node,target,existing);
  await authorizeEntry({relative,sourcePath:join(source.path,relative),target:choice.target,node,existing:choice.existing});
  if(choice.skip){skipped.push(relative);continue;}
  if(choice.unresolved)continue;
  const key=destination.profile?choice.target.toLowerCase():choice.target;
  if(reserved.has(key))throw error('Mehrere Quelleinträge würden denselben Zielnamen belegen. Bitte die Quelleinträge zuvor umbenennen.');reserved.add(key);
  if(relative==='')targetRoot=choice.target;
  plans.push({relative,node,...choice});if(node.kind==='folder')directories.set(relative,choice.target);
 }
 totalBytes=plans.reduce((sum,plan)=>sum+(plan.node.kind==='file'?plan.node.size:0),0);
 if(!confirmed)return {requiresConfirmation:true,tree:true,sourceVersion:treeVersion,size:totalBytes,totalItems:plans.length,conflicts,merge:plans.some(p=>p.merge),preview:source.path+' → '+targetRoot};
 if(conflicts.some(c=>!choices[c.relative]))throw error('Nicht alle Namenskonflikte wurden entschieden.');
 let loadedBytes=0,completedItems=0;const progress=(name,bytes=0)=>onProgress?.({name,totalBytes,loadedBytes:loadedBytes+bytes,totalItems:plans.length,completedItems});
 progress(name);
 for(const plan of plans){
  check();await authorizeEntry({relative:plan.relative,sourcePath:join(source.path,plan.relative),target:plan.target,node:plan.node,existing:plan.existing});
  if(plan.node.kind==='folder'){
   if(!plan.existing){const data={path:path.posix.dirname(plan.target),name:path.posix.basename(plan.target),confirmed:true,...(destination.profile?{uid:destination.uid,gid:destination.gid}:{})};const result=await call(user,'mkdir',data);await publishDirectory({relative:plan.relative,result});}
   completedItems++;progress(plan.node.name);continue;
  }
  const currentDestination={...destination,path:path.posix.dirname(plan.target)};
  await transferHostFile({user,source:{path:join(source.path,plan.relative)},destination:currentDestination,name:path.posix.basename(plan.target),sourceVersion:plan.node.version,overwrite:plan.overwrite===true,version:plan.overwrite?plan.existing.version:undefined,confirmed:true,signal,authorized,call,onProgress:event=>progress(plan.node.name,event.loadedBytes),finish:detail=>finishFile({...detail,relative:plan.relative,sourcePath:join(source.path,plan.relative),target:plan.target})});
  loadedBytes+=plan.node.size;completedItems++;progress(plan.node.name);
 }
 if(moving)for(const plan of [...plans].reverse().filter(p=>p.node.kind==='folder')){
  check();const original=join(source.path,plan.relative),listing=await call(user,'list',{path:original});if(listing.entries.length)continue;
  await finishDirectory({relative:plan.relative,sourcePath:original,sourceVersion:listing.node.version});
 }
 return {ok:true,tree:true,copied:true,completedItems,skipped:skipped.length,target:targetRoot};
}
