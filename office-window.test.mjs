import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createOfficeWindows} from './public/office-window.js';

const settle=async()=>{for(let i=0;i<4;i++)await new Promise(resolve=>setImmediate(resolve));};

test('Office-Speichern wartet auf die ausdrücklich angeforderte Collabora-Rückmeldung',async t=>{
 for(const result of [{success:true},{success:false,result:'unmodified'},{success:false,errorMsg:'WOPI: Zugriff verweigert (403)'}])await t.test(JSON.stringify(result),async()=>{
  const previous={document:globalThis.document,window:globalThis.window},elements=[],listeners=new Map(),calls=[],requests=[];
  let activeFrame,notifySave=false;
  const origin='https://office.example.org';
  const emit=async(data,source=activeFrame.contentWindow,messageOrigin=origin)=>{await listeners.get('message')?.({data:JSON.stringify(data),source,origin:messageOrigin});};
  class Element{
   constructor(tag){this.tag=tag;this.children=[];this.events=new Map();elements.push(this);if(tag==='iframe'){activeFrame=this;this.contentWindow={postMessage:(raw,target)=>{assert.equal(target,origin);const message=JSON.parse(raw);requests.push(message);if(message.MessageId==='Host_PostmessageReady')queueMicrotask(()=>emit({MessageId:'App_LoadingStatus',Values:{Status:'Document_Loaded'}}));if(message.MessageId==='Action_Save')notifySave=message.Values?.Notify===true;}};}}
   append(...nodes){this.children.push(...nodes);}
   replaceChildren(...nodes){this.children=[...nodes];}
   setAttribute(){}
   addEventListener(name,callback){this.events.set(name,callback);}
   submit(){queueMicrotask(()=>emit({MessageId:'App_LoadingStatus',Values:{Status:'Initialized'}}));}
   remove(){}
   close(){this.events.get('close')?.();}
  }
  globalThis.document={createElement:tag=>new Element(tag),body:new Element('body')};
  globalThis.window={addEventListener:(name,callback)=>listeners.set(name,callback),removeEventListener:name=>listeners.delete(name)};
  let dialog;
  try{
   const app=createOfficeWindows({desktop:{register:d=>{dialog=d;},show(){},unregister(){}},getState:()=>({officeEnabled:true,authenticated:true}),chooseFile:async()=>({parent:'documents',name:'Saved.odt'}),getNode:id=>({id,name:'Saved.odt'}),reload:async()=>{},toast:()=>{},api:async(route,data)=>{
    calls.push({route,data});if(route==='/api/office-draft')return {id:'draft',name:'Unbenannt.odt',temporary:true};
    if(route==='/api/office-open')return {url:origin+'/browser/editor',origin,writable:true,accessToken:'test-token',accessTokenTtl:123};
    if(route==='/api/office-edit')return {id:'working',name:'Saved.odt',workingCopy:true};
    if(route==='/api/office-save-draft')return {id:'saved'};
    return {ok:true};
   }});
   app.open();await settle();
   elements.find(e=>e.tag==='button'&&e.textContent==='Speichern').onclick();await settle();
   assert.ok(requests.some(m=>m.MessageId==='Action_Save'));
   assert.equal(calls.filter(c=>c.route==='/api/office-save-draft').length,0,'Keine Datei vor bestätigter Speicherung anlegen');
   await emit({MessageId:'Action_Save_Resp',Values:{success:true}},activeFrame.contentWindow,'https://untrusted.example');await settle();
   assert.equal(calls.filter(c=>c.route==='/api/office-save-draft').length,0,'Fremde Rückmeldungen ignorieren');
   // Collabora only emits Action_Save_Resp when Action_Save supplied Notify=true.
   if(notifySave)await emit({MessageId:'Action_Save_Resp',Values:result});await settle();
   const successful=result.success||result.result==='unmodified';
   assert.equal(notifySave,true,'Collabora muss ausdrücklich um Speicherbestätigung gebeten werden');
   assert.equal(calls.filter(c=>c.route==='/api/office-save-draft').length,successful?1:0);
   if(!successful)assert.match(elements.find(e=>e.tag==='footer').textContent,/Zugriff verweigert \(403\)/);
  }finally{dialog?.close();globalThis.document=previous.document;globalThis.window=previous.window;}
 });
});

test('Office reports the original document once after trusted loading and skips the restored opening',async()=>{
 const previous={document:globalThis.document,window:globalThis.window},listeners=new Map(),dialogs=[],reported=[];let frame;
 const origin='https://office.example.org';
 class Element{
  constructor(tag){this.tag=tag;this.children=[];this.events=new Map();if(tag==='iframe'){frame=this;this.contentWindow={postMessage(){}};}}
  append(...nodes){this.children.push(...nodes);}replaceChildren(...nodes){this.children=[...nodes];}setAttribute(){}submit(){}remove(){}
  addEventListener(name,callback){this.events.set(name,callback);}close(){this.events.get('close')?.();}
 }
 globalThis.document={createElement:tag=>new Element(tag),body:new Element('body')};
 globalThis.window={addEventListener:(name,callback)=>listeners.set(name,callback),removeEventListener:name=>listeners.delete(name)};
 const loaded=async(messageOrigin=origin,source=frame.contentWindow)=>{await listeners.get('message')?.({source,origin:messageOrigin,data:{MessageId:'App_LoadingStatus',Values:{Status:'Document_Loaded'}}});};
 try{
  const app=createOfficeWindows({desktop:{register:dialog=>dialogs.push(dialog),show(){},unregister(){}},getState:()=>({officeEnabled:true,authenticated:true}),reload:async()=>{},getNode:()=>null,toast:()=>{},onOpened:event=>reported.push(event),chooseFile:async()=>({node:{id:'second',name:'Second.odt'}}),api:async(route,data)=>{
   if(route==='/api/office-edit')return{id:'working-'+data.id,sourceId:data.id,name:'Working.odt',workingCopy:true};
   if(route==='/api/office-open')return{url:origin+'/editor',origin,writable:true,accessToken:'test',accessTokenTtl:123};
   return{};
  }});
  app.open({id:'original',name:'Original.odt'},'text',{recentProfile:'alice'});await settle();
  assert.equal(reported.length,0);await loaded('https://untrusted.example');assert.equal(reported.length,0);
  await loaded();await loaded();assert.deepEqual(reported,[{id:'original',kind:'text',profile:'alice'}]);
  dialogs[0].close();
  const restored=app.open({id:'restored-working',sourceId:'original',workingCopy:true,name:'Original.odt'},'text',{noRecent:true,recentProfile:'alice'});await settle();await loaded();assert.equal(reported.length,1);
  const menu=restored.children[1],items=menu.children[0].children[1],open=items.children.find(item=>item.textContent==='Öffnen …');open.onclick();await settle();await loaded();
  assert.deepEqual(reported[1],{id:'second',kind:'text',profile:'alice'});
 }finally{for(const dialog of dialogs)dialog.close();globalThis.document=previous.document;globalThis.window=previous.window;}
});
