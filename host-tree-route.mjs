import path from 'node:path';
import {hostFile} from './host-command.mjs';
import {transferHostTree} from './host-tree-transfer.mjs';

export async function hostTreeRoute({req,res,json,data,user,source,parent,node,db,get,filePath,owned,readable,creationOwner,spaceOf,id,save,operations,office,officeMutations,authorized}){
 const moving=data.mode==='move',descendant=(entry,root)=>{const seen=new Set();while(entry&&!seen.has(entry.id)){if(entry.id===root.id)return true;seen.add(entry.id);entry=get(entry.parent);}return false;};
 const sources=new Map(node?db.nodes.filter(n=>descendant(n,node)).map(n=>[filePath(n),n]):[]);
 const targets=new Map(parent?db.nodes.filter(n=>parent.id===null?n.owner===parent.owner:descendant(n,parent)).map(n=>[filePath(n),n]):[]);
 if(node&&[...sources.values()].some(entry=>entry.kind==='link'))throw Object.assign(Error('Der Quellordner enthält Desktop-Verknüpfungen. Deren Übertragung in das Host-Dateisystem ist noch nicht integriert.'),{status:400});
 let destination;
 if(parent){const folder=parent.id?filePath(parent):path.dirname(filePath({id:id(),owner:parent.owner,parent:null,name:data.name,kind:'file'})),info=(await hostFile(user,'stat',{path:folder})).node;destination={path:folder,profile:true,uid:info.uid,gid:info.gid};}
 else destination={path:data.parent.slice(5)};
 const writable=n=>owned(n,user)||n?.programRoot||n?.driveRoot;
 const active=()=>authorized()&&(!node||get(node.id)===node&&readable(node,user)&&(!moving||owned(node,user)))&&(!parent||parent.id===null||get(parent.id)===parent&&writable(parent));
 const controller=new AbortController();res.on('close',()=>{if(!res.writableEnded)controller.abort();});
 const protectedTargets=new Set(),deny=message=>{throw Object.assign(Error(message),{status:403});};
 async function authorizeEntry({sourcePath,target,node:entry,existing}){
  if(!active())deny('Sitzung oder Profilrechte wurden geändert.');
  if(node){const original=sources.get(sourcePath);if(!original||get(original.id)!==original||filePath(original)!==sourcePath||!readable(original,user)||moving&&!owned(original,user))deny('Kein Zugriff auf einen enthaltenen Quelleintrag.');}
  if(parent){
   if(entry.name.length>180)deny('Profil-Dateinamen dürfen derzeit maximal 180 Zeichen enthalten.');
   const actual=targets.get(target),ancestor=targets.get(path.dirname(target));
   if(existing&&(!actual||get(actual.id)!==actual||filePath(actual)!==target||!writable(actual)))deny('Ein vorhandener Zieleintrag ist nicht beschreibbar.');
   if(ancestor&&(get(ancestor.id)!==ancestor||filePath(ancestor)!==path.dirname(target)||!writable(ancestor)))deny('Ein enthaltener Zielordner ist nicht beschreibbar.');
   if(actual){office.assertUnlocked([actual.id]);protectedTargets.add(actual.id);officeMutations.set(req,[...affected,...protectedTargets]);}
  }
 }
 const addTarget=async({result})=>{
  if(!parent)return;const physical=result.node.path;let entry=targets.get(physical);
  if(!entry){const parentNode=physical===path.posix.join(destination.path,data.name)?parent:targets.get(path.posix.dirname(physical));
   // A keep-both root may have another name, but its parent remains the same.
   const actualParent=path.posix.dirname(physical)===destination.path?parent:parentNode;
   if(!actualParent)throw Error('Der Ziel-Elternordner ist nicht mehr verfügbar.');
   entry={id:id(),owner:creationOwner(user,actualParent),parent:actualParent.id,name:path.posix.basename(physical),kind:result.node.kind,space:actualParent.id?spaceOf(actualParent):'home',created:new Date().toISOString(),shared:false};db.nodes.push(entry);targets.set(physical,entry);
  }
  if(entry.kind==='file')entry.size=result.node.size;await save(false);
 };
 const removeSource=async({sourcePath,sourceVersion})=>{
  if(!moving)return;if(!active())deny('Die Quelle bleibt erhalten, weil Sitzung oder Zugriffsrechte geändert wurden.');
  const current=(await hostFile(user,'stat',{path:sourcePath})).node;if(current.version!==sourceVersion)throw Error('Der Quelleintrag wurde geändert und bleibt erhalten.');
  if(node){const original=sources.get(sourcePath);if(!original||get(original.id)!==original||filePath(original)!==sourcePath||!owned(original,user))deny('Die Quelle bleibt erhalten.');office.assertUnlocked([original.id]);await operations.trash(user,original);sources.delete(sourcePath);}
  else await hostFile(user,'trash',{path:sourcePath,version:sourceVersion,confirmed:true});
 };
 const affected=node&&moving?[...sources.values()].map(n=>n.id):[];office.assertUnlocked(affected);officeMutations.set(req,affected);
 const options={user,source,destination,name:data.name,moving,confirmed:data.confirmed===true,sourceVersion:data.sourceVersion,choices:data.choices,signal:controller.signal,authorized:active,authorizeEntry,
  canonicalTarget:target=>parent?[...targets.keys()].find(actual=>actual.toLowerCase()===target.toLowerCase())||target:target,
  publishDirectory:addTarget,finishFile:async detail=>{await addTarget(detail);await removeSource(detail);},finishDirectory:removeSource};
 if(!data.stream)return json(200,await transferHostTree(options));
 if(data.confirmed!==true)throw Object.assign(Error('Die Übertragung muss zuerst bestätigt werden.'),{status:400});
 res.writeHead(200,{'Content-Type':'application/x-ndjson','Cache-Control':'no-store','X-Accel-Buffering':'no'});let last=0;
 try{const result=await transferHostTree({...options,onProgress:event=>{if(Date.now()-last>=100||event.loadedBytes===event.totalBytes){last=Date.now();res.write(JSON.stringify({progress:event})+'\n');}}});res.end(JSON.stringify({result})+'\n');}
 catch(error){if(!res.destroyed)res.end(JSON.stringify({error:error.message+' Bereits vollständig übertragene Elemente bleiben erhalten.'})+'\n');}
}
