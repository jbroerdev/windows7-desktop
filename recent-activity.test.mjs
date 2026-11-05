import test from 'node:test';import assert from 'node:assert/strict';
import {createRecentActivity,startMenuPrograms,jumpListItems,jumpListPosition} from './public/recent-activity.js';
const deferred=()=>{let resolve;const promise=new Promise(done=>resolve=done);return{promise,resolve};};

test('activity requests bind to the initiating profile and ignore late responses after a switch',async()=>{
 let state={authenticated:true,userId:'alice',desktop:{}},calls=[];const pending=deferred();
 const activity=createRecentActivity({getState:()=>state,request:async(path,data)=>{calls.push({path,data});return pending.promise;}});
 const refresh=activity.refresh();assert.match(calls[0].path,/profileId=alice/);
 state={authenticated:true,userId:'bob',desktop:{}};pending.resolve({programs:[{appId:'editor'}],documents:[{id:'private'}]});await refresh;
 assert.deepEqual(activity.snapshot(),{programs:[],documents:[],pinnedDocuments:[],unavailablePinnedDocuments:[]});
 const token=activity.token();state.userId='carol';await activity.program('paint',token);assert.equal(calls.length,1);
});

test('queued events do not cross profile changes or a settings refresh',async()=>{
 const state={authenticated:true,userId:'alice',desktop:{}},calls=[];
 const activity=createRecentActivity({getState:()=>state,request:async(path,data)=>{calls.push(data);return{programs:[],documents:[]};}});
 let event=activity.program('paint');state.userId='bob';await event;assert.equal(calls.length,0);
 state.userId='alice';event=activity.program('editor');await activity.refresh();await event;
 assert.equal(calls.filter(Boolean).length,0);
});

test('personal events are serialized and local disabled history and Share never record',async()=>{
 const state={authenticated:true,userId:'alice',desktop:{}},calls=[];
 const activity=createRecentActivity({getState:()=>state,request:async(path,data)=>{calls.push(data);return{programs:[{appId:data?.appId}],documents:[]};}});
 await activity.program('editor');assert.equal(calls[0].profileId,'alice');assert.equal(activity.snapshot().programs[0].appId,'editor');
 state.desktop.startMenu={recentPrograms:false,recentDocuments:false};await activity.program('paint');await activity.document('private','editor');assert.equal(calls.length,1);assert.deepEqual(activity.snapshot(),{programs:[],documents:[],pinnedDocuments:[],unavailablePinnedDocuments:[]});
 state.shareEditing=true;await activity.program('paint');assert.equal(calls.length,1);
});

test('snapshot can reset its profile cache without recursively notifying a rendering caller',()=>{
 let changes=0;const state={authenticated:true,userId:'alice',desktop:{}},activity=createRecentActivity({getState:()=>state,onChange:()=>changes++});
 activity.snapshot();state.userId='bob';activity.snapshot();assert.equal(changes,0);
});

test('Start menu keeps explicit pins, excludes duplicates and unavailable programs, and limits the recent section',()=>{
 const available=[{id:'browser'},{id:'editor'},{id:'paint'}],list=startMenuPrograms(available,['browser','removed'],[{appId:'editor'},{appId:'browser'},{appId:'missing'},{appId:'paint'}],1);
 assert.deepEqual(list.pinned,[available[0]]);assert.deepEqual(list.recent,[available[1]]);
 assert.deepEqual(startMenuPrograms(available,[],[]),{pinned:[],recent:[]});
});

test('jump lists keep pinned files separate and do not mix applications or duplicate pinned recent files',()=>{
 const snapshot={pinnedDocuments:[{id:'one',appId:'editor'},{id:'two',appId:'paint'}],documents:[{id:'one',appId:'editor'},{id:'two',appId:'editor'},{id:'three',appId:'editor'},{id:'four',appId:'paint'}]};
 assert.deepEqual(jumpListItems(snapshot,'editor',1),{pinned:[snapshot.pinnedDocuments[0]],recent:[snapshot.documents[1]]});
 assert.deepEqual(jumpListItems({},'editor'),{pinned:[],recent:[]});
 const unavailable={id:'missing',appId:'editor',unavailable:true,name:'Nicht mehr verfügbar'};
 assert.deepEqual(jumpListItems({unavailablePinnedDocuments:[unavailable]},'editor'),{pinned:[unavailable],recent:[]});
});

test('explicit jump list mutation errors are reported without discarding the displayed history',async()=>{
 const state={authenticated:true,userId:'alice',desktop:{}},errors=[];
 const activity=createRecentActivity({getState:()=>state,onError:error=>errors.push(error.message),request:async(_path,data)=>{if(data)throw Error('Speichern fehlgeschlagen');return{documents:[{id:'one',appId:'editor'}],pinnedDocuments:[]};}});
 await activity.refresh();await activity.pinDocument('one','editor');
 assert.deepEqual(errors,['Speichern fehlgeschlagen']);assert.equal(activity.snapshot().documents.length,1);
 await activity.program('editor');assert.equal(errors.length,1);
});

test('taskbar jump lists open away from every taskbar edge and stay inside the viewport',()=>{
 const size={width:280,height:200},viewport={width:1280,height:720};
 assert.deepEqual(jumpListPosition({left:100,top:680,right:160,bottom:720},size,viewport),{left:100,top:476});
 assert.deepEqual(jumpListPosition({left:100,top:0,right:160,bottom:40},size,viewport,'top'),{left:100,top:44});
 assert.deepEqual(jumpListPosition({left:0,top:100,right:60,bottom:140},size,viewport,'left'),{left:64,top:100});
 assert.deepEqual(jumpListPosition({left:1220,top:100,right:1280,bottom:140},size,viewport,'right'),{left:936,top:100});
 assert.deepEqual(jumpListPosition({left:1240,top:700,right:1280,bottom:720},size,viewport,'top'),{left:996,top:516});
});
