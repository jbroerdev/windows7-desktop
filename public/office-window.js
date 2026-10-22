const types={text:{name:'Textdokument',extension:'odt'},sheet:{name:'Tabelle',extension:'ods'},presentation:{name:'Präsentation',extension:'odp'}};
export const officeFile=n=>n?.kind==='file'&&/\.(docm?|docx|dotx?|odt|ott|rtf|xlsx?|xlsm|xltx?|ods|ots|csv|pptx?|ppsx?|odp|otp)$/i.test(n.name);

export function createOfficeWindows({desktop,api,chooseFile,getState,reload,getNode,toast}){
 const windows=new Set();let serial=0;
 function open(node=null,kind='text'){
  if(!getState().officeEnabled){toast('Office ist noch nicht eingerichtet.');return;}
  const type=types[kind]||types.text,el=(tag,text)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e;};
  const dialog=el('dialog'),bar=el('header'),title=el('span',node?node.name+' – Office':'Office – '+type.name),min=el('button'),max=el('button'),close=el('button'),toolbar=el('nav'),pick=el('button','Öffnen …'),create=el('button','Neu …'),save=el('button','Speichern'),status=el('span','Datei öffnen oder ein neues Dokument anlegen.'),stage=el('section');
  dialog.className='office-window';dialog.id='office-window-'+(++serial);title.id=dialog.id+'-title';toolbar.className='office-toolbar';stage.className='office-stage office-empty';stage.textContent=getState().authenticated?'Öffne ein Office-Dokument oder lege eine neue Datei an.':'Öffne ein freigegebenes Office-Dokument.';if(!getState().authenticated)status.textContent='Datei öffnen';status.setAttribute('role','status');save.disabled=true;create.hidden=!getState().authenticated;
  bar.append(title,min,max,close);toolbar.append(pick,create,save,status);dialog.append(bar,toolbar,stage);document.body.append(dialog);
  let frame=null,grant=null,loading=false,pendingClose=false,saveTimer=null,disposed=false;
  const send=(MessageId,Values={})=>{if(frame&&grant)frame.contentWindow.postMessage(JSON.stringify({MessageId,SendTime:Date.now(),Values}),grant.origin);};
  function requestSave(andClose=false){if(!grant?.writable||!frame)return;pendingClose=andClose;save.disabled=true;status.textContent='Speichern angefordert …';send('Action_Save',{DontTerminateEdit:true,DontSaveIfUnmodified:false});clearTimeout(saveTimer);saveTimer=setTimeout(()=>{pendingClose=false;save.disabled=false;status.textContent='Noch keine Speicherbestätigung. Bitte den Status im Office-Menü prüfen.';},20000);}
  function requestClose(){if(!grant?.writable){dialog.close();return;}requestSave(true);}
  const message=async event=>{
   if(disposed||!frame||event.source!==frame.contentWindow||event.origin!==grant?.origin)return;
   let data;try{data=typeof event.data==='string'?JSON.parse(event.data):event.data;}catch{return;}
   if(data?.MessageId==='App_LoadingStatus'&&data.Values?.Status==='Document_Loaded'){loading=false;status.textContent=grant.writable?'Bearbeiten · Speicherung im ursprünglichen Ordner':'Schreibgeschützte Ansicht';save.disabled=!grant.writable;}
   if(data?.MessageId==='Action_Save_Resp'){clearTimeout(saveTimer);save.disabled=false;if(data.Values?.success===true){status.textContent='Gespeichert';await reload();if(pendingClose)dialog.close();}else{pendingClose=false;status.textContent='Speichern nicht bestätigt. Bitte Meldung im Office-Fenster prüfen.';}}
   if(data?.MessageId==='UI_Close')requestClose();
  };
  window.addEventListener('message',message);
  async function load(file){
   if(loading)return;loading=true;status.textContent='Office wird geöffnet …';pick.disabled=create.disabled=true;
   try{
    grant=await api('/api/office-open',{id:file.id,readOnly:!getState().authenticated});node=file;title.textContent=file.name+' – Office';stage.replaceChildren();stage.classList.remove('office-empty');frame=el('iframe');frame.name=dialog.id+'-frame';frame.title=file.name+' – Office';frame.referrerPolicy='no-referrer';frame.allow='fullscreen; clipboard-read; clipboard-write';frame.setAttribute('sandbox','allow-scripts allow-same-origin allow-forms allow-downloads allow-popups allow-modals');stage.append(frame);
    frame.addEventListener('load',()=>send('Host_PostmessageReady'));
    // Access tokens are posted to Collabora, never placed in the iframe URL or browser history.
    const form=el('form');form.method='POST';form.action=grant.url;form.target=frame.name;form.hidden=true;
    for(const[name,value]of Object.entries({access_token:grant.accessToken,access_token_ttl:grant.accessTokenTtl})){const input=el('input');input.type='hidden';input.name=name;input.value=String(value);form.append(input);}dialog.append(form);form.submit();form.remove();
    status.textContent=grant.writable?'Office lädt …':'Schreibgeschützte Ansicht lädt …';save.disabled=!grant.writable;
   }catch(error){toast(error.message);status.textContent=error.message;loading=false;}finally{pick.disabled=create.disabled=false;}
  }
  async function pickFile(){if(grant?.writable){toast('Bitte zuerst das geöffnete Dokument speichern und schließen.');return;}const result=await chooseFile({title:'Office-Datei öffnen',filter:officeFile});if(result)load(result.node);}
  async function newFile(){if(grant?.writable){toast('Bitte zuerst das geöffnete Dokument speichern und schließen.');return;}const result=await chooseFile({title:type.name+' anlegen',save:true,name:(kind==='text'?'Neues ':'Neue ')+type.name+'.'+type.extension});if(!result)return;try{const created=await api('/api/office-new',{...result,kind:types[kind]?kind:'text'});await reload();load(getNode(created.id));}catch(error){status.textContent=error.message;toast(error.message);}}
  pick.onclick=pickFile;create.onclick=newFile;save.onclick=()=>requestSave();
  desktop.register(dialog,{bar,title,minimizeButton:min,maximizeButton:max,closeButton:close,close:requestClose,appId:'office-'+kind,icon:'/icons/documents.png',minWidth:620,minHeight:400});
  dialog.addEventListener('cancel',e=>{e.preventDefault();requestClose();});
  dialog.addEventListener('close',()=>{disposed=true;clearTimeout(saveTimer);window.removeEventListener('message',message);windows.delete(dialog);desktop.unregister(dialog.id);if(frame)frame.src='about:blank';dialog.remove();});
  windows.add(dialog);desktop.show(dialog.id);if(node)load(node);
 }
 return {open};
}
