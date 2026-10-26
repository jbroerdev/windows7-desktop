const types={text:{name:'Word',extension:'odt',icon:'word'},sheet:{name:'Excel',extension:'ods',icon:'excel'},presentation:{name:'PowerPoint',extension:'odp',icon:'powerpoint'}};
export const officeFile=n=>n?.kind==='file'&&/\.(docm?|docx|dotx?|odt|ott|rtf|xlsx?|xlsm|xltx?|ods|ots|csv|pptx?|ppsx?|odp|otp|pdf)$/i.test(n.name);
export function createOfficeWindows({desktop,api,chooseFile,getState,reload,getNode,toast}){
 let serial=0;
 function open(node=null,kind='text',resumeState={}){
  if(!getState().officeEnabled){toast('Office ist noch nicht eingerichtet.');return;}
  const type=types[kind]||types.text,el=(tag,text)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e;};
  const dialog=el('dialog'),bar=el('header'),title=el('span',type.name),min=el('button'),max=el('button'),close=el('button'),toolbar=el('nav'),menu=el('details'),label=el('summary','Datei'),items=el('div'),status=el('footer','Dokument wird vorbereitet …'),stage=el('section');
  dialog.className='office-window';dialog.id='office-window-'+(++serial);title.id=dialog.id+'-title';toolbar.className='office-menubar';menu.className='office-file-menu';status.className='office-status';stage.className='office-stage';status.setAttribute('role','status');menu.append(label,items);toolbar.append(menu);bar.append(title,min,max,close);dialog.append(bar,toolbar,stage,status);document.body.append(dialog);
  let frame=null,grant=null,temporary=false,disposed=false,ready=false,pending=null,saveTimer=null,busy=false,dirty=false;
  const send=(MessageId,Values={})=>{if(frame&&grant)frame.contentWindow.postMessage(JSON.stringify({MessageId,SendTime:Date.now(),Values}),grant.origin);};
  const action=(name,fn)=>{const b=el('button',name);b.type='button';b.onclick=()=>{menu.open=false;Promise.resolve(fn()).catch(e=>{status.textContent=e.message;toast(e.message);});};items.append(b);return b;};
  async function confirmChanges(){return new Promise(resolve=>{const prompt=el('dialog'),text=el('p','Änderungen an „'+node.name+'“ speichern?'),yes=el('button','Speichern'),no=el('button','Nicht speichern'),cancel=el('button','Abbrechen');prompt.className='office-discard-dialog';prompt.append(text,yes,no,cancel);document.body.append(prompt);const done=value=>{prompt.close();prompt.remove();resolve(value);};yes.onclick=()=>done('save');no.onclick=()=>done('discard');cancel.onclick=()=>done('cancel');prompt.oncancel=e=>{e.preventDefault();done('cancel');};prompt.showModal();});}
  async function leave(next){if(!dirty){await next();return;}const choice=await confirmChanges();if(choice==='save')await saveDocument(next);else if(choice==='discard')await next();}
  function updateTitle(){title.textContent=(node?.name||type.name)+(dirty?' *':'')+(node?' – '+type.name:'');}
  async function discard(id){if(id)await api('/api/office-discard',{id});}
  async function load(file){
   ready=false;status.textContent='Dokument wird geöffnet …';if(!file.temporary&&!file.workingCopy&&getState().authenticated)file=await api('/api/office-edit',{id:file.id,open:true});if(disposed){if(file.temporary||file.workingCopy)await discard(file.id);return;}const nextGrant=file.grant||await api('/api/office-open',{id:file.id,readOnly:!getState().authenticated});
   if(disposed){if(file.temporary||file.workingCopy)await discard(file.id);return;}const oldDraft=node?.temporary||node?.workingCopy?node.id:null;grant=nextGrant;node=file;temporary=!!file.temporary;dirty=false;updateTitle();stage.replaceChildren();
   frame=el('iframe');frame.name=dialog.id+'-frame-'+Date.now();frame.title=title.textContent;frame.referrerPolicy='no-referrer';frame.allow='fullscreen; clipboard-read; clipboard-write';frame.setAttribute('sandbox','allow-scripts allow-same-origin allow-forms allow-downloads allow-popups allow-modals');stage.append(frame);frame.addEventListener('load',()=>send('Host_PostmessageReady'));
   const form=el('form');form.method='POST';form.action=grant.url;form.target=frame.name;form.hidden=true;
   for(const[name,value]of Object.entries({access_token:grant.accessToken,access_token_ttl:grant.accessTokenTtl,ui_defaults:'UIMode=classic'})){const input=el('input');input.type='hidden';input.name=name;input.value=String(value);form.append(input);}dialog.append(form);form.submit();form.remove();if(oldDraft&&oldDraft!==file.id)await discard(oldDraft);
  }
  async function fresh(template){if(busy)return;await leave(async()=>{busy=true;let draft;try{draft=await api('/api/office-draft',{kind,template,open:true});await load(draft);}catch(e){if(draft)await discard(draft.id);throw e;}finally{busy=false;}});}
  async function pickFile(){const result=await chooseFile({title:type.name+' – Öffnen',filter:officeFile});if(result)await leave(()=>load(result.node));}
  async function template(){const result=await chooseFile({title:'Vorlage wählen (.'+type.extension+')',filter:n=>n.kind==='file'&&[type.extension,{text:'ott',sheet:'ots',presentation:'otp'}[kind]].some(ext=>n.name.toLowerCase().endsWith('.'+ext))});if(result)await fresh(result.node.id);}
  function flush(after){if(!ready||!grant?.writable||pending){toast('Bitte warten, bis das Dokument bereit ist.');return;}pending=after;status.textContent='Änderungen werden übernommen …';send('Action_Save',{DontTerminateEdit:true,DontSaveIfUnmodified:false,Notify:true});saveTimer=setTimeout(()=>{pending=null;status.textContent='Keine Speicherbestätigung. Die Datei bleibt geöffnet.';},20000);}
  async function saveDocument(after=()=>{},saveAs=false){if(!temporary&&!saveAs){flush(async()=>{if(node.workingCopy)await api('/api/office-commit',{id:node.id});dirty=false;updateTitle();await reload();status.textContent='Gespeichert';await after();});return;}const destination=await chooseFile({title:type.name+' – Speichern unter',save:true,name:temporary?'Neues Dokument.'+type.extension:node.name});if(!destination)return;flush(async()=>{const result=await api('/api/office-save-draft',{...destination,id:node.id});await reload();await load(getNode(result.id));await after();});}
  async function requestClose(){if(pending)return;await leave(async()=>{if(node?.temporary||node?.workingCopy)await discard(node.id);dialog.close();});}
  const message=async event=>{
   if(disposed||!frame||event.source!==frame.contentWindow||event.origin!==grant?.origin)return;let data;try{data=typeof event.data==='string'?JSON.parse(event.data):event.data;}catch{return;}
   try{
    if(data?.MessageId==='App_LoadingStatus'&&data.Values?.Status==='Document_Loaded'){ready=true;send('Disable_Default_UIAction',{action:'UI_Save',disable:true});send('Disable_Default_UIAction',{action:'UI_Close',disable:true});status.textContent=temporary?'Nicht gespeichert':grant.writable?'Bereit':'Schreibgeschützt';}
    if(data?.MessageId==='Doc_ModifiedStatus'&&data.Values?.Modified===true){dirty=true;updateTitle();status.textContent=temporary?'Nicht gespeichert':'Geändert';}
    if(data?.MessageId==='Action_Save_Resp'&&pending){clearTimeout(saveTimer);const done=pending;pending=null;if(data.Values?.success===true||data.Values?.result==='unmodified')await done();else{status.textContent='Speichern fehlgeschlagen: '+(data.Values?.errorMsg||data.Values?.result||'Keine Fehlerdetails von Collabora.');toast(status.textContent);}}
    if(data?.MessageId==='UI_Save')await saveDocument();
    if(data?.MessageId==='UI_SaveAs')await saveDocument(()=>{},true);
    if(data?.MessageId==='UI_Close')await requestClose();
    if(data?.MessageId==='UI_CreateFile')await fresh();
   }catch(e){status.textContent=e.message;toast(e.message);}
  };
  window.addEventListener('message',message);
  action('Neu',()=>fresh());action('Aus Vorlage …',template);action('Öffnen …',pickFile);action('Speichern',()=>saveDocument());action('Speichern unter …',()=>saveDocument(()=>{},true));action('Schließen',requestClose);
  desktop.register(dialog,{bar,title,minimizeButton:min,maximizeButton:max,closeButton:close,close:()=>requestClose().catch(e=>toast(e.message)),appId:'office-'+kind,icon:'/icons/'+type.icon+'.png',minWidth:620,minHeight:400});
  dialog.addEventListener('cancel',e=>{e.preventDefault();requestClose().catch(e=>toast(e.message));});
  dialog.addEventListener('close',()=>{disposed=true;clearTimeout(saveTimer);window.removeEventListener('message',message);desktop.unregister(dialog.id);if(frame)frame.src='about:blank';dialog.remove();});
  dialog.workspaceState=async()=>{if(!ready||busy||pending)throw Error('Office ist noch beschäftigt. Bitte kurz warten.');if(!node?.temporary&&!node?.workingCopy)return {type:'office-file',id:node.id,kind};if(grant?.writable)await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error('Office hat den Arbeitsstand nicht bestätigt.')),22000);flush(()=>{clearTimeout(timeout);resolve();});});const saved=await api('/api/office-checkpoint',{id:node.id});return {type:'office',kind,checkpoint:saved.id,dirty};};
  desktop.show(dialog.id);Promise.resolve(node?load(node):fresh()).then(()=>{if(resumeState.dirty){dirty=true;updateTitle();status.textContent='Geändert';}}).catch(e=>{status.textContent=e.message;toast(e.message);});return dialog;
 }
 return {open};
}
