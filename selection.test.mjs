import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {randomUUID} from 'node:crypto';
import {isHostId} from './public/host-files.js';

function element(id, rect={left:0,top:0,width:0,height:0}) {
  const classes=new Set(), listeners={};
  return {dataset:{id},style:{},listeners,children:[],scrollTop:0,scrollLeft:0,
    classList:{add:x=>classes.add(x),remove:x=>classes.delete(x),toggle:(x,on)=>on?classes.add(x):classes.delete(x)},
    setAttribute(){},append(){},remove(){},setPointerCapture(){},
    addEventListener:(name,handler)=>{listeners[name]=handler;},
    getBoundingClientRect:()=>({...rect,right:rect.left+rect.width,bottom:rect.top+rect.height}),
    querySelectorAll(){return this.children;}};
}
async function environment() {
  const source=await readFile(new URL('./public/app.js',import.meta.url),'utf8');
  const nodes=[{id:'docs',kind:'folder',system:true,parent:'@home'},
    {id:'a',kind:'file',name:'A',parent:'docs'},
    {id:'b',kind:'folder',name:'B',parent:'docs'},
    {id:'c',kind:'link',name:'C',parent:'docs'},
    {id:'child',kind:'folder',parent:'b'},
    {id:'target',kind:'folder',parent:'@home'}];
  const list=element('list');
  list.children=[element('a',{left:120,top:120,width:30,height:30}),
    element('b',{left:170,top:120,width:30,height:30}),
    element('c',{left:120,top:180,width:30,height:30})];
  const content=element('content',{left:100,top:100,width:500,height:500});
  const fields={list,count:element(),context:{hidden:true}};
  const context=vm.createContext({crypto:{randomUUID},isHostId,selection:new Set(),selected:null,selectionAnchor:null,cutIds:[],dragIds:[],
    dragHoverTimer:null,dragHoverId:null,marquee:null,current:'docs',nodes,state:{authenticated:true},hostFiles:{enabled:()=>false},
    get:id=>nodes.find(n=>n.id===id),$:id=>fields[id],make:()=>element(),updateStatus(){},toast(){},
    document:{querySelector:selector=>selector==='.content'?content:null,querySelectorAll:()=>[],
      addEventListener(){},body:element()},clearTimeout,setTimeout,
    transferDialog:()=>({cancelled:false,update(){},close(){}}),api:async()=>({moved:1}),load:async()=>{}});
  vm.runInContext(source.slice(source.indexOf('function visibleIds()')),context);
  return {context,nodes,list,content};
}

test('Explorer-Auswahl: Strg, Umschalt, Ausschneiden und gültige Ziele',async()=>{
  const {context:c,nodes}=await environment();
  const visible=nodes.filter(n=>['a','b','c'].includes(n.id));
  c.selectItem(visible[0],{},visible);
  c.selectItem(visible[1],{ctrlKey:true},visible);
  assert.deepEqual([...c.selection],['a','b']);
  c.selectItem(visible[2],{shiftKey:true},visible);
  assert.deepEqual([...c.selection],['b','c']);
  c.cutSelection();assert.deepEqual([...c.cutIds],['b','c']);
  assert.equal(c.canDrop(['b'],'child'),false);
  assert.equal(c.canDrop(['b'],'b'),false);
  assert.equal(c.canDrop(['docs'],'target'),false);
  assert.equal(c.canDrop(['a'],'c'),false);
  assert.equal(c.canDrop(['a','c'],'target'),true);
  assert.deepEqual([...c.moveRoots(['b','child'])],['b']);
  const requests=[];
  c.api=async(route,data)=>{requests.push({route,data});return {moved:1};};
  await c.pasteSelection('target');
  assert.equal(requests.length,2);assert.ok(requests.every(r=>r.route==='/api/move'&&r.data.parent==='target'));
  assert.deepEqual(requests.flatMap(r=>[...r.data.ids]),['b','c']);assert.equal(c.cutIds.length,0);
});

test('Explorer-Ziehrahmen wählt Treffer und ergänzt vorhandene Auswahl mit Strg',async()=>{
  const {context:c,content}=await environment();
  const down=ctrlKey=>({button:0,pointerId:1,clientX:105,clientY:105,ctrlKey,
    target:{closest:()=>null},preventDefault(){}});
  const move={pointerId:1,clientX:210,clientY:155};
  content.listeners.pointerdown(down(false));content.listeners.pointermove(move);
  assert.deepEqual([...c.selection],['a','b']);
  content.listeners.pointerup();assert.equal(c.marquee,null);
  c.selection.clear();c.selection.add('c');
  content.listeners.pointerdown(down(true));content.listeners.pointermove(move);
  assert.deepEqual([...c.selection],['c','a','b']);content.listeners.pointerup();
});

test('Explorer-Drag-and-drop verschiebt die gesamte Auswahl einschließlich Verknüpfungen',async()=>{
  const {context:c,nodes,list}=await environment();
  c.selection.add('a');c.selection.add('c');
  const source=list.children[0],target=element('target');
  c.wireDragSource(source,nodes.find(n=>n.id==='a'));
  c.wireDropTarget(target,'target');
  const data={setData(){}};
  source.listeners.dragstart({dataTransfer:data,preventDefault(){}});
  assert.equal(data.effectAllowed,'move');assert.deepEqual([...c.dragIds],['a','c']);
  let accepted=false;const requests=[];
  target.listeners.dragover({dataTransfer:data,preventDefault(){accepted=true;},stopPropagation(){}});
  assert.equal(accepted,true);assert.equal(data.dropEffect,'move');
  c.api=async(route,body)=>{requests.push({route,body});return {moved:1};};
  target.listeners.drop({preventDefault(){},stopPropagation(){}});
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(requests.length,2);assert.ok(requests.every(r=>r.route==='/api/move'&&r.body.parent==='target'));assert.deepEqual(requests.flatMap(r=>[...r.body.ids]),['a','c']);
  assert.equal(c.dragIds.length,0);
});

test('Teilweise abgeschlossene Verschiebung entfernt nur fertige Elemente aus der Zwischenablage',async()=>{
 const {context:c}=await environment();c.selection.add('a');c.selection.add('c');c.cutSelection();c.api=async(route,body)=>{if(body.ids[0]==='c')throw Error('Ziel nicht erreichbar');return {moved:1};};assert.equal(await c.moveSelection(['a','c'],'target'),false);assert.deepEqual([...c.cutIds],['c']);assert.deepEqual([...c.readClipboard().ids],['c']);
});

test('Umbenennen markiert den Stamm vor der letzten Dateiendung',async()=>{const {renameSelectionEnd}=await import('./public/inline-rename.js');for(const [name,kind,end]of [['Bericht.txt','file',7],['Archiv.tar.gz','file',10],['README','file',6],['.env','file',4],['Ordner.mit.Punkten','folder',18]])assert.equal(renameSelectionEnd({name,kind}),end,name);});


test('Host drop targets require an enabled admin adapter and a real writable folder',async()=>{
 const {context:c,nodes}=await environment();assert.equal(c.dropFolder('host:/tmp'),null);
 c.hostFiles.enabled=()=>true;assert.equal(c.dropFolder('host:/tmp'),null);nodes.push({id:'host:/tmp',kind:'folder',writable:true});assert.equal(c.dropFolder('host:/tmp'),'host:/tmp');nodes.at(-1).writable=false;assert.equal(c.dropFolder('host:/tmp'),null);
});
test('profile selections use the profile endpoint and retain unfinished cut entries',async()=>{
 const {context:c}=await environment(),seen=[];c.state.profileTransfersEnabled=true;c.cutIds=['a','c'];c.saveClipboard('cut',['a','c']);c.rawAPI=async()=>({});c.confirmAction=async()=>true;c.transferHostEntry=async options=>{assert.equal(options.route,'/api/profile-transfer');return options.execute({id:options.id,parent:options.parent});};c.streamOperation=async(route,data)=>{seen.push(route);if(data.id==='c')throw Error('unavailable');return{ok:true};};
 assert.equal(await c.moveSelection(['a','c'],'target'),false);assert.deepEqual([...c.readClipboard().ids],['c']);assert.ok(seen.every(route=>route==='/api/profile-transfer'));
});

test('Explorer sends one recycle action for a profile selection and retains the legacy fallback',async()=>{
 const {context:c}=await environment(),source=await readFile(new URL('./public/app.js',import.meta.url),'utf8'),calls=[];
 vm.runInContext(source.slice(source.indexOf('async function recycleProfileSelection('),source.indexOf('async function recycleFiles(')),c);
 c.state.profileRecycleBatchEnabled=true;c.api=async(route,data)=>{calls.push({route,data});};await c.recycleProfileSelection(['a','c']);
 assert.equal(calls.length,1);assert.equal(calls[0].route,'/api/recycle-batch');assert.equal(calls[0].data.action,'delete');assert.deepEqual([...calls[0].data.ids],['a','c']);
 calls.length=0;c.state.profileRecycleBatchEnabled=false;await c.recycleProfileSelection(['a','c']);assert.deepEqual(calls.map(call=>call.route),['/api/delete','/api/delete']);
});


test('one Explorer transfer selection shares its group token across previews and executions',async()=>{
 const {context:c}=await environment(),tokens=[];c.state.profileTransfersEnabled=true;c.rawAPI=async(route,data)=>{tokens.push(data.batch);return{};};c.confirmAction=async()=>true;c.transferHostEntry=async options=>{await options.request(options.route,{id:options.id});return options.execute({id:options.id,parent:options.parent});};c.streamOperation=async(route,data)=>{tokens.push(data.batch);return{ok:true};};
 await c.transferSelection(['a','c'],'target','copy');assert.equal(tokens.length,4);assert.match(tokens[0],/^[a-f0-9-]{36}$/);assert.ok(tokens.every(token=>token===tokens[0]));const first=tokens[0];tokens.length=0;await c.transferSelection(['a'],'target','copy');assert.notEqual(tokens[0],first);
});
