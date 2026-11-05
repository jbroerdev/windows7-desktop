import {normalizeStartMenu} from './start-menu-state.js';

const empty=()=>({programs:[],documents:[],pinnedDocuments:[],unavailablePinnedDocuments:[]});
export function createRecentActivity({getState,onChange=()=>{},onError=()=>{},request=async(path,data)=>{
 const response=await fetch(path,{method:data===undefined?'GET':'POST',headers:{'Content-Type':'application/json'},body:data===undefined?undefined:JSON.stringify(data)});
 const result=await response.json();if(!response.ok)throw Error(result.error||'Verlauf nicht verfügbar.');return result;
}}){
 let value=empty(),context=null,revision=0,epoch=0,queue=Promise.resolve();
 const token=()=>{const state=getState();return state.authenticated&&!state.readonly&&!state.shareEditing&&state.userId?String(state.userId):null;};
 function sync(notify=true){const next=token();if(context!==next){context=next;revision++;epoch++;value=empty();if(notify)onChange();}return next;}
 function accept(result,profile,version){if(token()!==profile||context!==profile||revision!==version)return;value={programs:Array.isArray(result.programs)?result.programs:[],documents:Array.isArray(result.documents)?result.documents:[],pinnedDocuments:Array.isArray(result.pinnedDocuments)?result.pinnedDocuments:[],unavailablePinnedDocuments:Array.isArray(result.unavailablePinnedDocuments)?result.unavailablePinnedDocuments:[]};onChange();}
 async function refresh(){const profile=sync(),version=++revision;epoch++;if(!profile)return;try{const result=await request('/api/recent-items?profileId='+encodeURIComponent(profile));accept(result,profile,version);}catch{if(token()===profile&&context===profile&&revision===version){value=empty();onChange();}}}
 function record(event,expectedProfile=token()){
  const profile=sync(),generation=epoch;if(!profile||profile!==expectedProfile)return Promise.resolve();
  const settings=normalizeStartMenu(getState().desktop?.startMenu);
  if(event.kind==='program'&&!settings.recentPrograms||event.kind==='document'&&!settings.recentPrograms&&!settings.recentDocuments)return Promise.resolve();
  queue=queue.catch(()=>{}).then(async()=>{if(token()!==profile||generation!==epoch)return;const version=++revision;try{const result=await request('/api/recent-items',{...event,profileId:profile});accept(result,profile,version);}catch(error){if(!['program','document'].includes(event.kind)&&token()===profile&&generation===epoch)onError(error);}});
  return queue;
 }
 return{token,refresh,snapshot(){sync(false);const settings=normalizeStartMenu(getState().desktop?.startMenu);return{programs:settings.recentPrograms?value.programs:[],documents:settings.recentDocuments?value.documents:[],pinnedDocuments:value.pinnedDocuments,unavailablePinnedDocuments:value.unavailablePinnedDocuments};},program:(appId,profile)=>record({kind:'program',appId},profile),document:(id,appId,profile)=>record({kind:'document',id,appId},profile),pinDocument:(id,appId)=>record({kind:'pin-document',id,appId}),unpinDocument:(id,appId)=>record({kind:'unpin-document',id,appId}),removeProgram:appId=>record({kind:'remove-program',appId}),removeDocument:(id,appId)=>record({kind:'remove-document',id,appId})};
}

export function startMenuPrograms(available,pins,recent,limit=10){
 const selected=new Set(pins),byId=new Map(available.map(item=>[item.id,item]));
 return{pinned:pins.map(id=>byId.get(id)).filter(Boolean),recent:recent.filter(item=>!selected.has(item.appId)&&byId.has(item.appId)).slice(0,limit).map(item=>byId.get(item.appId))};
}

export function jumpListItems(snapshot,appId,limit=10){
 const pinned=[...(snapshot.pinnedDocuments||[]),...(snapshot.unavailablePinnedDocuments||[])].filter(item=>item.appId===appId);
 const ids=new Set(pinned.map(item=>item.id));
 return {pinned,recent:(snapshot.documents||[]).filter(item=>item.appId===appId&&!ids.has(item.id)).slice(0,limit)};
}

export function jumpListPosition(anchor,size,viewport,position='bottom'){
 const left=position==='left'?anchor.right+4:position==='right'?anchor.left-size.width-4:anchor.left;
 const top=position==='top'?anchor.bottom+4:position==='bottom'?anchor.top-size.height-4:anchor.top;
 return {left:Math.max(4,Math.min(viewport.width-size.width-4,left)),top:Math.max(4,Math.min(viewport.height-size.height-4,top))};
}
