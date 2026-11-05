import{normalizeStartMenu}from'./start-menu-state.js';
import{normalizeTaskbar,taskbarWorkArea}from'./taskbar-state.js';
let serial=0;
export function createTaskbarProperties({desktop,getState,reload,openCustomize,openNotificationArea}){
 const el=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;};
 let currentDialog,currentContext;
 const context=()=>{const s=getState();return JSON.stringify([s.userId,!!s.authenticated,!!s.readonly,!!s.shareEditing,s.role]);};
 const refresh=()=>{if(currentDialog?.open&&currentContext!==context())currentDialog.close();};
 return{refresh,open(){
  refresh();
  if(currentDialog?.open){desktop.show(currentDialog.id);return currentDialog;}
  const state=getState(),prefs=()=>{const s=getState();return((s.shareEditing||s.readonly)?s.publicDesktop:s.desktop)||{};};
  const read=()=>({...normalizeTaskbar(prefs().taskbar),...normalizeStartMenu(state.shareEditing?{recentPrograms:false,recentDocuments:false}:prefs().startMenu)});
  let saved=read(),draft={...saved},tab='taskbar',saving=false;
  const dialog=el('dialog',undefined,'taskbar-properties-window');currentDialog=dialog;currentContext=context();const openedContext=currentContext;dialog.id='taskbar-properties-'+(++serial);
  const bar=el('header'),title=el('span','Eigenschaften von Taskleiste und Startmenü'),close=el('button'),body=el('div',undefined,'tb-properties-body'),tabs=el('div',undefined,'tb-properties-tabs'),panel=el('section',undefined,'tb-properties-panel'),footer=el('footer',undefined,'tb-properties-actions'),ok=el('button','OK'),cancel=el('button','Abbrechen'),apply=el('button','Übernehmen'),error=el('p','','tb-properties-error');
  close.type=ok.type=cancel.type=apply.type='button';close.setAttribute('aria-label','Schließen');bar.append(title,close);tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','Eigenschaften');panel.setAttribute('role','tabpanel');error.setAttribute('role','alert');footer.append(ok,cancel,apply);body.append(tabs,panel);dialog.append(bar,body,footer,error);document.body.append(dialog);
  const editable=!!(state.shareEditing||state.authenticated&&!state.readonly),buttons=[];
  for(const[id,label]of[['taskbar','Taskleiste'],['start','Startmenü'],['toolbars','Symbolleisten']]){const b=el('button',label);b.type='button';b.id=dialog.id+'-'+id;b.setAttribute('role','tab');b.onclick=()=>{tab=id;render();};b.onkeydown=e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const i=buttons.indexOf(b),next=e.key==='Home'?0:e.key==='End'?2:(i+(e.key==='ArrowRight'?1:2))%3;buttons[next].click();buttons[next].focus();};buttons.push(b);tabs.append(b);}
  function dirty(){apply.disabled=saving||!editable||JSON.stringify(saved)===JSON.stringify(draft);ok.disabled=saving;}
  function check(parent,label,key,disabled=false){const row=el('label',undefined,'tb-properties-check'),input=el('input');input.type='checkbox';input.checked=key?draft[key]:false;input.disabled=disabled||!editable;input.onchange=()=>{draft[key]=input.checked;dirty();};row.append(input,el('span',label));parent.append(row);return input;}
  function group(name){const field=el('fieldset'),legend=el('legend',name);field.append(legend);panel.append(field);return field;}
  function select(parent,label,key,options){const row=el('label',undefined,'tb-properties-select'),text=el('span',label),input=el('select');input.disabled=!editable;for(const[value,name]of options){const o=el('option',name);o.value=value;input.append(o);}input.value=draft[key];input.onchange=()=>{draft[key]=input.value;dirty();};row.append(text,input);parent.append(row);}
  function render(){panel.replaceChildren();for(let i=0;i<buttons.length;i++){const selected=['taskbar','start','toolbars'][i]===tab;buttons[i].setAttribute('aria-selected',String(selected));buttons[i].tabIndex=selected?0:-1;if(selected)panel.setAttribute('aria-labelledby',buttons[i].id);}
   if(tab==='taskbar'){
    const appearance=group('Taskleistendarstellung');check(appearance,'Taskleiste fixieren','locked');check(appearance,'Taskleiste automatisch ausblenden','autoHide');check(appearance,'Kleine Symbole verwenden','smallIcons');
    select(appearance,'Position der Taskleiste auf dem Bildschirm:','position',[['bottom','Unten'],['left','Links'],['right','Rechts'],['top','Oben']]);
    select(appearance,'Schaltflächen der Taskleiste:','combine',[['always','Immer gruppieren, Beschriftungen ausblenden'],['when-full','Gruppieren, wenn die Taskleiste voll ist'],['never','Nie gruppieren']]);
    const info=group('Infobereich'),row=el('div',undefined,'tb-properties-info'),description=el('p','Legen Sie die Symbole und Benachrichtigungen fest, die im Infobereich angezeigt werden.'),customize=el('button','Anpassen…');customize.type='button';customize.disabled=!openNotificationArea;customize.onclick=()=>openNotificationArea?.();row.append(description,customize);info.append(row);
    const peek=group('Desktopvorschau mit Aero Peek');peek.append(el('p','Der Desktop wird vorübergehend angezeigt, wenn Sie die Maus an das Ende der Taskleiste auf die Schaltfläche „Desktop anzeigen“ bewegen.'));check(peek,'Aero Peek für die Desktopvorschau verwenden','peek');
    const help=el('a','Wie kann ich die Taskleiste anpassen?','tb-properties-help');help.href='https://support.microsoft.com/windows';help.target='_blank';help.rel='noopener noreferrer';panel.append(help);
   }else if(tab==='start'){
    const top=el('div',undefined,'tb-properties-start'),label=el('p','Klicken Sie auf „Anpassen“, wenn Sie die Darstellung und das Verhalten von Links, Symbolen und Menüs im Startmenü anpassen möchten.'),customize=el('button','Anpassen…');customize.type='button';customize.onclick=()=>openCustomize?.();top.append(label,customize);panel.append(top);
    const powerRow=el('label',undefined,'tb-properties-power'),power=el('select'),powerOption=el('option','Abmelden');powerOption.value='logout';power.append(powerOption);power.disabled=true;power.title='Der Webdesktop meldet das Konto ab; eine Host-Abschaltung ist hier nicht verfügbar.';powerRow.append(el('span','Standardaktion für Beenden:'),power);panel.append(powerRow);
    const privacy=group('Datenschutz');check(privacy,'Zuletzt geöffnete Programme im Startmenü speichern und anzeigen','recentPrograms',!!state.shareEditing);check(privacy,'Zuletzt geöffnete Elemente im Startmenü und in der Taskleiste speichern und anzeigen','recentDocuments',!!state.shareEditing);if(state.shareEditing)privacy.title='Verlauf wird ausschließlich im persönlichen Konto gespeichert.';const help=el('a','Wie kann die Darstellung des Startmenüs geändert werden?','tb-properties-help tb-start-help');help.href='https://support.microsoft.com/windows';help.target='_blank';help.rel='noopener noreferrer';panel.append(help);
   }else{
    for(const name of ['Adresse','Links','Tablet PC-Eingabebereich','Desktop'])check(panel,name,null,true);panel.append(el('p','Zusätzliche Symbolleisten sind noch nicht verfügbar.','tb-properties-unavailable'));
   }dirty();
  }
  async function commit(shouldClose){if(saving)return;if(openedContext!==context()){dialog.close();return;}if(!editable||JSON.stringify(saved)===JSON.stringify(draft)){if(shouldClose)dialog.close();return;}saving=true;error.textContent='';dirty();try{const response=await fetch('/api/desktop',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({taskbar:normalizeTaskbar(draft),...(state.shareEditing?{scope:'share'}:{startMenu:{recentPrograms:draft.recentPrograms,recentDocuments:draft.recentDocuments}})})});const data=await response.json();if(!response.ok)throw Error(data.error||'Die Einstellungen konnten nicht gespeichert werden.');await reload();saved=read();draft={...saved};if(shouldClose)dialog.close();else render();}catch(e){error.textContent=e.message;}finally{saving=false;dirty();}}
  ok.onclick=()=>commit(true);apply.onclick=()=>commit(false);cancel.onclick=()=>dialog.close();
  dialog.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();dialog.close();}else if(e.key==='Enter'&&!['BUTTON','SELECT'].includes(e.target.tagName)){e.preventDefault();commit(true);}});
  desktop.register(dialog,{bar,title,closeButton:close,icon:'/icons/filetypes/application.ico?v=1',appId:'control-panel',resizable:false,rememberPlacement:false,minWidth:414,minHeight:463});
  dialog.addEventListener('close',()=>{desktop.unregister(dialog.id);dialog.remove();if(currentDialog===dialog)currentDialog=null;});render();desktop.show(dialog.id);const area=taskbarWorkArea({width:innerWidth,height:innerHeight},saved);desktop.applyWorkspaceGeometry?.(dialog.id,{mode:'normal',left:(saved.position==='right'?Math.max(0,area.width-414):0)/Math.max(1,area.width),top:(saved.position==='bottom'?Math.max(0,area.height-463):0)/Math.max(1,area.height),width:414/Math.max(1,area.width),height:463/Math.max(1,area.height)});ok.focus({preventScroll:true});return dialog;
 }};
}
