import {test} from 'node:test';
import assert from 'node:assert/strict';
import {constrainBounds,resizeBounds,snapBounds,rememberBounds,recallBounds} from './public/window-manager.js';
import {photoLayout,zoomAt} from './public/photo-geometry.js';

test('Fenster bleiben nach Verschieben und Verkleinern des Bildschirms erreichbar',()=>{
  assert.deepEqual(constrainBounds({left:-80,top:900,width:900,height:800},{width:700,height:500}),
    {left:-80,top:469,width:700,height:500});
  assert.deepEqual(constrainBounds({left:900,top:700,width:20,height:10},{width:1000,height:700}),
    {left:900,top:669,width:320,height:200});
  assert.equal(constrainBounds({left:20,top:30,width:500,height:400},{width:280,height:180},480,330).width,280);
});

test('Freie Fenster können hinter die Taskleiste und seitlich aus dem Bildschirm gezogen werden',()=>{
  const viewport={width:1000,height:700};
  const behind=constrainBounds({left:100,top:600,width:500,height:400},viewport);
  assert.equal(behind.top,600);
  assert.ok(behind.top+behind.height>viewport.height);
  assert.equal(constrainBounds({...behind,left:-900},viewport).left,-404);
  assert.equal(constrainBounds({...behind,left:2000},viewport).left,904);
  assert.equal(constrainBounds({...behind,top:2000},viewport).top,669);
});

test('Größenänderung hält die gegenüberliegende Ecke und die Mindestgröße',()=>{
  const start={left:100,top:100,width:300,height:200};
  assert.deepEqual(resizeBounds(start,'nw',500,400,200,120),{left:200,top:180,width:200,height:120});
  assert.deepEqual(resizeBounds(start,'se',80,60,200,120),{left:100,top:100,width:380,height:260});
});

test('Andocken verwendet genau zwei Bildschirmhälften ohne Überlappung',()=>{
  const viewport={width:1075,height:760},left=snapBounds('left',viewport),right=snapBounds('right',viewport);
  assert.deepEqual(left,{left:0,top:0,width:537,height:760});
  assert.deepEqual(right,{left:537,top:0,width:538,height:760});
  assert.equal(left.left+left.width,right.left);assert.equal(right.left+right.width,viewport.width);
});

test('Foto einpassen berücksichtigt Drehung und veränderte Fenstergröße',()=>{
  const input={width:1600,height:900,viewportWidth:800,viewportHeight:600};
  assert.equal(photoLayout(input).scale,776/1600);
  const rotated=photoLayout({...input,angle:90});
  assert.equal(rotated.scale,576/1600);
  assert.ok(rotated.width<=600);
  const smaller=photoLayout({...input,viewportWidth:400,viewportHeight:300});
  assert.ok(smaller.scale<rotated.scale);
  assert.equal(photoLayout({...input,viewportWidth:0}),null);
});

test('Foto lässt sich nicht aus der Ansicht schieben; Zoom bleibt am Mauspunkt',()=>{
  const p=photoLayout({width:1600,height:900,viewportWidth:800,viewportHeight:600,mode:'manual',scale:1,x:9000,y:-9000});
  assert.equal(p.x,400);assert.equal(p.y,-150);
  const small=photoLayout({width:100,height:100,viewportWidth:800,viewportHeight:600,mode:'manual',scale:1,x:80,y:40});
  assert.equal(Math.abs(small.x),0);assert.equal(Math.abs(small.y),0);
  const next=zoomAt({scale:1,nextScale:2,x:10,y:20,anchorX:100,anchorY:50});
  assert.equal((100-next.x)/next.scale,(100-10)/1);
  assert.equal((50-next.y)/next.scale,(50-20)/1);
});

test('Fenster erinnern relative Größe, Position, Maximierung und Andocken',()=>{
const bounds={left:150,top:70,width:600,height:490},view={width:1000,height:700};
const stored=rememberBounds({bounds,maximized:false,snapSide:null},view);
assert.deepEqual(stored,{mode:'normal',left:.15,top:.1,width:.6,height:.7});
assert.deepEqual(recallBounds(stored,{width:2000,height:1000}).bounds,{left:300,top:100,width:1200,height:700});
const maximized=rememberBounds({bounds:{left:0,top:0,width:1000,height:700},restore:bounds,maximized:true},view);
assert.equal(recallBounds(maximized,view).maximized,true);
assert.deepEqual(recallBounds(maximized,view).bounds,bounds);
assert.equal(recallBounds({...stored,mode:'right'},view).snapSide,'right');
const small=recallBounds(stored,{width:300,height:180},480,330).bounds;
assert.ok(small.width<=300&&small.height<=180&&small.top<=149);
assert.equal(recallBounds({...stored,width:NaN},view),null);
});

test('Taskleiste gruppiert Instanzen und übernimmt verbleibende Fenster',async()=>{
 const {readFile}=await import('node:fs/promises');const source=await readFile(new URL('./public/window-manager.js',import.meta.url),'utf8'),start=source.indexOf('  function syncPins(){'),end=source.indexOf('  function setPins(',start);const record=(id,appId)=>({appId,el:{id,open:true,hidden:false,classList:{contains:()=>false}},title:{textContent:id},task:{hidden:false,classList:{toggle(){}},setAttribute(){}}});const a=record('a','editor'),b=record('b','editor'),c=record('c','media'),records=new Map([['a',a],['b',b],['c',c]]),pins=[];const sync=new Function('records','pins','pinButtons',source.slice(start,end)+';return syncPins;')(records,pins,new Map());sync();assert.equal(a.task.hidden,false);assert.equal(b.task.hidden,true);assert.equal(c.task.hidden,false);a.el.open=false;sync();assert.equal(b.task.hidden,false);pins.push({id:'editor'});sync();assert.equal(b.task.hidden,true);
});

test('Verbindungsrand dockt oben an und übergibt darunter ohne Umschalt',async()=>{const {windowEdgeAction}=await import('./public/window-manager.js');const target=side=>side==='right'?'Auf Bildschirm 2 verschieben':null;assert.deepEqual(windowEdgeAction(1199,50,1200,target),{snap:'right',transfer:null});assert.deepEqual(windowEdgeAction(1199,180,1200,target),{snap:'right',transfer:'Auf Bildschirm 2 verschieben'});assert.deepEqual(windowEdgeAction(1,180,1200,target),{snap:'left',transfer:null});assert.deepEqual(windowEdgeAction(600,2,1200,target),{snap:'top',transfer:null});assert.deepEqual(windowEdgeAction(1199,180,1200,()=>null),{snap:'right',transfer:null});});
test('Fenster ohne dauerhafte Position behalten die Wiederherstellung des gesperrten Arbeitsstands',async()=>{
 const {readFile}=await import('node:fs/promises'),source=await readFile('./public/window-manager.js','utf8');
 const restore=source.slice(source.indexOf('function restorePreference('),source.indexOf('function remember('));
 const remember=source.slice(source.indexOf('function remember('),source.indexOf('  const pinButtons'));
 const workspace=source.slice(source.indexOf('function applyWorkspaceGeometry('),source.indexOf('return {setFixedSize'));
 const record={rememberPlacement:false,preferenceId:'control-panel',bounds:{left:10,top:10,width:650,height:420},minWidth:650,minHeight:420,resizable:true},records=new Map([['control-panel',record]]),preferences={'control-panel':{mode:'maximized',left:0,top:0,width:1,height:1}};let saves=0;
 const api=new Function('records','preferences','recallBounds','rememberBounds','snapBounds','document','onPreferences','apply',`const preferenceKey='test',viewport=()=>({width:1000,height:700}),updateCaption=()=>{},minimize=()=>{};${restore}${remember}${workspace};return{restorePreference,remember,applyWorkspaceGeometry};`)(records,preferences,recallBounds,rememberBounds,snapBounds,{},()=>saves++,(r,b)=>r.bounds=b);
 api.restorePreference(record);api.remember(record);assert.equal(saves,0);assert.equal(record.bounds.left,10);
 api.applyWorkspaceGeometry('control-panel',{mode:'normal',left:.1,top:.2,width:.7,height:.7});assert.deepEqual(record.bounds,{left:100,top:140,width:700,height:490});
});

test('all running tasks retain their marker even when another task is active',async()=>{const{readFile}=await import('node:fs/promises'),source=await readFile('./public/window-manager.js','utf8'),start=source.indexOf('  function syncPins(){'),end=source.indexOf('  function setPins(',start),states=new Map();const record=(id,active)=>({appId:id,el:{id,open:true,hidden:false,classList:{contains:()=>active}},title:{textContent:id},task:{classList:{toggle:(name,value)=>states.set(id+':'+name,value)},setAttribute(){}}});const a=record('mail',false),b=record('editor',true),records=new Map([['mail',a],['editor',b]]),sync=new Function('records','pins','pinButtons',source.slice(start,end)+';return syncPins;')(records,[],new Map());sync();assert.equal(states.get('mail:running'),true);assert.equal(states.get('mail:active'),false);assert.equal(states.get('editor:running'),true);assert.equal(states.get('editor:active'),true);a.el.open=false;sync();assert.equal(states.get('mail:running'),false);});
test('unregistering a closed window removes its task button and observer',async()=>{const{readFile}=await import('node:fs/promises'),source=await readFile('./public/window-manager.js','utf8'),start=source.indexOf('function unregister(id)'),end=source.indexOf('return {setFixedSize',start);let removed=0,disconnected=0,synced=0;const records=new Map([['closed',{task:{remove:()=>removed++},titleObserver:{disconnect:()=>disconnected++}}],['still-open',{}]]),unregister=new Function('records','syncPins',source.slice(start,end)+';return unregister;')(records,()=>synced++);unregister('closed');assert.equal(removed,1);assert.equal(disconnected,1);assert.equal(records.has('closed'),false);assert.equal(records.has('still-open'),true);assert.equal(synced,1);});
