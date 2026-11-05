import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeStartMenu,validateStartMenu} from './public/start-menu-state.js';
import {addRecentItem,applyRecentPrivacy,listRecentItems} from './recent-items.mjs';

test('start menu privacy accepts partial boolean changes and rejects unknown or malformed settings',()=>{
 assert.deepEqual(normalizeStartMenu(),{recentPrograms:true,recentDocuments:true});
 assert.deepEqual(normalizeStartMenu({recentPrograms:false,recentDocuments:'no'}),{recentPrograms:false,recentDocuments:true});
 assert.deepEqual(validateStartMenu({recentDocuments:false}),{recentDocuments:false});
 for(const value of [null,[],false,{unknown:true},{recentPrograms:1}])assert.throws(()=>validateStartMenu(value));
});

test('recent programs accumulate frequency while documents deduplicate within each application',()=>{
 let history=addRecentItem(null,{}, {kind:'program',appId:'editor'},1);
 history=addRecentItem(history,{}, {kind:'program',appId:'paint'},2);
 history=addRecentItem(history,{}, {kind:'program',appId:'editor'},3);
 history=addRecentItem(history,{}, {kind:'document',appId:'editor',id:'one'},4);
 history=addRecentItem(history,{}, {kind:'document',appId:'paint',id:'one'},5);
 history=addRecentItem(history,{}, {kind:'document',appId:'editor',id:'one'},6);
 assert.equal(history.programs.find(item=>item.appId==='editor').count,4);
 assert.equal(history.documents.length,2);
 assert.equal(history.documents[0].lastOpened,new Date(6).toISOString());
 const list=listRecentItems(history,{},(id,kind)=>kind==='program'||id==='one'?{name:'Renamed.txt',kind:'file'}:null);
 assert.deepEqual(list.programs.map(item=>item.appId),['editor','paint']);
 assert.equal(list.documents[0].name,'Renamed.txt');
 assert.equal(history.documents[0].name,undefined);
 assert.deepEqual(listRecentItems(history,{},()=>false).documents,[]);
});

test('disabling history removes retained entries and prevents later events from recreating them',()=>{
 const original={programs:[{appId:'paint',count:1,lastOpened:'2026-01-01'}],documents:[{appId:'editor',id:'private'}]};
 assert.deepEqual(applyRecentPrivacy(original,{recentPrograms:false}),{programs:[],documents:original.documents});
 let history=applyRecentPrivacy(original,{recentPrograms:false,recentDocuments:false});
 for(const event of [{kind:'program',appId:'paint'},{kind:'document',appId:'editor',id:'private'}])history=addRecentItem(history,{recentPrograms:false,recentDocuments:false},event,1);
 assert.deepEqual(history,{programs:[],documents:[]});
 assert.equal(original.programs.length,1);
});

test('stored history remains bounded without dropping the most recent event',()=>{
 let history;
 for(let i=0;i<160;i++){
  history=addRecentItem(history,{}, {kind:'program',appId:'p'+i},i);
  history=addRecentItem(history,{}, {kind:'document',appId:'editor',id:'d'+i},i);
 }
 assert.equal(history.programs.length,50);assert.equal(history.documents.length,100);
 assert.equal(history.programs[0].appId,'editor');assert.equal(history.programs[0].count,160);assert.ok(history.programs.some(item=>item.appId==='p159'));assert.equal(history.documents[0].id,'d159');
});

test('removing recent entries keeps files and other application history intact',()=>{
 let history=addRecentItem(null,{}, {kind:'document',appId:'editor',id:'one'},1);
 history=addRecentItem(history,{}, {kind:'document',appId:'paint',id:'one'},2);
 const withoutDocument=addRecentItem(history,{}, {kind:'remove-document',appId:'editor',id:'one'},3);
 assert.deepEqual(withoutDocument.documents.map(item=>item.appId),['paint']);
 assert.deepEqual(withoutDocument.programs,history.programs);
 const withoutProgram=addRecentItem(history,{}, {kind:'remove-program',appId:'editor'},4);
 assert.deepEqual(withoutProgram.programs.map(item=>item.appId),['paint']);
 assert.deepEqual(withoutProgram.documents,history.documents);
 assert.equal(history.programs.length,2);
});

test('explicit document pins survive privacy clearing but remain permission checked',()=>{
 let history=addRecentItem(null,{}, {kind:'document',appId:'editor',id:'one'},1);
 history=addRecentItem(history,{}, {kind:'pin-document',appId:'editor',id:'one'},2);
 history=addRecentItem(history,{}, {kind:'pin-document',appId:'editor',id:'one'},3);
 assert.equal(history.pinnedDocuments.length,1);
 history=applyRecentPrivacy(history,{recentPrograms:false,recentDocuments:false});
 assert.equal(history.documents.length,0);assert.equal(history.programs.length,0);
 assert.equal(history.pinnedDocuments.length,1);
 const resolve=(id,kind)=>kind==='program'||id==='one'?{name:'Current.txt',kind:'file'}:null;
 assert.equal(listRecentItems(history,{},resolve).pinnedDocuments[0].name,'Current.txt');
 assert.equal(listRecentItems(history,{},()=>false).pinnedDocuments.length,0);
 history=addRecentItem(history,{}, {kind:'unpin-document',appId:'editor',id:'one'},4);
 assert.equal(history.pinnedDocuments.length,0);assert.equal(history.documents.length,0);
});

test('a full pinned list rejects new entries without losing pins and accepts another after explicit cleanup',()=>{
 let history;
 for(let i=0;i<100;i++)history=addRecentItem(history,{}, {kind:'pin-document',appId:'editor',id:'file-'+i});
 const before=structuredClone(history);
 assert.throws(()=>addRecentItem(history,{}, {kind:'pin-document',appId:'editor',id:'extra'}),/100/);
 assert.deepEqual(history,before);
 assert.deepEqual(addRecentItem(history,{}, {kind:'pin-document',appId:'editor',id:'file-0'}),before);
 history=addRecentItem(history,{}, {kind:'unpin-document',appId:'editor',id:'file-50'});
 history=addRecentItem(history,{}, {kind:'pin-document',appId:'editor',id:'extra'});
 assert.equal(history.pinnedDocuments.length,100);assert.equal(history.pinnedDocuments.at(-1).id,'extra');
 assert.equal(history.pinnedDocuments.filter(item=>item.id!=='extra').length,99);
});
