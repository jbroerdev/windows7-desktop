import{taskbarWorkArea}from'./taskbar-state.js';
import{normalizeNotificationArea,DEFAULT_NOTIFICATION_AREA}from'./notification-area-state.js';
let serial=0;

// View/controller only. Persistence and profile permissions are supplied by the shell.
export function createNotificationAreaProperties({desktop,getPreferences=()=>({}),getTaskbar=()=>({}),getVolume=()=>({volume:80,muted:false}),canEdit=()=>false,getContextKey=()=>'',save,openControlPanel}){
 const el=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;};
 const read=()=>normalizeNotificationArea(getPreferences());
 let current;
 const refresh=()=>{if(current&&current.context!==getContextKey())current.dialog.close();};
 return{refresh,open(initial='icons'){
  refresh();
  if(current?.dialog.open){current.navigate(initial);desktop.show(current.dialog.id);return current.dialog;}
  const context=getContextKey();
  let saved=read(),draft={...saved},page=initial==='system'?'system':'icons',lastVolume=draft.volume==='off'?'show':draft.volume,saving=false;
  const dialog=el('dialog',undefined,'control-panel-window notification-area-window');dialog.id='notification-area-'+(++serial);
  const bar=el('header'),title=el('span','Infobereichsymbole'),min=el('button'),max=el('button'),close=el('button');bar.append(title,min,max,close);
  const nav=el('div',undefined,'explorer-navigation cp-navigation'),pair=el('span',undefined,'nav-pair'),back=el('button','','nav-round nav-back'),forward=el('button','','nav-round nav-forward'),address=el('div',undefined,'explorer-address'),home=el('button','Alle Systemsteuerungselemente'),crumb=el('span'),search=el('input');
  back.type=forward.type=home.type='button';back.setAttribute('aria-label','Zurück');forward.setAttribute('aria-label','Vorwärts');forward.disabled=true;back.onclick=()=>navigate('icons');home.onclick=()=>{dialog.close();openControlPanel?.('');};pair.append(back,forward);address.append(home,crumb);search.type='search';search.placeholder='Systemsteuerung durchsuchen';search.setAttribute('aria-label',search.placeholder);search.disabled=!openControlPanel;search.onkeydown=e=>{if(e.key==='Enter'&&search.value.trim()){e.preventDefault();const query=search.value.trim();dialog.close();openControlPanel?.(query);}};nav.append(pair,address,search);
  const client=el('div',undefined,'na-client'),body=el('section',undefined,'na-body'),footer=el('footer',undefined,'na-footer'),ok=el('button','OK'),cancel=el('button','Abbrechen'),error=el('p','','na-error');ok.type=cancel.type='button';error.setAttribute('role','alert');footer.append(error,ok,cancel);client.append(body,footer);dialog.append(bar,nav,client);document.body.append(dialog);
  const editable=()=>context===getContextKey()&&!!save&&!!canEdit();
  function navigate(next){page=next==='system'?'system':'icons';render();}
  function link(text,action){const b=el('button',text,'na-link');b.type='button';b.onclick=action;return b;}
  function option(select,value,text){const o=el('option',text);o.value=value;select.append(o);}
  function row(grid,name,kind,values,value,changed,description=''){
   const entry=el('div',undefined,'na-row'),item=el('div',undefined,'na-item'),icon=el('img'),text=el('div'),label=el('span',name),select=el('select');icon.src='/icons/win7-settings/notification-'+kind+'.png';icon.alt='';text.append(label);if(description)text.append(el('small',description));item.append(icon,text);select.setAttribute('aria-label',name);for(const[v,t]of values)option(select,v,t);select.value=value;select.disabled=!editable()||saving||(page==='icons'&&draft.alwaysShow);select.onchange=()=>changed(select.value);entry.append(item,select);grid.append(entry);return select;
  }
  function defaults(){if(!editable()||saving)return;draft={...DEFAULT_NOTIFICATION_AREA};lastVolume='show';render();}
  function render(){
   body.replaceChildren();title.textContent=page==='system'?'Systemsymbole':'Infobereichsymbole';crumb.textContent=' › '+title.textContent;back.disabled=page==='icons';body.classList.toggle('na-system',page==='system');ok.disabled=saving;cancel.disabled=saving;
   const heading=el('h2',page==='system'?'Systemsymbole aktivieren oder deaktivieren':'Wählen Sie die Symbole und Benachrichtigungen aus, die auf der Taskleiste angezeigt werden sollen.'),intro=el('p',page==='system'?'Wenn ein Systemsymbol deaktiviert wird, wird das Symbol entfernt, und Benachrichtigungen werden deaktiviert.':'Wenn Sie Symbole und Benachrichtigungen ausblenden, werden Sie nicht über Änderungen oder Updates benachrichtigt. Klicken Sie auf den Pfeil neben dem Infobereich auf der Taskleiste, um Symbole anzuzeigen.','na-intro'),table=el('div',undefined,'na-table'),head=el('div',undefined,'na-columns');head.append(el('strong',page==='system'?'Systemsymbole':'Symbole'),el('strong','Verhalten'));table.append(head);body.append(heading,intro,table);
   if(page==='system'){
    const binary=[['on','Ein'],['off','Aus']];
    row(table,'Uhr','clock',binary,draft.clock?'on':'off',v=>{draft.clock=v==='on';});
    row(table,'Lautstärke','volume',binary,draft.volume==='off'?'off':'on',v=>{if(v==='off'){if(draft.volume!=='off')lastVolume=draft.volume;draft.volume='off';}else draft.volume=lastVolume;});
   }else{
    const sound=getVolume()||{},description='Lautsprecher: '+(sound.muted?'Stumm':Math.max(0,Math.min(100,Number(sound.volume)||0))+'%');
    row(table,'Lautstärke','volume',[['show','Symbol und Benachrichtigungen anzeigen'],['off','Symbol und Benachrichtigungen ausblenden'],['overflow','Nur Benachrichtigungen anzeigen']],draft.alwaysShow&&draft.volume==='overflow'?'show':draft.volume,v=>{draft.volume=v;if(v!=='off')lastVolume=v;},description);
   }
   const links=el('div',undefined,'na-links');links.append(link(page==='system'?'Benachrichtigungssymbole anpassen':'Systemsymbole aktivieren oder deaktivieren',()=>navigate(page==='system'?'icons':'system')));const restore=link('Standardverhalten für Symbole wiederherstellen',defaults);restore.disabled=!editable()||saving;links.append(restore);body.append(links);
   if(page==='icons'){const label=el('label',undefined,'na-always'),check=el('input');check.type='checkbox';check.checked=draft.alwaysShow;check.disabled=!editable()||saving;check.onchange=()=>{draft.alwaysShow=check.checked;render();};label.append(check,el('span','Immer alle Symbole und Benachrichtigungen auf der Taskleiste anzeigen'));body.append(label);}
  }
  ok.onclick=async()=>{if(saving)return;if(context!==getContextKey()){dialog.close();return;}if(!editable()||JSON.stringify(draft)===JSON.stringify(saved)){dialog.close();return;}saving=true;error.textContent='';render();try{await save({...draft});saved={...draft};dialog.close();}catch(e){error.textContent=e.message||'Die Einstellungen konnten nicht gespeichert werden.';}finally{saving=false;if(dialog.open)render();}};cancel.onclick=()=>dialog.close();dialog.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();if(!saving)dialog.close();}else if(e.key==='Enter'&&!['BUTTON','SELECT'].includes(e.target.tagName)){e.preventDefault();ok.onclick();}});
  desktop.register(dialog,{bar,title,minimizeButton:min,maximizeButton:max,closeButton:close,appId:'control-panel',rememberPlacement:false,icon:'/icons/control-panel.png',minWidth:550,minHeight:460});dialog.addEventListener('close',()=>{desktop.unregister(dialog.id);dialog.remove();if(current?.dialog===dialog)current=null;});current={dialog,navigate,context};render();desktop.show(dialog.id);
  const area=taskbarWorkArea({width:innerWidth,height:innerHeight},getTaskbar()),width=Math.min(800,area.width),height=Math.min(601,area.height);desktop.applyWorkspaceGeometry?.(dialog.id,{mode:'normal',left:Math.max(0,(area.width-width)/2)/Math.max(1,area.width),top:Math.max(0,(area.height-height)/2)/Math.max(1,area.height),width:width/Math.max(1,area.width),height:height/Math.max(1,area.height)});return dialog;
 }};
}
