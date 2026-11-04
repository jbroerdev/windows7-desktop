import {promises as fs} from 'node:fs';

export function createTransferReplay({db,get,owned,storage,receipts,operations}){
 const fail=(message,status=409)=>{throw Object.assign(Error(message),{status});};
 return async function replay(user,entry,direction,request,{assertUnlocked,commit}){
  const receipt=db.transferReceipts?.find(r=>r.id===entry.receipt&&r.scope===user.id+(user.shareEditing?':share':':personal')),item=receipt?.items.find(i=>i.key===entry.item);
  if(!item||![1,2].includes(item.versionFormat))fail('Der Übertragungsbeleg ist nicht mehr verfügbar.');
  const before=structuredClone(item),desired=direction==='redo';if((item.applied!==false)===desired)fail('Dieser Übertragungsschritt wurde bereits ausgeführt.');
  const expected=()=>item.currentVersion||item.version,snapshot=(node,actual)=>receipts.snapshot(node,actual,item.versionFormat);
  const live=()=>{const node=get(item.node);if(!owned(node,user)||node.system)fail('Das übertragene Element ist nicht mehr beschreibbar.',403);assertUnlocked([node.id],request);return node;};
  const backup=()=>{const record=db.trash?.find(r=>r.id===item.backup&&r.owner===user.id);if(!record)fail('Die Sicherung für das ersetzte Element fehlt.');return record;};
  try{
   if(item.kind==='replaced'){
    const node=live(),record=backup();
    const validate=async()=>{live();if(await snapshot(node)!==expected()||await snapshot(record.entries[0],record.kind==='link'?undefined:storage.trashPath(record))!==item.backupVersion)fail('Ziel oder Sicherung wurde nach der Übertragung geändert.');};
    await validate();await operations.exchange(user,node,record.id,{validate,beforeSave:async current=>{item.versionFormat=2;item.backup=current.id;item.backupVersion=await snapshot(current.entries[0],current.kind==='link'?undefined:storage.trashPath(current));item.currentVersion=await snapshot(node);item.applied=desired;commit();}});
   }else{
    const restoring=item.kind==='source'?direction==='undo':direction==='redo';
    if(restoring){
     const record=db.trash?.find(r=>r.id===item.trash&&r.owner===user.id);if(!record||record.entries[0]?.id!==item.node)fail('Der gesicherte Übertragungsschritt fehlt.');
     if(await snapshot(record.entries[0],record.kind==='link'?undefined:storage.trashPath(record))!==expected())fail('Der gesicherte Inhalt wurde verändert.');
     const parent=record.originalParent===null?{id:null,owner:record.entries[0].owner,kind:'folder',space:'home'}:get(record.originalParent);
     if(!parent||!(owned(parent,user)||parent.programRoot||parent.driveRoot))fail('Der ursprüngliche Ordner ist nicht mehr zugänglich.',403);
     await operations.restore(user,record.id,{exactParent:parent,checkTarget:parent=>assertUnlocked([parent.id].filter(Boolean),request),beforeSave:async node=>{item.versionFormat=2;item.currentVersion=await snapshot(node);item.applied=desired;commit();}});
    }else{
     const node=live();if(await snapshot(node)!==expected())fail('Das übertragene Element wurde nachträglich verändert.');
     if(node.kind==='folder'&&(db.nodes.some(n=>n.parent===node.id)||(await fs.readdir(storage.path(node,{ensure:false}))).length))fail('Der Ordner enthält zusätzliche Elemente und bleibt erhalten.');
     await operations.trash(user,node,{preserveHistory:user,beforeSave:async record=>{item.versionFormat=2;item.trash=record.id;item.currentVersion=await snapshot(record.entries[0],record.kind==='link'?undefined:storage.trashPath(record));item.applied=desired;entry.trash=record.id;commit();}});
    }
   }
  }catch(error){for(const key of Object.keys(item))delete item[key];Object.assign(item,before);throw error;}
 };
}
