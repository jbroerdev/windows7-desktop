import {networkDataFromAdaptersSnapshot,networkDataFromTaskManager,renderControlPanelNetwork,renderControlPanelAdapters,renderControlPanelAdapterStatus,renderControlPanelAdapterDetails} from './network-source.mjs';
import {taskbarWorkArea} from '/taskbar-state.js';
import {lanConnected,lanNeutral} from './network-icons.mjs';

// The Control Panel owns the request lifecycle and the actual desktop windows.
export function createNetworkPanelHost({desktop,getState,getContextKey,navigate,request=fetch,document:doc=document}){
 const el=(tag,text,cls)=>{const node=doc.createElement(tag);if(text!==undefined)node.textContent=text;if(cls)node.className=cls;return node;};
 let context=getContextKey(),status=null,details=null,sequence=0,listRefresh=null;
 const personalAdmin=()=>{const state=getState();return state.authenticated===true&&state.role==='admin'&&!state.readonly&&!state.shareEditing;};
 const current=key=>key===getContextKey()&&personalAdmin();
 function applyAdapterIcons(root,data){
  for(const tile of root.querySelectorAll('.cp-network-adapter-tile')){
   const adapter=data.adapters?.find(item=>item.adapterId===tile.dataset.adapterId);if(!adapter)continue;
   const linked=adapter.adminUp===true&&adapter.operState==='up',ethernet=['ether','ethernet','veth'].includes(adapter.kind);
   const image=tile.querySelector('.cp-network-adapter-icon img');if(image){image.src=linked&&ethernet?lanConnected:lanNeutral;image.width=image.height=48;image.dataset.connectionIcon=linked&&ethernet?'local-link':'neutral';}
   const label=tile.querySelector('.cp-network-adapter-text>span:nth-child(2)');if(label)label.textContent=adapter.adminUp===false?'Deaktiviert':linked?'Verbunden (lokaler Link)':['down','lowerlayerdown','notpresent'].includes(adapter.operState)?'Nicht verbunden':'Status unbekannt';
  }
 }
 async function api(path,{signal,value}={}){
  const response=await request(path,{signal,cache:'no-store',...(value?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(value)}:{})});
  const data=await response.json();if(!response.ok)throw Error(data.error||'Netzwerkdaten sind nicht verfügbar.');return data;
 }
 const targets=data=>new Set(['home','network-center',...(data?.capabilities?.readAdapters?['adapter-settings','adapter-details','adapter-address-details']:[]),...(data?.capabilities?.diagnose?['network-troubleshoot']:[]),...(data?.capabilities?.setDisplayName?['adapter-label']:[])]);
 function refreshContext(){const next=getContextKey();if(next===context)return false;context=next;closeStatus();return true;}
 function closeDetails(){if(!details)return;const prior=details;details=null;if(prior.dialog.open)prior.dialog.close();else prior.dialog.remove();}
 function closeStatus(){closeDetails();if(!status)return;const prior=status;status=null;prior.controller.abort();prior.actionController?.abort();if(prior.dialog.open)prior.dialog.close();else prior.dialog.remove();}
 function statusCurrent(record){return status===record&&record.dialog.open&&current(record.context);}
 function drawStatus(record){
  if(!statusCurrent(record))return;
  const data={...networkDataFromAdaptersSnapshot(record.snapshot,getState()),...(record.diagnostic?{diagnostic:record.diagnostic}:{})};
  const restoreDetailsFocus=record.body.querySelector('.cp-network-details-button')===doc.activeElement;
  const diagnosticsOpen=record.body.querySelector('.cp-network-status-diagnostic')?.hidden===false;
  record.body.replaceChildren(renderControlPanelAdapterStatus({document:doc,data,availableTargets:targets(data),busy:record.busy,error:record.error,onAction:value=>perform(record,value),onNavigate:(target,options={})=>{if(target==='adapter-address-details'&&options.adapterId===record.adapterId&&targets(data).has(target))openDetails(record);}}));
  if(diagnosticsOpen||record.diagnostic||record.error){const section=record.body.querySelector('.cp-network-status-diagnostic');if(section)section.hidden=false;}
  if(data.adapter)record.title.textContent='Status von '+(data.adapter.displayName||data.adapter.name);
  drawDetails(record);
  if(restoreDetailsFocus&&!details)record.body.querySelector('.cp-network-details-button')?.focus({preventScroll:true});
 }
 function showWindow(dialog,width,height){
  const state=getState(),prefs=state.readonly?state.publicDesktop:state.desktop,area=taskbarWorkArea({width:innerWidth,height:innerHeight},prefs?.taskbar),vw=Math.max(1,area.width),vh=Math.max(1,area.height);
  dialog.showModal();desktop.show(dialog.id);
  desktop.applyWorkspaceGeometry(dialog.id,{mode:'normal',left:Math.max(0,(vw-width)/2)/vw,top:Math.max(0,(vh-height)/2)/vh,width:Math.min(width,vw)/vw,height:Math.min(height,vh)/vh});
 }
 function drawDetails(parent){
  if(!details||details.parent!==parent||!details.dialog.open||!statusCurrent(parent))return;
  const data=networkDataFromAdaptersSnapshot(parent.snapshot,getState());
  details.body.replaceChildren(renderControlPanelAdapterDetails({document:doc,data,busy:parent.busy,error:parent.error,onAction:value=>perform(parent,value)}));
 }
 async function openDetails(parent){
  if(!statusCurrent(parent)||!parent.snapshot||parent.detailsLoading)return;
  const available=()=>{const data=networkDataFromAdaptersSnapshot(parent.snapshot,getState());return data.capabilities?.readAdapters===true&&!!data.adapter;};
  if(!available()){
   parent.detailsLoading=true;const trigger=parent.body.querySelector('.cp-network-details-button');if(trigger)trigger.disabled=true;
   try{await loadStatus(parent);}finally{parent.detailsLoading=false;}
   if(!statusCurrent(parent)||!available())return;
  }
  closeDetails();
  const dialog=el('dialog',undefined,'network-status-window network-details-window'),bar=el('header'),title=el('span','Netzwerkverbindungsdetails'),close=el('button'),body=el('div',undefined,'network-status-content'),actions=el('footer',undefined,'network-status-buttons'),done=el('button','Schließen');
  dialog.id='network-details-'+(++sequence);close.type=done.type='button';close.setAttribute('aria-label','Schließen');bar.append(title,close);actions.append(done);dialog.append(bar,body,actions);doc.body.append(dialog);
  const record={dialog,body,parent};details=record;done.onclick=()=>dialog.close();
  const afterClose=()=>{if(details===record)details=null;desktop.unregister(dialog.id);dialog.remove();if(statusCurrent(parent)){desktop.show(parent.dialog.id);queueMicrotask(()=>{if(statusCurrent(parent)&&!details)parent.body.querySelector('.cp-network-details-button')?.focus({preventScroll:true});});}};
  desktop.register(dialog,{bar,title,closeButton:close,icon:'/icons/control-panel/network.png',appId:'control-panel',minWidth:375,minHeight:444,resizable:false,rememberPlacement:false});
  dialog.addEventListener('close',afterClose);
  showWindow(dialog,375,444);drawDetails(parent);
 }
 async function loadStatus(record){
  try{
   const snapshot=await api('/api/network/adapters/'+encodeURIComponent(record.adapterId),{signal:record.controller.signal});
   if(!statusCurrent(record))return;record.snapshot=snapshot;record.error=null;drawStatus(record);if(record.openDetailsAfterLoad){record.openDetailsAfterLoad=false;openDetails(record);}
  }catch(error){if(!statusCurrent(record)||record.controller.signal.aborted)return;record.error=error.message;drawStatus(record);}
 }
 async function perform(record,value){
  if(!statusCurrent(record)||record.busy||!['diagnose','label'].includes(value?.action))return;
  const state=getState(),profileId=String(state.userId),key=getContextKey();
  if(key!==record.context||!profileId)return;
  const capability=value.action==='label'?'setDisplayName':'diagnose';
  const payload=value.action==='label'?{adapterId:record.adapterId,displayName:value.displayName,expectedRevision:value.expectedRevision,profileId}:{kind:value.kind,target:value.target,profileId};
  record.busy=true;record.error=null;record.actionController=new AbortController();drawStatus(record);
  try{
   if(networkDataFromAdaptersSnapshot(record.snapshot,getState()).capabilities?.[capability]!==true)await loadStatus(record);
   if(!statusCurrent(record))return;
   if(networkDataFromAdaptersSnapshot(record.snapshot,getState()).capabilities?.[capability]!==true)throw Error('Aktuelle Adapterdaten oder die benötigte Funktion sind nicht verfügbar.');
   const result=await api(value.action==='label'?'/api/network/adapter-label':'/api/network/diagnostics',{signal:record.actionController.signal,value:payload});
   if(!statusCurrent(record)||key!==getContextKey())return;
   if(value.action==='diagnose')record.diagnostic=result;
   else{await loadStatus(record);await listRefresh?.();}
  }catch(error){if(statusCurrent(record)&&!record.actionController.signal.aborted)record.error=error.message;}
  finally{if(statusCurrent(record)){record.busy=false;drawStatus(record);}}
 }
 function openStatus(adapterId,{showDetails=false}={}){
  refreshContext();if(!personalAdmin()||typeof adapterId!=='string'||!adapterId)return;
  closeStatus();const dialog=el('dialog',undefined,'network-status-window'),bar=el('header'),title=el('span','Adapterstatus'),close=el('button'),body=el('div',undefined,'network-status-content'),actions=el('footer',undefined,'network-status-buttons'),done=el('button','Schließen');
  dialog.id='network-status-'+(++sequence);close.type=done.type='button';close.setAttribute('aria-label','Schließen');bar.append(title,close);actions.append(done);dialog.append(bar,body,actions);doc.body.append(dialog);
  const record={dialog,title,body,adapterId,context:getContextKey(),controller:new AbortController(),snapshot:null,busy:false,error:null,openDetailsAfterLoad:showDetails};status=record;
  done.onclick=()=>dialog.close();dialog.addEventListener('close',()=>{if(details?.parent===record)closeDetails();record.controller.abort();record.actionController?.abort();if(status===record)status=null;desktop.unregister(dialog.id);dialog.remove();});
  desktop.register(dialog,{bar,title,closeButton:close,icon:'/icons/control-panel/network.png',appId:'control-panel',minWidth:376,minHeight:456,resizable:false,rememberPlacement:false});
  showWindow(dialog,376,456);
  body.replaceChildren(el('p','Adapterdetails werden geladen …'));void loadStatus(record);
 }
 async function renderInto(container,{page,signal,isCurrent}){
  refreshContext();const key=getContextKey(),admin=personalAdmin();
  const view={snapshot:null,busy:false,error:null,diagnostic:null,request:0};
  const draw=(snapshot,error=null)=>{
   if(!isCurrent()||signal.aborted||key!==getContextKey())return;
   const normalized=admin?networkDataFromAdaptersSnapshot(snapshot,getState()):networkDataFromTaskManager(snapshot,getState()),data={...normalized,...(view.diagnostic?{diagnostic:view.diagnostic}:{})};
   const renderer=page==='adapter-settings'?renderControlPanelAdapters:renderControlPanelNetwork;
   const diagnosticsOpen=container.querySelector('.cp-network-diagnostic')?.hidden===false;
   container.replaceChildren(renderer({document:doc,data,availableTargets:targets(data),busy:view.busy,error:error||view.error,onAction:async value=>{
    if(!current(key)||!isCurrent()||signal.aborted||view.busy||value?.action!=='diagnose'||data.capabilities?.diagnose!==true)return;
    const profileId=String(getState().userId);view.busy=true;view.error=null;draw(view.snapshot);
    try{const result=await api('/api/network/diagnostics',{signal,value:{kind:value.kind,target:value.target,profileId}});if(current(key)&&isCurrent()&&!signal.aborted)view.diagnostic=result;}
    catch(error){if(current(key)&&isCurrent()&&!signal.aborted)view.error=error.message;}
    finally{if(current(key)&&isCurrent()&&!signal.aborted){view.busy=false;draw(view.snapshot);}}
   },onNavigate:(target,options={})=>{
    if(!isCurrent()||key!==getContextKey()||!targets(data).has(target))return;
    if(target==='adapter-details')openStatus(options.adapterId);else if(target==='adapter-address-details')openStatus(options.adapterId,{showDetails:true});else navigate(target);
   }}));
   if(page==='adapter-settings')applyAdapterIcons(container,data);
   if(diagnosticsOpen||view.diagnostic||view.error){const section=container.querySelector('.cp-network-diagnostic');if(section)section.hidden=false;}
  };
  draw(null);
  const state=getState();if(!state.authenticated||state.readonly||state.shareEditing||page==='adapter-settings'&&!admin)return;
  const refresh=async()=>{if(!isCurrent()||signal.aborted||key!==getContextKey())return;const revision=++view.request;try{const snapshot=await api(admin?'/api/network/adapters':'/api/task-manager',{signal});if(revision!==view.request)return;view.snapshot=snapshot;draw(view.snapshot);}catch(error){if(!signal.aborted&&revision===view.request)draw(null,error.message);}};
  listRefresh=refresh;await refresh();
 }
 return{renderInto,openStatus,refreshContext,refresh:()=>listRefresh?.(),dispose:()=>{listRefresh=null;closeStatus();}};
}
