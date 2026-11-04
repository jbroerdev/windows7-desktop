import {createReadStream,createWriteStream} from 'node:fs';
import {Transform} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import {promises as fs} from 'node:fs';
export function createFileOperations({db,storage,id,get,owned,readable,target,creationOwner=(user)=>user.id,duplicate,spaceOf,filePath,rootFor,save,fail,onTrash=()=>{},onPurge=()=>{}}){
  function subtree(root){const entries=[],seen=new Set();function visit(node){if(seen.has(node.id))fail('Zyklischer Ordnerpfad.');seen.add(node.id);entries.push(node);for(const child of db.nodes.filter(n=>n.parent===node.id))visit(child);}visit(root);return entries;}
  async function copy(user,data,{onProgress,signal}={}){
    if(!Array.isArray(data.ids)||!data.ids.length||data.ids.length>100)fail('Bitte 1–100 Einträge auswählen.');
    const destination=target(user,data.parent),selected=new Set(data.ids),source=[...selected].map(get);
    if(source.some(n=>!n||n.system||!readable(n,user)))fail('Datei oder Ordner nicht gefunden.',404);
    const roots=source.filter(n=>{let p=get(n.parent);while(p){if(selected.has(p.id))return false;p=get(p.parent);}return true;});
    const created=[],written=[];const reserved=new Set();
    function nameFor(name){let candidate=name,index=1;const dot=name.lastIndexOf('.'),stem=dot>0?name.slice(0,dot):name,extension=dot>0?name.slice(dot):'';while(duplicate(destination.id,candidate,undefined,user.id)||reserved.has(candidate.toLowerCase()))candidate=stem+' - Kopie'+(index++>1?' ('+(index-1)+')':'')+extension;reserved.add(candidate.toLowerCase());return candidate;}
    for(const root of roots){let p=destination;while(p){if(p.id===root.id)fail('Ein Ordner kann nicht in sich selbst kopiert werden.');p=get(p.parent);}const entries=subtree(root);if(entries.some(n=>!readable(n,user)))fail('Nicht alle enthaltenen Dateien sind lesbar.',403);if(created.length+entries.length>10000)fail('Maximal 10000 Einträge je Kopiervorgang.',413);const mapping=new Map(entries.map(n=>[n.id,id()]));for(const original of entries){const node={...original,id:mapping.get(original.id),owner:creationOwner(user,destination),parent:original===root?destination.id:mapping.get(original.parent),name:original===root?nameFor(original.name):original.name,space:destination.id?spaceOf(destination):'home',shared:!!user.shareEditing,shareBlocked:false,created:new Date().toISOString()};delete node.proxyEnabled;if(original.owner!==user.id&&!owned(original,user)&&!(user.role==='admin'&&!user.shareEditing)){delete node.authUsername;delete node.authPassword;}delete node.system;delete node.programRoot;delete node.driveRoot;delete node.personalPrograms;created.push({node,original});}}
    let totalBytes=0,loadedBytes=0,completedItems=0;
    if(onProgress)for(const {original}of created)if(original.kind==='file')totalBytes+=(await fs.stat(filePath(original))).size;
    const progress=name=>{signal?.throwIfAborted();onProgress?.({name,totalBytes,loadedBytes,totalItems:created.length,completedItems});};
    progress(roots[0]?.name||'');
    storage.register(created.map(e=>e.node));
    try{for(const {node,original} of created){if(node.kind==='folder'){await fs.mkdir(filePath(node),{recursive:false});written.push(node);}else if(node.kind==='file'){if(onProgress){const output=createWriteStream(filePath(node),{flags:'wx'});output.once('open',()=>written.push(node));const meter=new Transform({transform(chunk,encoding,callback){try{signal?.throwIfAborted();loadedBytes+=chunk.length;progress(original.name);callback(null,chunk);}catch(error){callback(error);}}});await pipeline(createReadStream(filePath(original)),meter,output,{signal});}else{await fs.copyFile(filePath(original),filePath(node),fs.constants.COPYFILE_EXCL);written.push(node);}}completedItems++;progress(original.name);}db.nodes.push(...created.map(e=>e.node));await save();return {ok:true,copied:roots.length};}
    catch(error){for(const node of written.reverse())await fs.rm(filePath(node),{recursive:node.kind==='folder',force:true}).catch(()=>{});throw error;}
    finally{storage.release(created.map(e=>e.node));}
  }
  async function trash(user,node,options={}){
    if(node.system)fail('Standardordner können nicht gelöscht werden.');
    const entries=subtree(node);if(entries.some(n=>!owned(n,user)))fail('Nicht alle enthaltenen Einträge gehören zu diesem Konto.',403);
    const drive=storage.volume(node),record={id:id(),owner:user.id,name:node.name,kind:node.kind,deletedAt:new Date().toISOString(),originalParent:node.parent,mountName:drive?.mountName||null,entries:structuredClone(entries)};
    let moved=false;
    try{
      if(node.kind!=='link'){await fs.rename(filePath(node),storage.trashPath(record));moved=true;}
      db.trash=[...(db.trash||[]),record];const removed=new Set(entries.map(n=>n.id));db.nodes=db.nodes.filter(n=>!removed.has(n.id));
      onTrash([...removed],{preserve:options.preserveHistory});await options.beforeSave?.(record);await save();
      return {ok:true,trashed:true,recordId:record.id};
    }catch(error){
      if(moved){const destination=filePath(node);try{await fs.lstat(destination);fail('Die Datei bleibt im Papierkorb, weil der ursprüngliche Pfad neu belegt wurde.',409);}catch(e){if(e.code!=='ENOENT')throw e;}await fs.rename(storage.trashPath(record),destination);}
      db.nodes.push(...entries.filter(n=>!get(n.id)));db.trash=(db.trash||[]).filter(r=>r.id!==record.id);
      await options.onRollback?.(record);
      throw error;
    }
  }
  async function restore(user,trashId,options={}){
    const record=db.trash?.find(r=>r.id===trashId&&r.owner===user.id);if(!record)fail('Papierkorb-Eintrag nicht gefunden.',404);
    const entries=structuredClone(record.entries),root=entries[0];let parent=get(record.originalParent),fallback=false;
    if(options.exactParent){parent=options.exactParent;if(parent.id!==record.originalParent||parent.id!==null&&get(parent.id)!==parent||parent.kind!=='folder'||!(owned(parent,user)||parent.programRoot||parent.driveRoot))fail('Der ursprüngliche Zielordner ist nicht mehr zugänglich.',409);}else if(!parent||!(owned(parent,user)||parent.programRoot||parent.driveRoot)){fallback=true;parent=record.mountName?db.nodes.find(n=>n.driveRoot&&n.mountName===record.mountName):rootFor(user,'documents');}
    if(!parent)fail('Das ursprüngliche Laufwerk ist nicht verfügbar.',409);
    if(entries.some(n=>get(n.id)))fail('Eine wiederherzustellende Dateikennung ist bereits vergeben.',409);
    if(duplicate(parent.id,root.name,undefined,user.id))fail('Im Ziel existiert bereits ein Eintrag mit diesem Namen.',409);
    options.checkTarget?.(parent);root.parent=parent.id;for(const n of entries){n.space=spaceOf(parent);if(user.shareEditing||fallback)n.owner=creationOwner(user,parent);}
    let destination,moved=false;storage.register(entries);
    try{
      if(root.kind!=='link'){destination=filePath(root);try{await fs.lstat(destination);fail('Im Ziel existiert bereits eine Datei.',409);}catch(error){if(error.code!=='ENOENT')throw error;}await fs.rename(storage.trashPath(record),destination);moved=true;}
      db.nodes=[...db.nodes,...entries];db.trash=db.trash.filter(r=>r!==record);await options.beforeSave?.(root,entries);await save();return {ok:true,id:root.id};
    }catch(error){if(moved)await fs.rename(destination,storage.trashPath(record));const restored=new Set(entries.map(n=>n.id));db.nodes=db.nodes.filter(n=>!restored.has(n.id));if(!db.trash.some(r=>r.id===record.id))db.trash.push(record);throw error;}
    finally{storage.release(entries);}
  }
  async function purge(user,trashId){const record=db.trash?.find(r=>r.id===trashId&&r.owner===user.id);if(!record)fail('Papierkorb-Eintrag nicht gefunden.',404);if(record.kind!=='link')await fs.rm(storage.trashPath(record),{recursive:true,force:true});db.trash=db.trash.filter(r=>r!==record);onPurge(record);await save();return {ok:true};}
  async function exchange(user,node,backupId,{validate=async()=>{},beforeSave=async()=>{}}={}){
    const backup=db.trash?.find(r=>r.id===backupId&&r.owner===user.id);
    if(!owned(node,user)||node.system||!backup||backup.kind!==node.kind||!['file','link'].includes(node.kind))fail('Ersetzung ist nicht mehr zugänglich.',409);
    const previous=structuredClone(node),record={id:id(),owner:user.id,name:node.name,kind:node.kind,reason:'replaced',deletedAt:new Date().toISOString(),originalParent:node.parent,mountName:storage.volume(node)?.mountName||null,entries:[{...structuredClone(node),id:id(),shared:false,shareBlocked:true}]};
    let temporary,anchor,published=false,retained=false,backupCreated=false,anchorCreated=false,temporaryCreated=false;
    try{
      if(node.kind==='file'){
        // Keep an inode anchor for rollback and an independent public recovery snapshot.
        anchor=filePath(node)+'.windows7-upload-'+id();
        try{await fs.link(filePath(node),anchor);anchorCreated=true;}catch(e){if(['EXDEV','EPERM','ENOTSUP','EOPNOTSUPP'].includes(e.code))fail('Dieses Dateisystem unterstützt die sichere Rücknahme des Ersetzens noch nicht.',409);throw e;}
        await fs.copyFile(filePath(node),storage.trashPath(record),fs.constants.COPYFILE_EXCL);backupCreated=true;await fs.chmod(storage.trashPath(record),0o600);const snapshot=await fs.open(storage.trashPath(record),'r+');try{await snapshot.sync();}finally{await snapshot.close();}
      }
      db.trash??=[];db.trash.push(record);await save(false);retained=true;
      if(node.kind==='file'){
        temporary=filePath(node)+'.windows7-upload-'+id();const reservation=await fs.open(temporary,'wx',0o600);temporaryCreated=true;await reservation.close();await fs.copyFile(storage.trashPath(backup),temporary);
        const handle=await fs.open(temporary,'r+');try{await handle.sync();}finally{await handle.close();}
      }
      await validate();
      if(temporary){await fs.rename(temporary,filePath(node));temporary=null;}
      published=true;
      const identity={id:node.id,owner:node.owner,parent:node.parent,name:node.name,space:node.space,shared:node.shared,shareBlocked:node.shareBlocked};
      for(const key of Object.keys(node))delete node[key];Object.assign(node,structuredClone(backup.entries[0]),identity);
      if(node.kind==='file')node.size=(await fs.stat(filePath(node))).size;
      await beforeSave(record);await save(false);return{ok:true,backup:record};
    }catch(error){
      if(published){
        if(previous.kind==='file'){await fs.rename(anchor,filePath(previous));anchor=null;}
        const security={shared:node.shared,shareBlocked:node.shareBlocked};for(const key of Object.keys(node))delete node[key];Object.assign(node,previous,security);
      }
      if(!retained){db.trash=(db.trash||[]).filter(r=>r!==record);if(backupCreated)await fs.unlink(storage.trashPath(record)).catch(()=>{});}
      throw error;
    }finally{if(temporary&&temporaryCreated)await fs.unlink(temporary).catch(()=>{});if(anchor&&anchorCreated)await fs.unlink(anchor).catch(()=>{});}
  }
  return {copy,trash,restore,purge,exchange,list:user=>(db.trash||[]).filter(r=>r.owner===user.id).map(({id,name,kind,deletedAt})=>({id,name,kind,deletedAt}))};
}
