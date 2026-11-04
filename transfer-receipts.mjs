import {promises as fs} from 'node:fs';
import path from 'node:path';
import {createHmac,randomBytes} from 'node:crypto';

export async function createTransferReceipts({db,storage,metadataDir,id,save,onRecord=()=>{},onPrune=()=>{},onRemove=()=>{}}){
 const filename=path.join(metadataDir,'transfer-receipt.key');let secret;
 try{secret=await fs.readFile(filename);}catch(error){if(error.code!=='ENOENT')throw error;await fs.mkdir(metadataDir,{recursive:true});secret=randomBytes(32);await fs.writeFile(filename,secret,{flag:'wx',mode:0o600});}
 if(secret.length!==32)throw Error('Ungültiger Schlüssel für Übertragungsbelege.');
 await fs.chmod(filename,0o600);
 const scope=user=>user.id+(user.shareEditing?':share':':personal');
 const descriptor=receipt=>Object.fromEntries(['id','owner','scope','mode','name','source','parent','created','batch'].map(key=>[key,receipt[key]]));
 function begin(user,{mode,source,parent,batch}){const scopeKey=scope(user),prior=(db.transferReceipts||[]).filter(r=>r.scope===scopeKey&&r.batch===batch);if(typeof batch!=='string'||!/^[a-f0-9-]{36}$/.test(batch)||prior.length&&(prior.some(r=>r.mode!==mode||r.parent!==parent.id)||db.fileHistory?.[scopeKey]?.undo.at(-1)?.batch!==batch))batch=undefined;return{id:id(),...(batch?{batch}:{}),owner:user.id,scope:scope(user),mode,name:source.name,source:source.id,parent:parent.id,created:new Date().toISOString(),status:'running',items:[]};}
 function attach(receipt){db.transferReceipts??=[];const found=db.transferReceipts.find(r=>r.id===receipt.id);if(found)return found;db.transferReceipts.push(receipt);return receipt;}
 function prune(){const groups=new Map();for(const receipt of db.transferReceipts||[]){const key=receipt.scope+':'+(receipt.batch||receipt.id);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(receipt);}const kept=new Set(),counts=new Map();for(const group of [...groups.values()].reverse()){const scope=group[0].scope,count=counts.get(scope)||{groups:0,items:0},items=group.reduce((sum,r)=>sum+r.items.length,0);if(count.groups>=50||count.items+items>20000&&count.groups)continue;count.groups++;count.items+=items;counts.set(scope,count);for(const receipt of group)kept.add(receipt.id);}const removed=(db.transferReceipts||[]).filter(r=>!kept.has(r.id)).map(r=>r.id);db.transferReceipts=(db.transferReceipts||[]).filter(r=>kept.has(r.id));if(removed.length)onPrune(removed);}
 async function snapshot(node,actual,format=2){let physical=null;if(node.kind!=='link'){const info=await fs.lstat(actual??storage.path(node,{ensure:false}));if(info.isSymbolicLink()||node.kind==='file'&&!info.isFile()||node.kind==='folder'&&!info.isDirectory())throw Error('Dateityp des Übertragungsbelegs wurde geändert.');physical=[String(info.dev),String(info.ino),info.birthtimeMs,...(info.isFile()?[info.size,info.mtimeMs]:[])];}
  // The private, persistent HMAC key also protects credential-bearing link metadata.
  // Size and modified are scan caches, not independent mutations. File size and
  // mtime are already guarded by the physical snapshot; directory mtimes change
  // legitimately while undo removes the operation's own children.
  const metadata={...node};delete metadata.size;if(format>=2&&node.kind!=='link')delete metadata.modified;
  return createHmac('sha256',secret).update(JSON.stringify([metadata,physical])).digest('hex');
 }
 async function record(receipt,{key,kind,node,backup,trash,digest}){
  const existing=db.transferReceipts?.find(r=>r.id===receipt.id);if(existing?.items.some(item=>item.key===key)){onRecord(existing,existing.items.find(item=>item.key===key));return existing;}
  const item={key,kind,node:node.id,parent:node.parent,name:node.name,nodeKind:node.kind,versionFormat:2,version:await snapshot(node,trash?storage.trashPath(trash):undefined)};
  if(backup){item.backup=backup.id;item.backupVersion=await snapshot(backup.entries[0],backup.kind==='link'?undefined:storage.trashPath(backup));}
  if(trash)item.trash=trash.id;
  if(digest)item.digest=digest;
  receipt=attach(receipt);receipt.items.push(item);onRecord(receipt,item);receipt.updated=new Date().toISOString();prune();return receipt;
 }
 function remove(receipt,key){const found=db.transferReceipts?.find(r=>r.id===receipt.id),item=found?.items.find(i=>i.key===key);if(!item)return;found.items=found.items.filter(i=>i!==item);onRemove(found,item);if(!found.items.length)db.transferReceipts=db.transferReceipts.filter(r=>r!==found);}
 async function finish(receipt,status){if(!receipt.items.length&&!db.transferReceipts?.some(r=>r.id===receipt.id))return;receipt=attach(receipt);receipt.status=status;receipt.updated=new Date().toISOString();prune();await save(false);}
 async function recover(value,mutation,node){if(!value||!mutation||!['copy','move'].includes(value.mode)||!['created','replaced'].includes(mutation.kind))return;if(!/^[a-f0-9]{32}$/.test(value.id)||![value.owner+':personal',value.owner+':share'].includes(value.scope))throw Error('Ungültiger wiederhergestellter Übertragungsbeleg.');let receipt=db.transferReceipts?.find(r=>r.id===value.id);receipt??={...descriptor(value),status:'interrupted',items:[]};const backup=mutation.backup?db.trash?.find(r=>r.id===mutation.backup):null;if(mutation.kind==='replaced'&&!backup)throw Error('Sicherung für wiederhergestellten Übertragungsbeleg fehlt.');await record(receipt,{...mutation,node,backup});receipt.status='interrupted';}
 let changed=false;for(const receipt of db.transferReceipts||[])if(receipt.status==='running'){receipt.status='interrupted';changed=true;}if(changed)await save(false);
 return{begin,record,remove,finish,recover,descriptor,snapshot,list:user=>(db.transferReceipts||[]).filter(r=>r.scope===scope(user)).map(r=>structuredClone(r))};
}
