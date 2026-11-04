import {classicDialog} from './classic-dialog.js';
import {fileIcon} from './file-icons.js';

export function fileConflict(file,existing,{mode='copy'}={}){
 return new Promise(resolve=>{
  if(!document.querySelector('link[href="/file-transfer.css"]')){const css=document.createElement('link');css.rel='stylesheet';css.href='/file-transfer.css';document.head.append(css);}
  const verb=mode==='move'?'Verschieben':'Kopieren',title=mode==='move'?'Datei verschieben':'Datei kopieren';
  const {dialog,body,show}=classicDialog(title,'file-conflict'),el=(tag,text)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;return node;};let answer='cancel';
  body.append(el('h2','Im Ziel ist bereits eine Datei mit diesem Namen vorhanden.'),el('p',file.name));
  for(const [value,title,description]of [['replace',verb+' und ersetzen','Die vorhandene Datei wird vor dem Ersetzen gesichert.'],['skip','Nicht '+verb.toLowerCase(),'Die vorhandene Datei im Zielordner bleibt erhalten.'],['both',verb+', aber beide Dateien behalten','Die neue Datei erhält einen zusätzlichen Namen.']]){
   const button=el('button'),icon=el('img');icon.src=file.kind==='folder'?'/icons/folder.png':file.kind==='link'?'/icons/link.png':fileIcon(file.name,false);icon.alt='';button.type='button';button.append(icon,el('strong',title),el('span',description));button.onclick=()=>{answer=value;dialog.close();};if(value==='replace'&&(!['file','link'].includes(existing.kind)||existing.symlink||(file.kind||'file')!==existing.kind))button.disabled=true;body.append(button);
  }
  const footer=el('footer'),cancel=el('button','Abbrechen');cancel.onclick=()=>dialog.close();footer.append(cancel);body.append(footer);dialog.addEventListener('close',()=>resolve(answer),{once:true});show();
 });
}

export async function transferHostEntry({id,parent,mode,name,request,confirm,conflict=fileConflict,execute,route='/api/host-transfer'}){
 let data={id,parent,mode,name},preview=await request(route,data);
 if(preview.tree){
  const choices=Object.create(null);
  while(preview.conflicts.length){
   for(const entry of preview.conflicts){const action=await conflict({name:entry.relative||name,kind:entry.kind},entry.existing,{mode});if(action==='cancel')return {cancelled:true};choices[entry.relative]={action,version:entry.existing.version};}
   preview=await request(route,{...data,choices});
  }
  if(preview.totalItems===0)return {skipped:true};
  if(!await confirm((mode==='move'?'Ordner verschieben: ':'Ordner kopieren: ')+preview.preview+'\n'+preview.totalItems+' Einträge'+(preview.merge?'\nVorhandene Ordner werden zusammengeführt.':'')+'\nFertige Elemente bleiben bei einem Abbruch erhalten.'))return {cancelled:true};
  return execute({...data,choices,sourceVersion:preview.sourceVersion,confirmed:true});
 }
 if(preview.existing){
  const choice=await conflict({name,kind:preview.kind},preview.existing,{mode});if(choice==='cancel')return {cancelled:true};if(choice==='skip')return {skipped:true};
  if(choice==='replace')data={...data,overwrite:true,version:preview.existing.version};
  else{const dot=name.lastIndexOf('.'),stem=dot>0?name.slice(0,dot):name,ext=dot>0?name.slice(dot):'';let index=2;do{data.name=stem+' ('+(index++)+')'+ext;preview=await request(route,data);}while(preview.existing);}
 }
 if(!await confirm((mode==='move'?'Verschieben: ':'Kopieren: ')+preview.preview+(data.overwrite?'\nVorhandene Zieldatei ersetzen und sichern.':'')))return {cancelled:true};
 return execute({...data,sourceVersion:preview.sourceVersion,confirmed:true});
}

export async function uploadHostFiles({files,path,request,confirm,conflict=fileConflict,transfer,upload}){
 const plan=[],reserved=new Set();
 for(const file of files){
  let name=file.name,preview=await request('/api/host-files/upload-start',{path,name,size:file.size}),overwrite=false;
  if(preview.existing||reserved.has(name)){
   const choice=await conflict(file,preview.existing||{kind:'file'});if(choice==='cancel')return {cancelled:true,completed:0};if(choice==='skip')continue;
   if(choice==='replace'){if(reserved.has(name))throw Error('Derselbe Zielname wurde mehrfach ausgewählt. Bitte beide Dateien behalten.');overwrite=true;}
   else {const dot=name.lastIndexOf('.'),stem=dot>0?name.slice(0,dot):name,ext=dot>0?name.slice(dot):'';let index=2;do{name=stem+' ('+(index++)+')'+ext;preview=await request('/api/host-files/upload-start',{path,name,size:file.size});}while(preview.existing||reserved.has(name));}
  }
  reserved.add(name);plan.push({file,name,overwrite,version:overwrite?preview.existing?.version:undefined});
 }
 if(!plan.length)return {cancelled:false,completed:0};
 if(!await confirm('Hochladen nach '+path+'\n'+plan.map(item=>item.name+(item.overwrite?' (vorhandene Datei ersetzen)':'')).join('\n')))return {cancelled:true,completed:0};
 const progress=transfer({verb:'Hochladen',count:plan.length,totalBytes:plan.reduce((sum,item)=>sum+item.file.size,0),from:'Dieser PC',to:path,bytes:true});let completed=0,loaded=0;
 try{for(const item of plan){
  if(progress.cancelled)break;progress.update({name:item.name,completed,loaded});let uploadId;
  try{
   ({uploadId}=await request('/api/host-files/upload-start',{path,name:item.name,size:item.file.size,overwrite:item.overwrite,version:item.version,confirmed:true}));
   if(progress.cancelled)break;
   await upload('/api/host-files/upload?'+new URLSearchParams({uploadId}),item.file,event=>progress.update({loaded:loaded+event.loaded}),progress);
   uploadId=null;loaded+=item.file.size;completed++;progress.update({completed,loaded});
  }finally{if(uploadId)await request('/api/host-files/upload-abort',{uploadId}).catch(()=>{});}
 }return {cancelled:progress.cancelled,completed};
 }finally{progress.close();}
}
