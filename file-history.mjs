import {promises as fs} from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';

// Store commands and identities, never file contents or link credentials.
export function createFileHistory({db,get,owned,duplicate,clean,filePath,storage,save,id,assertUnlocked,operations}){
 let transferExecutor;
 const error=(message,status=409)=>{throw Object.assign(Error(message),{status});};
 const key=user=>user.id+(user.shareEditing?':share':':personal');
 const history=user=>db.fileHistory?.[key(user)]||{undo:[],redo:[]};
 const group=entries=>{const last=entries.at(-1);if(!last)return[];if(!last.batch)return[last];let start=entries.length-1;while(start>0&&entries[start-1].batch===last.batch)start--;return entries.slice(start);};
 const view=entries=>{const items=group(entries),entry=items.at(-1);if(!entry)return null;if(entry.type==='transfer'){const count=new Set(items.map(item=>item.receipt)).size;return{id:entry.id,count,label:(entry.mode==='move'?'Verschieben':'Kopieren')+' von '+(count>1?count+' Elementen':'„'+entry.name+'“')};}return{id:entry.id,count:items.length,label:items.length>1?(entry.type==='delete'?'Löschen':'Wiederherstellen')+' von '+items.length+' Elementen':entry.type==='rename'?'Umbenennen von „'+entry.before+'“ in „'+entry.after+'“':(entry.type==='delete'?'Löschen von „':'Wiederherstellen von „')+entry.name+'“'};};
 function state(user){if(!user)return{undo:null,redo:null};const h=history(user);return{undo:view(h.undo),redo:view(h.redo)};}
 function trim(entries){let groups=0,end=entries.length;while(end>0){let start=end-1;const token=entries[start].batch||entries[start].id;while(start>0&&(entries[start-1].batch||entries[start-1].id)===token)start--;if(++groups>50||entries.length-start>20000&&end<entries.length)return entries.slice(end);end=start;}return entries;}
 function recordTransfer(receipt,item){if(item.historyId)return;db.fileHistory??={};const h=db.fileHistory[receipt.scope]??={undo:[],redo:[]};item.historyId=id();h.undo.push({id:item.historyId,type:'transfer',receipt:receipt.id,item:item.key,node:item.node,name:receipt.name,mode:receipt.mode,batch:receipt.batch||receipt.id});if(h.undo.length>20000||h.undo.at(-2)?.batch!==(receipt.batch||receipt.id))h.undo=trim(h.undo);if(h.redo.length)h.redo=[];}
 function discardTransferItem(receipt,item){for(const h of Object.values(db.fileHistory||{}))for(const side of ['undo','redo'])h[side]=h[side].filter(entry=>entry.receipt!==receipt||entry.item!==item);}
 function discardReceipts(ids){const removed=new Set(ids);for(const h of Object.values(db.fileHistory||{}))for(const side of ['undo','redo'])h[side]=h[side].filter(entry=>!removed.has(entry.receipt));}
 async function identity(node){if(!storage.enabled||node.kind==='link')return null;const info=await fs.lstat(filePath(node));if(info.isSymbolicLink()||node.kind==='file'&&!info.isFile()||node.kind==='folder'&&!info.isDirectory())error('Der Dateityp wurde zwischenzeitlich geändert.');return [String(info.dev),String(info.ino),info.birthtimeMs];}
 async function rename(user,node,name,{direction,token,request}={}){
  if(!owned(node,user))error('Datei oder Ordner nicht gefunden.',404);
  if(node.system)error('Standardordner können nicht umbenannt werden.',400);
  assertUnlocked([node.id],request);
  if(!clean(name)||duplicate(node.parent,name,node.id,user.id))error('Name ungültig oder bereits vorhanden.');
  if(!direction&&name===node.name)return{ok:true,history:state(user)};
  const previous=history(user),next=structuredClone(previous),currentIdentity=await identity(node);
  if(direction){
   const entry=next[direction].at(-1),expected=direction==='undo'?entry?.after:entry?.before;
   if(!entry||entry.id!==token)error('Der Verlauf wurde geändert. Bitte erneut versuchen.');
   if(entry.node!==node.id||entry.parent!==node.parent||entry.owner!==node.owner||entry.kind!==node.kind||node.name!==expected||JSON.stringify(currentIdentity)!==JSON.stringify(entry.identity))error('Der Eintrag wurde außerhalb dieses Verlaufs geändert.');
   next[direction].pop();next[direction==='undo'?'redo':'undo'].push(entry);
  }else{
   next.undo.push({id:id(),type:'rename',node:node.id,parent:node.parent,owner:node.owner,kind:node.kind,before:node.name,after:name,identity:currentIdentity});
   next.undo=trim(next.undo);next.redo=[];
  }
  const oldName=node.name,from=storage.enabled&&node.kind!=='link'?filePath(node):null,to=from?filePath({...node,name}):null;
  if(from&&from!==to){
   try{await fs.lstat(to);error('Der Zielname existiert bereits im Dateisystem.');}catch(e){if(e.code!=='ENOENT')throw e;}
   await fs.rename(from,to);
  }
  for(const direction of ['undo','redo'])next[direction]=next[direction].filter(entry=>entry.type!=='rename'||get(entry.node)||db.trash?.some(r=>r.entries.some(n=>n.id===entry.node)));
  node.name=name;db.fileHistory??={};db.fileHistory[key(user)]=next;
  try{await save(false);}catch(e){
   // Preserve the file and report failure rather than claiming a recorded action.
   node.name=oldName;db.fileHistory[key(user)]=previous;
   if(from&&from!==to)await fs.rename(to,from);
   throw e;
  }
  return{ok:true,history:state(user)};
 }
 async function replaySingle(user,{direction,token},request){
  if(!['undo','redo'].includes(direction))error('Ungültige Verlaufsaktion.',400);
  const entry=history(user)[direction].at(-1);
  if(!entry||entry.id!==token)error('Der Verlauf wurde geändert. Bitte erneut versuchen.');
  if(entry.type==='transfer'){if(!transferExecutor)error('Übertragungsverlauf ist noch nicht verfügbar.');const previous=history(user),next=structuredClone(previous),command=next[direction].pop();next[direction==='undo'?'redo':'undo'].push(command);try{await transferExecutor(user,command,direction,request,{assertUnlocked,commit:()=>{db.fileHistory[key(user)]=next;}});return{ok:true};}catch(e){db.fileHistory[key(user)]=previous;throw e;}}
  if(entry.type!=='rename')return recycle(user,entry.type,{direction,entry,request});
  return rename(user,get(entry.node),direction==='undo'?entry.before:entry.after,{direction,token,request});
 }
 async function replay(user,{direction,token},request){
  if(!['undo','redo'].includes(direction))error('Ungültige Verlaufsaktion.',400);
  const entries=group(history(user)[direction]);if(!entries.length||entries.at(-1)?.id!==token)error('Der Verlauf wurde geändert. Bitte erneut versuchen.');
  let completed=0;
  try{for(const entry of entries.reverse()){await replaySingle(user,{direction,token:entry.id},request);completed++;}}
  catch(e){if(completed){e.message=completed+' von '+entries.length+(entries[0]?.type==='transfer'?' Übertragungsschritten':' Elementen')+' abgeschlossen. Die übrigen Elemente bleiben im Verlauf. '+(e.status?e.message:'Der Dateivorgang konnte nicht abgeschlossen werden.');e.status??=409;}throw e;}
  return{ok:true,completed,history:state(user)};
 }
 function discardNodes(ids,preserve,all=false){const removed=new Set(ids);if(all)discardReceipts((db.transferReceipts||[]).filter(r=>r.items.some(i=>removed.has(i.node))).map(r=>r.id));for(const [scope,h] of Object.entries(db.fileHistory||{})){if(preserve&&scope===key(preserve))continue;for(const direction of ['undo','redo'])h[direction]=h[direction].filter(entry=>(!all&&entry.type!=='rename')||!removed.has(entry.node));}}
 function discardTrash(trashId){discardReceipts((db.transferReceipts||[]).filter(r=>r.items.some(i=>i.trash===trashId||i.backup===trashId)).map(r=>r.id));for(const h of Object.values(db.fileHistory||{}))for(const direction of ['undo','redo'])h[direction]=h[direction].filter(entry=>entry.trash!==trashId);}
 function tree(root){const entries=[root],seen=new Set();for(let i=0;i<entries.length;i++){const n=entries[i];if(!n||seen.has(n.id)||entries.length>10000)error('Ungültiger oder zu großer Dateibaum.');seen.add(n.id);entries.push(...db.nodes.filter(child=>child.parent===n.id));}return entries;}
 async function fingerprint(entries,filename,legacy=false){
  const rows=entries.map(n=>[n.id,n.parent,n.name,n.kind,n.owner]).sort((a,b)=>a[0].localeCompare(b[0]));
  if(entries[0].kind!=='link'){
   let count=0;
   async function scan(actual,relative='',depth=0){
    if(++count>10000||depth>128)error('Maximal 10000 Einträge und 128 Ordnerebenen je Verlaufsvorgang.');
    const info=await fs.lstat(actual);if(info.isSymbolicLink()||!info.isFile()&&!info.isDirectory())error('Spezialdateien können nicht über den Verlauf gelöscht werden.');
    rows.push([relative,info.isDirectory()?'folder':'file',String(info.dev),String(info.ino),info.birthtimeMs,legacy||info.isFile()?info.size:null,legacy||info.isFile()?info.mtimeMs:null]);
    if(info.isDirectory()){const children=await fs.readdir(actual);for(const name of children.sort())await scan(path.join(actual,name),relative+'/'+name,depth+1);}
   }
   await scan(filename);
  }
  return createHash('sha256').update(JSON.stringify(rows)).digest('hex');
 }
 async function recycle(user,type,{node,trashId,direction,entry,request,batch}={}){
  const restoring=direction?(entry.type==='delete'?direction==='undo':direction==='redo'):type==='restore';
  if(!storage.enabled)return restoring?operations.restore(user,trashId):operations.trash(user,node);
  const previous=history(user),next=structuredClone(previous),command=entry?structuredClone(entry):{id:id(),type,name:node?.name,node:node?.id,trash:trashId,...(batch?{batch}:{})};
  if(direction){next[direction].pop();next[direction==='undo'?'redo':'undo'].push(command);}else{next.undo.push(command);next.undo=trim(next.undo);next.redo=[];}
  const commit=()=>{db.fileHistory??={};db.fileHistory[key(user)]=next;};
  try{
   if(restoring){
    const record=db.trash?.find(r=>r.id===(entry?.trash||trashId)&&r.owner===user.id);if(!record)error('Papierkorb-Eintrag nicht gefunden.',404);
    if(entry&&entry.version!==await fingerprint(record.entries,storage.trashPath(record),entry.fingerprintVersion!==2))error('Der Papierkorb-Inhalt wurde zwischenzeitlich geändert.');
    command.name=record.name;command.node=record.entries[0].id;command.trash=record.id;
    const priorVersions=new Set([await fingerprint(record.entries,storage.trashPath(record))]);if([...next.undo,...next.redo].some(prior=>prior!==command&&prior.node===command.node&&prior.trash===record.id&&prior.fingerprintVersion!==2))priorVersions.add(await fingerprint(record.entries,storage.trashPath(record),true));
    await operations.restore(user,record.id,{checkTarget:parent=>assertUnlocked([parent.id],request),beforeSave:async(root,entries)=>{command.version=await fingerprint(entries,filePath(root));command.fingerprintVersion=2;for(const side of ['undo','redo'])for(const prior of next[side])if(prior!==command&&prior.node===command.node&&prior.trash===record.id&&priorVersions.has(prior.version)){prior.version=command.version;prior.fingerprintVersion=2;}commit();}});
   }else{
    node=entry?get(entry.node):node;if(!owned(node,user))error('Datei oder Ordner nicht gefunden.',404);
    const entries=tree(node);assertUnlocked(entries.map(n=>n.id),request);
    if(entry&&entry.version!==await fingerprint(entries,filePath(node),entry.fingerprintVersion!==2))error('Die wiederhergestellten Dateien wurden zwischenzeitlich geändert.');
    await operations.trash(user,node,{preserveHistory:user,beforeSave:async record=>{const oldTrash=command.trash,oldVersion=command.version;command.trash=record.id;command.version=await fingerprint(record.entries,storage.trashPath(record));command.fingerprintVersion=2;for(const side of ['undo','redo'])for(const prior of next[side])if(prior!==command&&prior.node===command.node&&prior.trash===oldTrash&&prior.version===oldVersion){prior.trash=record.id;prior.version=command.version;prior.fingerprintVersion=2;}commit();}});
   }
   return{ok:true,trashed:!restoring,id:command.node,recordId:command.trash,history:state(user)};
  }catch(e){db.fileHistory??={};db.fileHistory[key(user)]=previous;throw e;}
 }
 async function batch(user,{action,ids},request){
  if(!storage.enabled)error('Mehrfachaktionen benötigen den Profil-Dateispeicher.',400);
  if(!['delete','restore'].includes(action)||!Array.isArray(ids)||!ids.length||ids.length>100||ids.some(value=>typeof value!=='string'))error('Bitte 1–100 gültige Elemente auswählen.',400);
  let selected=[...new Set(ids)];
  if(action==='delete'){
   const all=new Set(selected);for(const value of selected){const node=get(value);if(!owned(node,user))error('Datei oder Ordner nicht gefunden.',404);if(node.system)error('Standardordner können nicht gelöscht werden.',400);}
   selected=selected.filter(value=>{let node=get(get(value).parent);const seen=new Set();while(node&&!seen.has(node.id)){if(all.has(node.id))return false;seen.add(node.id);node=get(node.parent);}return true;});
  }else{
   const records=selected.map(value=>db.trash?.find(r=>r.id===value&&r.owner===user.id));if(records.some(r=>!r))error('Papierkorb-Eintrag nicht gefunden.',404);
   // Restore a selected parent before separately deleted children.
   const pending=[...records],ordered=[];while(pending.length){const index=pending.findIndex(r=>!pending.some(parent=>parent!==r&&parent.entries.some(n=>n.id===r.originalParent)));if(index<0)error('Zyklische Papierkorb-Struktur.');ordered.push(pending.splice(index,1)[0].id);}selected=ordered;
  }
  const batch=id();let completed=0;
  try{for(const value of selected){await recycle(user,action,{node:action==='delete'?get(value):undefined,trashId:action==='restore'?value:undefined,batch,request});completed++;}}
  catch(e){if(completed){e.message=completed+' von '+selected.length+' Elementen abgeschlossen und gemeinsam im Verlauf gespeichert. '+(e.status?e.message:'Der Dateivorgang konnte nicht abgeschlossen werden.');e.status??=409;}throw e;}
  return{ok:true,completed,history:state(user)};
 }
 return{state,rename,replay,batch,recordTransfer,discardTransferItem,discardReceipts,setTransferExecutor:executor=>{transferExecutor=executor;},discardNodes,discardTrash,trash:(user,node,request)=>recycle(user,'delete',{node,request}),restore:(user,trashId,request)=>recycle(user,'restore',{trashId,request})};
}
