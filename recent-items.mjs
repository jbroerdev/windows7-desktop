import {normalizeStartMenu} from './public/start-menu-state.js';

export const RECENT_PROGRAM_IDS=new Set('server-browser spotify sm64 remote-desktop live-messenger live-mail calculator control-panel office-text office-sheet office-presentation browser editor paint snipping photo media minesweeper nibbles local-users task-manager terminal explorer'.split(' '));
const recent=value=>({programs:Array.isArray(value?.programs)?value.programs:[],documents:Array.isArray(value?.documents)?value.documents:[]});
export function applyRecentPrivacy(history,preferences){
 const settings=normalizeStartMenu(preferences),value=recent(history);
 return {programs:settings.recentPrograms?value.programs.slice(0,50):[],documents:settings.recentDocuments?value.documents.slice(0,100):[],...(Array.isArray(history?.pinnedDocuments)?{pinnedDocuments:history.pinnedDocuments.slice(0,100)}:{})};
}
export function addRecentItem(history,preferences,event,now=Date.now()){
 const value=applyRecentPrivacy(history,preferences),settings=normalizeStartMenu(preferences),lastOpened=new Date(now).toISOString();
 if(event.kind==='pin-document'){
  const pins=value.pinnedDocuments||[];
  if(pins.some(item=>item.id===event.id&&item.appId===event.appId))return value;
  if(pins.length>=100)throw Error('Es können höchstens 100 Dateien angeheftet werden.');
  return {...value,pinnedDocuments:[...pins,{id:event.id,appId:event.appId}]};
 }
 if(event.kind==='unpin-document')return {...value,pinnedDocuments:(value.pinnedDocuments||[]).filter(item=>item.id!==event.id||item.appId!==event.appId)};
 if(event.kind==='remove-program')return {...value,programs:value.programs.filter(item=>item.appId!==event.appId)};
 if(event.kind==='remove-document')return {...value,documents:value.documents.filter(item=>item.id!==event.id||item.appId!==event.appId)};
 if(['program','document'].includes(event.kind)&&settings.recentPrograms){
  const previous=value.programs.find(item=>item.appId===event.appId);
  value.programs=[{appId:event.appId,count:Math.min(1000000,(Number(previous?.count)||0)+1),lastOpened},...value.programs.filter(item=>item.appId!==event.appId)].slice(0,50);
 }
 if(event.kind==='document'&&settings.recentDocuments)value.documents=[{id:event.id,appId:event.appId,lastOpened},...value.documents.filter(item=>item.id!==event.id||item.appId!==event.appId)].slice(0,100);
 return value;
}
export function listRecentItems(history,preferences,resolve){
 const value=applyRecentPrivacy(history,preferences);
 const visible=items=>items.flatMap(item=>{if(!resolve(item.appId,'program'))return [];const node=resolve(item.id,'document');return node?[{...item,name:node.name,kind:node.kind}]:[];});
 const unavailablePinnedDocuments=(value.pinnedDocuments||[]).filter(item=>resolve(item.appId,'program')&&!resolve(item.id,'document')).map(item=>({id:item.id,appId:item.appId,name:'Nicht mehr verfügbar',unavailable:true}));
 return {settings:normalizeStartMenu(preferences),programs:value.programs.filter(item=>resolve(item.appId,'program')).sort((a,b)=>b.count-a.count||b.lastOpened.localeCompare(a.lastOpened)),documents:visible(value.documents),pinnedDocuments:visible(value.pinnedDocuments||[]),unavailablePinnedDocuments};
}
