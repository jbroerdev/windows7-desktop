import test from'node:test';import assert from'node:assert/strict';
import{attachTaskbarLayout,nearestTaskbarEdge}from'./public/taskbar-layout.js';

function fixture(taskbarPrefs={},canEdit=true){
 class Element{
  constructor(){this.events=new Map();this.style={};this.dataset={};this.hidden=false;this.children=[];const classes=new Set();this.classList={add:x=>classes.add(x),remove:x=>classes.delete(x),contains:x=>classes.has(x),toggle:(x,on)=>on?classes.add(x):classes.delete(x)};}
  addEventListener(key,fn){if(!this.events.has(key))this.events.set(key,new Set());this.events.get(key).add(fn);}removeEventListener(key,fn){this.events.get(key)?.delete(fn);}emit(key,event={}){for(const fn of this.events.get(key)||[])fn({type:key,target:this,...event});}
  contains(other){return other===this||this.children.some(child=>child.contains(other));}closest(){return null;}querySelector(){return null;}getBoundingClientRect(){return this.rect||{left:100,right:200,top:678,bottom:720,width:100,height:42};}
 }
 const body=new Element(),taskbar=new Element(),tray=new Element(),startMenu=new Element(),show=new Element(),surface=new Element(),outside=new Element(),timers=new Map(),observers=[],resizeObservers=[],saved=[],configured=[],refreshed=[],areas=[];startMenu.hidden=true;tray.children=[show];let prefs={taskbar:taskbarPrefs},nextTimer=0;const popups=[];
 const doc=new Element();Object.assign(doc,{body,activeElement:outside,querySelectorAll:selector=>popups.filter(node=>selector.split(',').some(part=>part.startsWith('.')?node.classList.contains(part.slice(1)):part.startsWith('#')&&node.id===part.slice(1))),getElementById:()=>null});const win=new Element();Object.assign(win,{innerWidth:1280,innerHeight:720,ResizeObserver:class{constructor(callback){this.callback=callback;resizeObservers.push(this);}observe(node){this.node=node;}disconnect(){this.disconnected=true;}},MutationObserver:class{constructor(callback){this.callback=callback;observers.push(this);}observe(){}disconnect(){this.disconnected=true;}}});
 const adapter=attachTaskbarLayout({taskbar,tray,startMenu,showDesktopButton:show,desktopSurface:surface,getPreferences:()=>prefs,savePreferences:async patch=>{saved.push(patch);prefs={...prefs,...patch};},canEdit:()=>canEdit,onWorkAreaChange:area=>areas.push({area,surface:{...surface.style}}),desktop:{configureTaskbar:value=>configured.push(value),refreshTaskbar:()=>refreshed.push({...taskbar.style}),minimize(){throw Error('Peek must not minimize windows');}},document:doc,window:win,schedule:(fn,ms)=>{const id=++nextTimer;timers.set(id,{fn,ms});return id;},cancel:id=>timers.delete(id)});
 const run=ms=>{for(const [id,timer]of [...timers])if(timer.ms===ms){timers.delete(id);timer.fn();}};
 return{adapter,body,taskbar,tray,startMenu,show,surface,doc,win,popups,saved,configured,refreshed,areas,observers,resizeObservers,run,Element,setPrefs:value=>{prefs={taskbar:value};adapter.update();}};
}
test('auto hide waits, holds open menus and focused controls, and resumes after they close',()=>{
 const f=fixture({autoHide:true});try{f.run(600);assert.equal(f.body.classList.contains('taskbar-auto-hidden'),true);f.taskbar.emit('pointerenter');assert.equal(f.body.classList.contains('taskbar-auto-hidden'),false);f.startMenu.hidden=false;f.taskbar.emit('pointerleave');f.run(600);assert.equal(f.body.classList.contains('taskbar-auto-hidden'),false);f.startMenu.hidden=true;f.observers[0].callback();f.run(600);assert.equal(f.body.classList.contains('taskbar-auto-hidden'),true);f.doc.activeElement=f.show;f.tray.emit('focusin');f.run(600);assert.equal(f.body.classList.contains('taskbar-auto-hidden'),false);f.doc.activeElement=null;f.tray.emit('focusout');f.run(0);f.run(600);assert.equal(f.body.classList.contains('taskbar-auto-hidden'),true);f.setPrefs({autoHide:false});assert.equal(f.body.classList.contains('taskbar-auto-hidden'),false);}finally{f.adapter.dispose();}
});
test('Peek is a reversible visual state and obeys its preference without minimizing anything',()=>{
 const f=fixture();try{f.show.emit('pointerenter');f.run(800);assert.equal(f.body.classList.contains('taskbar-peeking'),true);f.show.emit('pointerleave');assert.equal(f.body.classList.contains('taskbar-peeking'),false);f.setPrefs({peek:false});f.show.emit('pointerenter');f.run(800);assert.equal(f.body.classList.contains('taskbar-peeking'),false);}finally{f.adapter.dispose();}
});
test('unlocked docking saves only on completed drag and the working surface follows the selected edge',async()=>{
 const f=fixture({locked:false});try{f.taskbar.emit('pointerdown',{button:0,pointerId:1,clientX:500,clientY:710});f.doc.emit('pointermove',{pointerId:1,clientX:500,clientY:1});assert.equal(f.body.dataset.taskbarPosition,'top');assert.equal(f.surface.style.top,'40px');assert.equal(f.saved.length,0);f.doc.emit('pointerup',{pointerId:1});await new Promise(resolve=>setImmediate(resolve));assert.equal(f.saved[0].taskbar.position,'top');f.setPrefs({locked:true});f.taskbar.emit('pointerdown',{button:0,pointerId:2,clientX:500,clientY:1});f.doc.emit('pointermove',{pointerId:2,clientX:1,clientY:300});f.doc.emit('pointerup',{pointerId:2});assert.equal(f.saved.length,1);assert.equal(nearestTaskbarEdge(1279,400,1280,720),'right');}finally{f.adapter.dispose();}
});
test('tray flyouts prevent hiding and secondary displays without taskbars reserve no taskbar strip',()=>{
 const f=fixture({autoHide:true,position:'left'});try{const popup=new f.Element();popup.classList.add('sound-flyout');popup.offsetWidth=180;popup.offsetHeight=240;f.popups.push(popup);f.observers[0].callback();f.run(600);assert.equal(f.body.classList.contains('taskbar-auto-hidden'),false);assert.ok(Number.parseFloat(popup.style.left)>=0);f.body.classList.add('secondary-screen');f.adapter.update();assert.equal(f.surface.style.left,'0px');assert.equal(f.surface.style.width,'1280px');}finally{f.adapter.dispose();assert.equal(f.observers[0].disconnected,true);}
});


test('work area changes reflow icons only after surface geometry changes, without recursive resize events',()=>{
 const f=fixture();try{
  assert.equal(f.areas.length,1);assert.deepEqual(f.areas[0].area,{left:0,top:0,width:1280,height:680});
  f.adapter.update();f.setPrefs({peek:false,locked:false});assert.equal(f.areas.length,1);
  f.setPrefs({position:'left'});assert.equal(f.areas.length,2);assert.equal(f.areas[1].area.left,62);assert.equal(f.areas[1].surface.left,'62px');assert.equal(f.areas[1].surface.width,'1218px');
  f.win.innerWidth=900;f.win.emit('resize');assert.equal(f.areas.length,3);assert.equal(f.areas[2].area.width,838);
  f.adapter.update();assert.equal(f.areas.length,3);
 }finally{f.adapter.dispose();}
});


test('an open notification overflow keeps auto hide visible until the actual popup is removed',()=>{
 const f=fixture({autoHide:true});try{const panel=new f.Element();panel.classList.add('notification-overflow');f.popups.push(panel);f.observers[0].callback();f.run(600);assert.equal(f.body.classList.contains('taskbar-auto-hidden'),false);assert.equal(panel.style.left,undefined);f.popups.length=0;f.observers[0].callback();f.run(600);assert.equal(f.body.classList.contains('taskbar-auto-hidden'),true);}finally{f.adapter.dispose();}
});

test('taskbar jump lists hold auto hide without being repositioned as a volume flyout',()=>{
 const f=fixture({autoHide:true,position:'left'});try{
  const panel=new f.Element();panel.classList.add('task-jump-menu');panel.style.left='68px';panel.style.top='120px';f.popups.push(panel);f.observers[0].callback();f.run(600);
  assert.equal(f.body.classList.contains('taskbar-auto-hidden'),false);assert.equal(panel.style.left,'68px');assert.equal(panel.style.top,'120px');
  panel.hidden=true;f.observers[0].callback();f.run(600);assert.equal(f.body.classList.contains('taskbar-auto-hidden'),true);
 }finally{f.adapter.dispose();}
});


test('taskbar reserves the actual tray extent and returns hidden icon space to its buttons',()=>{
 const f=fixture();try{
  assert.equal(f.taskbar.style.paddingRight,'104px');assert.equal(f.taskbar.style.paddingLeft,'59px');
  assert.equal(f.resizeObservers[0].node,f.tray);
  f.tray.rect={width:15,height:42};f.resizeObservers[0].callback();
  assert.equal(f.taskbar.style.paddingRight,'19px');assert.equal(f.refreshed.at(-1).paddingRight,'19px');assert.equal(f.areas.length,1);
  f.tray.rect={width:155.25,height:42};f.resizeObservers[0].callback();assert.equal(f.taskbar.style.paddingRight,'160px');
 }finally{f.adapter.dispose();assert.equal(f.resizeObservers[0].disconnected,true);}
});

test('open tray flyouts follow all edges including a return to the bottom',()=>{
 const f=fixture();try{
  const popup=new f.Element();popup.classList.add('sound-flyout');popup.offsetWidth=180;popup.offsetHeight=240;f.popups.push(popup);
  f.tray.rect={left:0,right:62,top:500,bottom:720,width:62,height:220};f.setPrefs({position:'left'});
  assert.equal(popup.style.left,'68px');assert.equal(popup.style.top,'474px');
  f.tray.rect={left:1180,right:1280,top:0,bottom:42,width:100,height:42};f.setPrefs({position:'top'});
  assert.equal(popup.style.top,'48px');
  f.tray.rect={left:1180,right:1280,top:678,bottom:720,width:100,height:42};f.setPrefs({position:'bottom'});
  assert.equal(popup.style.left,'1094px');assert.equal(popup.style.top,'432px');assert.equal(popup.style.bottom,'auto');
  popup.offsetHeight=900;f.adapter.update();assert.equal(popup.style.top,'6px');
 }finally{f.adapter.dispose();}
});

test('vertical tray reservations follow measured height and clear obsolete horizontal padding',()=>{
 const f=fixture();try{
  f.tray.rect={width:62,height:88};f.setPrefs({position:'left'});
  assert.equal(f.taskbar.style.paddingBottom,'92px');assert.equal(f.taskbar.style.paddingTop,'59px');assert.equal(f.taskbar.style.paddingRight,'0px');assert.equal(f.taskbar.style.paddingLeft,'0px');
  f.tray.rect={width:42,height:27};f.setPrefs({position:'right',smallIcons:true});assert.equal(f.taskbar.style.paddingBottom,'31px');assert.equal(f.taskbar.style.paddingTop,'48px');
  f.tray.rect={width:96,height:30};f.setPrefs({position:'top',smallIcons:true});assert.equal(f.taskbar.style.paddingBottom,'0px');assert.equal(f.taskbar.style.paddingTop,'0px');assert.equal(f.taskbar.style.paddingRight,'100px');assert.equal(f.taskbar.style.paddingLeft,'59px');
 }finally{f.adapter.dispose();}
});
