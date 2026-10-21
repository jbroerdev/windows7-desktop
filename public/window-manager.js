export function constrainBounds(bounds,viewport,minWidth=320,minHeight=200){
  const width=Math.min(viewport.width,Math.max(Math.min(minWidth,viewport.width),bounds.width));
  const height=Math.min(viewport.height,Math.max(Math.min(minHeight,viewport.height),bounds.height));
  // Keep enough of the title bar reachable while the rest can leave the desktop.
  const visibleTitle=Math.min(96,width,viewport.width);
  return {width,height,left:Math.max(visibleTitle-width,Math.min(viewport.width-visibleTitle,bounds.left)),top:Math.max(0,Math.min(Math.max(0,viewport.height-31),bounds.top))};
}

export function resizeBounds(start,edge,dx,dy,minWidth,minHeight){
  let {left,top,width,height}=start;
  if(edge.includes('e'))width=Math.max(minWidth,width+dx);
  if(edge.includes('s'))height=Math.max(minHeight,height+dy);
  if(edge.includes('w')){width=Math.max(minWidth,width-dx);left=start.left+start.width-width;}
  if(edge.includes('n')){height=Math.max(minHeight,height-dy);top=start.top+start.height-height;}
  return {left,top,width,height};
}

export function snapBounds(side,viewport){const half=Math.floor(viewport.width/2);return {left:side==='right'?half:0,top:0,width:side==='right'?viewport.width-half:half,height:viewport.height};}

export function rememberBounds(record,viewport){
const b=(record.maximized||record.snapSide?record.restore:record.bounds)||record.bounds;
return {mode:record.maximized?'maximized':record.snapSide||'normal',left:b.left/viewport.width,top:b.top/viewport.height,width:b.width/viewport.width,height:b.height/viewport.height};
}
export function recallBounds(saved,viewport,minWidth=320,minHeight=200){
if(!saved||!['normal','maximized','left','right'].includes(saved.mode)||['left','top','width','height'].some(k=>!Number.isFinite(saved[k]))||saved.width<=0||saved.height<=0)return null;
const bounds=constrainBounds({left:Math.round(saved.left*viewport.width),top:Math.round(saved.top*viewport.height),width:Math.round(saved.width*viewport.width),height:Math.round(saved.height*viewport.height)},viewport,minWidth,minHeight);
return {bounds,maximized:saved.mode==='maximized',snapSide:['left','right'].includes(saved.mode)?saved.mode:null};
}

export function createDesktop(){
  const records=new Map();let z=100,gesture=null,pins=[],pinMenu=null;
  let preferenceKey=null,preferences={},onPreferences=null;
function configurePreferences(key,saved,onChange){if(key===preferenceKey)return;preferenceKey=key;preferences=structuredClone(saved||{});onPreferences=key?onChange:null;for(const record of records.values()){record.preferenceApplied=false;if(record.el.open)restorePreference(record);}}
function restorePreference(record){if(record.preferenceApplied||!preferenceKey)return;record.preferenceApplied=true;const value=recallBounds(preferences[record.preferenceId],viewport(),record.minWidth,record.minHeight);if(value){record.maximized=value.maximized;record.snapSide=value.snapSide;record.restore=value.bounds;apply(record,record.maximized?{left:0,top:0,...viewport()}:record.snapSide?snapBounds(record.snapSide,viewport()):value.bounds);updateCaption(record);}}
function remember(record){if(!onPreferences||!record.bounds||document.fullscreenElement)return;preferences[record.preferenceId]=rememberBounds(record,viewport());onPreferences(structuredClone(preferences));}
const pinButtons=new Map();
  function syncPins(){for(const pin of pins){const button=pinButtons.get(pin.id),running=[...records.values()].filter(r=>r.appId===pin.id&&r.el.open);button?.classList.toggle('active',running.some(r=>r.el.classList.contains('active-window')&&!r.el.hidden));button?.classList.toggle('running',!!running.length);}for(const r of records.values())if(r.task)r.task.hidden=pins.some(p=>p.id===r.appId);}
  function setPins(items,onContext){pins=items;pinMenu=onContext;for(const b of pinButtons.values())b.remove();pinButtons.clear();let anchor=taskbar.querySelector('#start-button');for(const pin of pins){const b=document.createElement('button'),img=document.createElement('img');b.className='pinned-task';b.title=pin.name;b.setAttribute('aria-label',pin.name);img.src=pin.icon;img.alt='';b.append(img);b.onclick=()=>{const running=[...records.values()].filter(r=>r.appId===pin.id&&r.el.open).sort((a,b)=>Number(b.el.style.zIndex)-Number(a.el.style.zIndex));if(!running.length)pin.launch();else if(running[0].el.classList.contains('active-window')&&!running[0].el.hidden)minimize(running[0].el.id);else show(running[0].el.id);};b.oncontextmenu=e=>{e.preventDefault();e.stopPropagation();pinMenu?.(e,pin.id);};if(anchor)anchor.after(b);else taskbar.prepend(b);anchor=b;pinButtons.set(pin.id,b);}syncPins();}
  const taskbar=document.createElement('nav');taskbar.id='desktop-taskbar';taskbar.hidden=true;taskbar.setAttribute('aria-label','Geöffnete Fenster');document.body.append(taskbar);const snapPreview=document.createElement('div');snapPreview.id='window-snap-preview';snapPreview.hidden=true;document.body.append(snapPreview);
  const viewport=()=>({width:innerWidth,height:Math.max(120,innerHeight-42)});
  function apply(record,bounds){record.bounds=constrainBounds(bounds,viewport(),record.snapSide?Math.min(record.minWidth,bounds.width):record.minWidth,record.minHeight);Object.assign(record.el.style,Object.fromEntries(Object.entries(record.bounds).map(([key,value])=>[key,value+'px'])));record.onResize?.();}
  function activate(record){for(const other of records.values()){other.el.classList.toggle('active-window',other===record);other.task?.classList.toggle('active',other===record&&!record.el.hidden);}record.el.style.zIndex=String(++z);syncPins();}
  function buttonTask(record){if(record.task)return;const button=document.createElement('button'),icon=document.createElement('img'),label=document.createElement('span');icon.src=record.icon.replace(/-16\.png$/,'.png');icon.alt='';label.textContent=record.title.textContent;button.append(icon,label);button.title=record.title.textContent;button.onclick=()=>{if(record.el.hidden)show(record.el.id);else if(record.el.classList.contains('active-window'))minimize(record.el.id);else{activate(record);record.el.focus({preventScroll:true});}};record.task=button;taskbar.append(button);taskbar.hidden=false;
    record.titleObserver=new MutationObserver(()=>{label.textContent=record.title.textContent;button.title=record.title.textContent;});record.titleObserver.observe(record.title,{childList:true,characterData:true,subtree:true});}
  function register(el,{bar,title,minimizeButton,maximizeButton,closeButton,close,icon='/icons/file-16.png',appId=null,minWidth=360,minHeight=240,onResize,onMinimize}={}){
    if(records.has(el.id))return records.get(el.id);
    el.classList.add('desktop-window');el.tabIndex=-1;el.setAttribute('aria-labelledby',title.id);bar.classList.add('desktop-titlebar');
    const baseKey=appId||el.id,used=new Set([...records.values()].map(r=>r.preferenceId));let preferenceId=baseKey,index=2;while(used.has(preferenceId))preferenceId=baseKey+':'+index++;
    const record={preferenceId,el,bar,title,icon,appId,minWidth,minHeight,onResize,onMinimize,maximized:false,snapSide:null,bounds:null};records.set(el.id,record);
    el.addEventListener('close',()=>queueMicrotask(syncPins));
    if(!bar.querySelector('img')){const img=document.createElement('img');img.src=icon;img.alt='';bar.prepend(img);}
    if(minimizeButton){minimizeButton.classList.add('window-minimize');minimizeButton.title='Minimieren';minimizeButton.setAttribute('aria-label','Minimieren');minimizeButton.onclick=()=>minimize(el.id);}
    if(maximizeButton){maximizeButton.classList.add('window-maximize');maximizeButton.title='Maximieren';maximizeButton.setAttribute('aria-label','Maximieren');maximizeButton.onclick=()=>maximize(el.id);record.maximizeButton=maximizeButton;}
    if(closeButton){closeButton.classList.add('window-close');if(!closeButton.hasAttribute('aria-label'))closeButton.setAttribute('aria-label','Fenster schließen');closeButton.title='Schließen';closeButton.onclick=close||(()=>el.close());}
    bar.addEventListener('dblclick',e=>{if(!e.target.closest('button,a,input'))maximize(el.id);});
    bar.addEventListener('pointerdown',e=>{if(e.button!==0||e.target.closest('button,a,input')||document.fullscreenElement)return;begin(record,e,'move',bar);});
    el.addEventListener('pointerdown',()=>activate(record),true);el.addEventListener('focusin',()=>activate(record));
    for(const edge of ['n','s','e','w','ne','nw','se','sw']){const handle=document.createElement('div');handle.className='window-resize window-resize-'+edge;handle.setAttribute('aria-hidden','true');handle.addEventListener('pointerdown',e=>{if(e.button!==0||record.maximized||document.fullscreenElement)return;begin(record,e,edge,handle);});el.append(handle);}
    el.addEventListener('close',()=>{if(gesture?.record===record)finish();remember(record);record.titleObserver?.disconnect();record.task?.remove();record.task=null;el.hidden=false;el.classList.remove('active-window');taskbar.hidden=!document.body.classList.contains('desktop-shell')&&![...records.values()].some(r=>r.el.open);const top=[...records.values()].filter(r=>r.el.open&&!r.el.hidden).sort((a,b)=>Number(b.el.style.zIndex)-Number(a.el.style.zIndex))[0];if(top)activate(top);});
    return record;
  }
  function updateCaption(record){record.el.classList.toggle('desktop-maximized',record.maximized);record.el.classList.toggle('desktop-snapped',!!record.snapSide);if(record.maximizeButton){record.maximizeButton.textContent=record.maximized?'❐':'□';record.maximizeButton.title=record.maximized?'Wiederherstellen':'Maximieren';record.maximizeButton.setAttribute('aria-label',record.maximizeButton.title);}}
  function snap(id,side){const record=records.get(id);if(!record)return;if(!record.maximized&&!record.snapSide)record.restore={...record.bounds};record.maximized=false;record.snapSide=side;apply(record,snapBounds(side,viewport()));updateCaption(record);activate(record);remember(record);}
  function begin(record,e,edge,handle){activate(record);if(edge==='move'&&(record.maximized||record.snapSide)){const ratio=(e.clientX-record.bounds.left)/record.bounds.width,normal=record.restore||record.bounds;record.maximized=false;record.snapSide=null;updateCaption(record);apply(record,{...normal,left:e.clientX-normal.width*ratio,top:e.clientY-15});}else if(edge!=='move'&&record.snapSide){record.snapSide=null;updateCaption(record);}gesture={record,edge,start:{...record.bounds},x:e.clientX,y:e.clientY,pointer:e.pointerId,handle};handle.setPointerCapture(e.pointerId);document.body.classList.add('moving-window');e.preventDefault();e.stopPropagation();}
  function finish(commit=false){if(gesture){const current=gesture;gesture=null;if(current.handle.hasPointerCapture(current.pointer))current.handle.releasePointerCapture(current.pointer);if(commit&&current.snap)snap(current.record.el.id,current.snap);remember(current.record);}snapPreview.hidden=true;document.body.classList.remove('moving-window');}
  document.addEventListener('pointermove',e=>{if(!gesture||e.pointerId!==gesture.pointer)return;const {record,start,edge}=gesture,dx=e.clientX-gesture.x,dy=e.clientY-gesture.y;apply(record,edge==='move'?{...start,left:start.left+dx,top:start.top+dy}:resizeBounds(start,edge,dx,dy,record.minWidth,record.minHeight));if(edge==='move'){gesture.snap=e.clientX<=18?'left':e.clientX>=innerWidth-18?'right':null;snapPreview.hidden=!gesture.snap;if(gesture.snap){const bounds=snapBounds(gesture.snap,viewport());Object.assign(snapPreview.style,Object.fromEntries(Object.entries(bounds).map(([key,value])=>[key,value+'px'])));snapPreview.style.zIndex=String(Number(record.el.style.zIndex)-1);}}});
  for(const type of ['pointerup','pointercancel','lostpointercapture'])document.addEventListener(type,e=>finish(e.type==='pointerup'));
  window.addEventListener('blur',()=>{finish();queueMicrotask(()=>{const frame=document.activeElement;if(frame?.tagName==='IFRAME'){const record=[...records.values()].find(r=>r.el.contains(frame));if(record)activate(record);}});});
  function show(id){const record=records.get(id);if(!record)throw Error('Unbekanntes Fenster: '+id);record.el.hidden=false;if(!record.el.open)record.el.show();buttonTask(record);if(!record.bounds){const r=record.el.getBoundingClientRect(),v=viewport(),offset=([...records.values()].filter(x=>x.el.open).length-1)*22;apply(record,{left:(v.width-r.width)/2+offset,top:(v.height-r.height)/2+offset,width:r.width,height:r.height});}else apply(record,record.maximized?{left:0,top:0,...viewport()}:record.snapSide?snapBounds(record.snapSide,viewport()):record.bounds);restorePreference(record);activate(record);record.el.focus({preventScroll:true});}
  function minimize(id){const record=records.get(id);if(!record)return;record.onMinimize?.();record.el.hidden=true;record.el.classList.remove('active-window');record.task?.classList.remove('active');syncPins();}
  function maximize(id){const record=records.get(id);if(!record)return;if(record.maximized){record.maximized=false;record.snapSide=null;apply(record,record.restore||record.bounds);}else{if(!record.snapSide)record.restore={...record.bounds};record.snapSide=null;record.maximized=true;apply(record,{left:0,top:0,...viewport()});}updateCaption(record);activate(record);remember(record);}
  window.addEventListener('resize',()=>{for(const r of records.values())if(r.el.open)apply(r,r.maximized?{left:0,top:0,...viewport()}:r.snapSide?snapBounds(r.snapSide,viewport()):r.bounds);});
  taskbar.addEventListener('contextmenu',e=>{const record=[...records.values()].find(r=>r.task?.contains(e.target));if(record?.appId){e.preventDefault();pinMenu?.(e,record.appId);}});
  return {configurePreferences,register,show,minimize,maximize,snap,setPins,taskActions:id=>[...records.values()].filter(r=>r.appId===id&&r.el.open).map(r=>[r.title.textContent,()=>show(r.el.id)]),unregister:id=>{records.delete(id);syncPins();}};
}
