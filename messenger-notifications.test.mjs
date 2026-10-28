import test from'node:test';
import assert from'node:assert/strict';
import{readFile}from'node:fs/promises';
test('incoming notification sounds once across tabs and stays silent for an actively read chat',async()=>{
 const source=await readFile('./public/live-messenger.js','utf8'),start=source.indexOf(' async function announce('),end=source.indexOf(' function markDeleted(',start),storage=new Map();let sounds=0,flashes=0,queue=Promise.resolve();
 const localStorage={getItem:key=>storage.get(key),setItem:(key,value)=>storage.set(key,value)},navigator={locks:{request:(key,fn)=>queue=queue.then(fn)}},active=new Set(),chats=new Map([['open',{id:'open'}]]);
 const factory=()=>new Function('current','viewing','chats','navigator','localStorage','playSound','renderAttention',source.slice(start,end)+';return announce;')({self:{id:'user-a'}},view=>active.has(view?.id),chats,navigator,localStorage,()=>sounds++,()=>flashes++),a=factory(),b=factory();
 await Promise.all([a([{conversation:'closed',seq:1}]),b([{conversation:'closed',seq:1}])]);assert.equal(sounds,1);assert.equal(flashes,2);
 active.add('open');await a([{conversation:'open',seq:2}]);assert.equal(sounds,1);await b([{conversation:'closed',seq:3}]);assert.equal(sounds,2);
});
test('opening Start invokes its configured navigation sound, closing it does not',async()=>{
 const source=await readFile('./public/desktop-shell.js','utf8'),start=source.indexOf('function toggleStart(show)'),end=source.indexOf('start.onclick=',start),sounds=[];
 const toggle=new Function('soundSystem','menu','start','renderMenu',"let allPrograms=false,accessoriesOpen=false,programFolder=null;const search={value:''};"+source.slice(start,end)+';return toggleStart;')({play:id=>sounds.push(id)},{hidden:true},{setAttribute(){},focus(){}},()=>{});
 toggle(true);toggle(false);assert.deepEqual(sounds,['navigation-start']);
});
