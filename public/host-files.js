import {fileIcon} from './file-icons.js';
import {createPropertyDialog} from './property-dialog.js';

export const HOST_ROOT='host:/',HOST_TRASH='host-trash:';
export const isHostId=id=>typeof id==='string'&&(id.startsWith('host:/')||id.startsWith(HOST_TRASH));
export function hostIdFromURL(value){
 try{const url=new URL(value,'https://desktop.invalid');if(!/^\/Network\/Hostsystem(?:\/|$)/.test(url.pathname))return null;if(url.searchParams.get('hostTrash')==='1')return HOST_TRASH;return 'host:'+(decodeURIComponent(url.pathname.slice('/Network/Hostsystem'.length))||'/');}catch{return null;}
}

export function createHostFiles({request,getState,confirm}){
 const cache=new Map(),loaded=new Set();
 const enabled=()=>{const state=getState();return state.authenticated&&state.role==='admin'&&!state.readonly&&state.hostCommandsEnabled;};
 const webPath=path=>'/Network/Hostsystem'+(path==='/'?'/':path.split('/').map(encodeURIComponent).join('/'));
 function remember(meta){const path=meta.path.replace(/\/$/,'')||'/',id='host:'+path,parent=path==='/'?'@network':'host:'+(path.slice(0,path.lastIndexOf('/'))||'/');const node={...meta,id,parent,host:true,hostPath:path,path:webPath(path),name:path==='/'?'Hostsystem':meta.name,created:meta.modified?new Date(meta.modified*1000).toISOString():null,hidden:meta.name?.startsWith('.'),system:path==='/',icon:path==='/'?'computer':undefined};cache.set(id,node);return node;}
 function get(id){if(!enabled()||!isHostId(id))return null;if(id===HOST_TRASH)return{id:HOST_TRASH,parent:HOST_ROOT,name:'Host-Papierkorb',kind:'folder',host:true,hostTrash:true,system:true,writable:false,path:webPath('/')+'?hostTrash=1',icon:'recycle-empty'};if(cache.has(id))return cache.get(id);if(id!==HOST_ROOT)return null;return remember({path:'/',name:'Hostsystem',kind:'folder',writable:true});}
 const children=id=>!enabled()?[]:[...cache.values()].filter(n=>n.parent===id).concat(id===HOST_ROOT?[get(HOST_TRASH)]:[]);
 async function call(action,data={}){if(!enabled())throw Error('Das Host-Dateisystem erfordert ein Administratorkonto.');let result=await request('/api/host-files/'+action,data);if(result.requiresConfirmation){if(!await confirm(result.preview))throw Error('Befehl abgebrochen.');result=await request('/api/host-files/'+action,{...data,confirmed:true});}if(result.node)remember(result.node);return result;}
 async function stat(id){if(id===HOST_TRASH)return get(id);if(!enabled()||typeof id!=='string'||!id.startsWith('host:/'))throw Error('Host-Datei nicht gefunden.');const result=await call('stat',{path:id.slice(5)});return remember(result.node);}
 async function ensure(id,refresh=false){
  if(!enabled()||!isHostId(id))throw Error('Host-Datei nicht gefunden.');if(loaded.has(id)&&!refresh)return;
  if(id===HOST_TRASH){const result=await call('trash-list');for(const [key,node]of cache)if(node.parent===id)cache.delete(key);for(const record of result.entries)cache.set(HOST_TRASH+record.id,{id:HOST_TRASH+record.id,parent:id,name:record.name,kind:record.kind,size:record.size,host:true,hostTrash:true,trashId:record.id,original:record.original,reason:record.reason,created:new Date(record.time*1000).toISOString(),writable:false,path:webPath('/')+'?hostTrash=1'});loaded.add(id);return;}
  const node=await stat(id);if(node.kind!=='folder')return;if(id!==HOST_ROOT&&!loaded.has(node.parent))await ensure(node.parent);
  const result=await call('list',{path:node.hostPath});for(const [key,entry]of cache)if(entry.parent===id)cache.delete(key);remember(result.node);for(const entry of result.entries)remember(entry);loaded.add(id);
 }
 async function properties(node){
  const info=node.hostTrash?node:await stat(node.id),dialog=createPropertyDialog('Eigenschaften von '+info.name),{el}=dialog,page=dialog.tab('Allgemein'),values=el('dl',undefined,'fp-values');
  const summary=el('div',undefined,'fp-summary'),icon=el('img');icon.src=info.icon?'/icons/'+info.icon+'.png':info.kind==='folder'?'/icons/folder.png':fileIcon(info.name,false);icon.alt='';summary.append(icon,el('span',info.name));page.append(summary);
  const detail=(label,value)=>values.append(el('dt',label),el('dd',String(value??'Nicht verfügbar')));
  detail('Typ:',info.kind==='folder'?'Dateiordner':'Datei');detail('Ort:',info.original||info.hostPath);detail('Größe:',info.kind==='folder'?'Nicht berechnet':info.size==null?'Nicht verfügbar':new Intl.NumberFormat('de-DE').format(info.size)+' Bytes');detail('Geändert:',info.created?new Date(info.created).toLocaleString('de-DE'):'Nicht verfügbar');
  if(info.hostTrash)detail('Grund:',info.reason==='saved'?'Sicherung vor dem Speichern':info.reason==='replaced'?'Sicherung vor dem Ersetzen':'In den Papierkorb verschoben');
  else{detail('Besitzer (UID):',info.uid);detail('Gruppe (GID):',info.gid);detail('Linux-Berechtigungen:',info.mode);detail('Symbolischer Link:',info.symlink?'Ja':'Nein');}
  page.append(values);const security=dialog.tab('Sicherheit');security.append(el('p','Zugriff über diesen Desktop: Administratoren.'),el('p','Die zugrunde liegenden Linux-Berechtigungen werden oben angezeigt. Normale Desktop-Nutzer erhalten über diese Ansicht keinen Host-Zugriff.'));dialog.show();
 }
 return{enabled,get,children,stat,ensure,properties,call,reset(){cache.clear();loaded.clear();},root:()=>enabled()?get(HOST_ROOT):null,
  download:node=>'/api/host-files/download?'+new URLSearchParams({path:node.hostPath}),
  async restore(node){const result=await call('restore',{trashId:node.trashId});loaded.delete(HOST_TRASH);return result;},
  async adapt(url,data){
   const parsed=new URL(url,'https://desktop.invalid'),id=data?.id||parsed.searchParams.get('id'),parent=data?.parent;
   if(!isHostId(id)&&!isHostId(parent))return null;
   let node=get(id),target=get(parent),result;
   if(parsed.pathname==='/api/text')return data===undefined?call('read',{path:id.slice(5)}):call('write',{path:id.slice(5),content:data.content,version:data.version});
   if(!node&&id?.startsWith('host:/'))node=await stat(id);if(!target&&parent?.startsWith('host:/'))target=await stat(parent);
   if(parsed.pathname==='/api/rename'){result=await call('rename',{path:node.hostPath,name:data.name,version:node.version});for(const [key,entry]of cache)if(key===id||entry.hostPath?.startsWith(node.hostPath+'/'))cache.delete(key);}
   else if(parsed.pathname==='/api/delete'){result=await call('trash',{path:node.hostPath,version:node.version});for(const [key,entry]of cache)if(key===id||entry.hostPath?.startsWith(node.hostPath+'/'))cache.delete(key);}
   else if(parsed.pathname==='/api/folder'||parsed.pathname==='/api/new-text')result=await call(parsed.pathname==='/api/folder'?'mkdir':'create',{path:target.hostPath,name:data.name});
   else throw Error('Diese Dateiaktion ist für Host-Dateien noch nicht integriert.');
   loaded.clear();return{...result,...(result.node?{id:'host:'+result.node.path}:{})};
  }
 };
}
