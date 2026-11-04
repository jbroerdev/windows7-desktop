import {transferHostEntry} from './host-upload.js';

// CMD and Explorer share the versioned profile-transfer endpoint and its history.
export async function commandTransfer({node,path,moving=false,replacing=false,nodes,destination,normalize,request,confirm,execute,conflict,overwrite='prompt',batch,home,xcopy}){
 const folder=nodes.find(n=>n.kind==='folder'&&normalize(decodeURIComponent(n.path)).toLowerCase()===path.toLowerCase()),target=folder?{parent:folder.id,name:node.name}:home&&normalize(home).toLowerCase()===path.toLowerCase()?{parent:'@home',name:node.name}:destination(path),existing=nodes.find(n=>n.parent===target.parent&&n.name.toLowerCase()===target.name.toLowerCase());
 if(!xcopy&&existing?.id===node.id)throw Error('Quelle und Ziel sind identisch.');
 if(xcopy){const {assumeDirectory,...selection}=xcopy,atHome=home&&normalize(home).toLowerCase()===path.toLowerCase();if(!folder&&!atHome){if(!assumeDirectory)throw Error('XCOPY benötigt einen vorhandenen Zielordner oder /I für einen neuen Ordner.');if(existing)throw Error('Das XCOPY-Ziel ist kein Ordner.');selection.createRoot=true;}xcopy=selection;}
 if(replacing&&(!existing||existing.kind!=='file'||node.kind!=='file'))throw Error('REPLACE erwartet eine vorhandene Zieldatei und eine Quelldatei.');
 return transferHostEntry({id:node.id,parent:target.parent,name:target.name,mode:moving?'move':'copy',route:'/api/profile-transfer',request:(route,data)=>request(route,{...data,batch,xcopy}),confirm:overwrite==='replace'?async()=>true:confirm,execute:data=>execute({...data,batch,xcopy}),conflict:overwrite==='replace'?async()=> 'replace':conflict});
}
