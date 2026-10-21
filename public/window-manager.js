export function constrainBounds(bounds,viewport,minWidth=320,minHeight=200){
  const width=Math.min(viewport.width,Math.max(Math.min(minWidth,viewport.width),bounds.width));
  const height=Math.min(viewport.height,Math.max(Math.min(minHeight,viewport.height),bounds.height));
  return {width,height,left:Math.max(0,Math.min(viewport.width-width,bounds.left)),top:Math.max(0,Math.min(viewport.height-height,bounds.top))};
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

export function createDesktop(){
  const records=new Map();let z=100,gesture=null;
  const taskbar=document.createElement('nav');taskbar.id='desktop-taskbar';taskbar.hidden=true;taskbar.setAttribute('aria-label','Geöffnete Fenster');document.body.append(taskbar);const snapPreview=document.createElement('div');snapPreview.id='window-snap-preview';snapPreview.hidden=true;document.body.append(snapPreview);
  const viewport=()=>({width:innerWidth,height:Math.max(120,innerHeight-42)});
  function apply(record,bounds){record.bounds=constrainBounds(bounds,viewport(),record.snapSide?Math.min(record.minWidth,bounds.width):record.minWidth,record.minHeight);Object.assign(record.el.style,Object.fromEntries(Object.entries(record.bounds).map(([key,value])=>[key,value+'px'])));record.onResize?.();}
  function activate(record){for(const other of records.values()){other.el.classList.toggle('active-window',other===record);other.task?.classList.toggle('active',other===record&&!record.el.hidden);}record.el.style.zIndex=String(++z);}
  function buttonTask(record){if(record.task)return;const button=document.createElement('button'),icon=document.createElement('img'),label=document.createElement('span');icon.src=record.icon.replace(/-16\.png$/,'.png');icon.alt='';label.textContent=record.title.textContent;button.append(icon,label);button.title=record.title.textContent;button.onclick=()=>{if(record.el.hidden)show(record.el.id);else if(record.el.classList.contains('active-window'))minimize(record.el.id);else{activate(record);record.el.focus({preventScroll:true});}};record.task=button;taskbar.append(button);taskbar.hidden=false;
    record.titleObserver=new MutationObserver(()=>{label.textContent=record.title.textContent;button.title=record.title.textContent;});record.titleObserver.observe(record.title,{childList:true,characterData:true,subtree:true});}
  function register(el,{bar,title,minimizeButton,maximizeButton,closeButton,close,icon='/icons/file-16.png',minWidth=360,minHeight=240,onResize,onMinimize}={}){
    if(records.has(el.id))return records.get(el.id);
    el.classList.add('desktop-window');el.tabIndex=-1;el.setAttribute('aria-labelledby',title.id);bar.classList.add('desktop-titlebar');
    const record={el,bar,title,icon,minWidth,minHeight,onResize,onMinimize,maximized:false,snapSide:null,bounds:null};records.set(el.id,record);
    if(!bar.querySelector('img')){const img=document.createElement('img');img.src=icon;img.alt='';bar.prepend(img);}
    if(minimizeButton){minimizeButton.classList.add('window-minimize');minimizeButton.title='Minimieren';minimizeButton.setAttribute('aria-label','Minimieren');minimizeButton.onclick=()=>minimize(el.id);}
    if(maximizeButton){maximizeButton.classList.add('window-maximize');maximizeButton.title='Maximieren';maximizeButton.setAttribute('aria-label','Maximieren');maximizeButton.onclick=()=>maximize(el.id);record.maximizeButton=maximizeButton;}
    if(closeButton){closeButton.classList.add('window-close');if(!closeButton.hasAttribute('aria-label'))closeButton.setAttribute('aria-label','Fenster schließen');closeButton.title='Schließen';closeButton.onclick=close||(()=>el.close());}
    bar.addEventListener('dblclick',e=>{if(!e.target.closest('button,a,input'))maximize(el.id);});
    bar.addEventListener('pointerdown',e=>{if(e.button!==0||e.target.closest('button,a,input')||document.fullscreenElement)return;begin(record,e,'move',bar);});
    el.addEventListener('pointerdown',()=>activate(record),true);el.addEventListener('focusin',()=>activate(record));
    for(const edge of ['n','s','e','w','ne','nw','se','sw']){const handle=document.createElement('div');handle.className='window-resize window-resize-'+edge;handle.setAttribute('aria-hidden','true');handle.addEventListener('pointerdown',e=>{if(e.button!==0||record.maximized||document.fullscreenElement)return;begin(record,e,edge,handle);});el.append(handle);}
    el.addEventListener('close',()=>{if(gesture?.record===record)finish();record.titleObserver?.disconnect();record.task?.remove();record.task=null;el.hidden=false;el.classList.remove('active-window');taskbar.hidden=!document.body.classList.contains('desktop-shell')&&![...records.values()].some(r=>r.el.open);const top=[...records.values()].filter(r=>r.el.open&&!r.el.hidden).sort((a,b)=>Number(b.el.style.zIndex)-Number(a.el.style.zIndex))[0];if(top)activate(top);});
    return record;
  }
  function updateCaption(record){record.el.classList.toggle('desktop-maximized',record.maximized);record.el.classList.toggle('desktop-snapped',!!record.snapSide);if(record.maximizeButton){record.maximizeButton.textContent=record.maximized?'❐':'□';record.maximizeButton.title=record.maximized?'Wiederherstellen':'Maximieren';record.maximizeButton.setAttribute('aria-label',record.maximizeButton.title);}}
  function snap(id,side){const record=records.get(id);if(!record)return;if(!record.maximized&&!record.snapSide)record.restore={...record.bounds};record.maximized=false;record.snapSide=side;apply(record,snapBounds(side,viewport()));updateCaption(record);activate(record);}
  function begin(record,e,edge,handle){activate(record);if(edge==='move'&&(record.maximized||record.snapSide)){const ratio=(e.clientX-record.bounds.left)/record.bounds.width,normal=record.restore||record.bounds;record.maximized=false;record.snapSide=null;updateCaption(record);apply(record,{...normal,left:e.clientX-normal.width*ratio,top:e.clientY-15});}else if(edge!=='move'&&record.snapSide){record.snapSide=null;updateCaption(record);}gesture={record,edge,start:{...record.bounds},x:e.clientX,y:e.clientY,pointer:e.pointerId,handle};handle.setPointerCapture(e.pointerId);document.body.classList.add('moving-window');e.preventDefault();e.stopPropagation();}
  function finish(commit=false){if(gesture){const current=gesture;gesture=null;if(current.handle.hasPointerCapture(current.pointer))current.handle.releasePointerCapture(current.pointer);if(commit&&current.snap)snap(current.record.el.id,current.snap);}snapPreview.hidden=true;document.body.classList.remove('moving-window');}
  document.addEventListener('pointermove',e=>{if(!gesture||e.pointerId!==gesture.pointer)return;const {record,start,edge}=gesture,dx=e.clientX-gesture.x,dy=e.clientY-gesture.y;apply(record,edge==='move'?{...start,left:start.left+dx,top:start.top+dy}:resizeBounds(start,edge,dx,dy,record.minWidth,record.minHeight));if(edge==='move'){gesture.snap=e.clientX<=18?'left':e.clientX>=innerWidth-18?'right':null;snapPreview.hidden=!gesture.snap;if(gesture.snap){const bounds=snapBounds(gesture.snap,viewport());Object.assign(snapPreview.style,Object.fromEntries(Object.entries(bounds).map(([key,value])=>[key,value+'px'])));snapPreview.style.zIndex=String(Number(record.el.style.zIndex)-1);}}});
  for(const type of ['pointerup','pointercancel','lostpointercapture'])document.addEventListener(type,e=>finish(e.type==='pointerup'));
  window.addEventListener('blur',()=>{finish();queueMicrotask(()=>{const frame=document.activeElement;if(frame?.tagName==='IFRAME'){const record=[...records.values()].find(r=>r.el.contains(frame));if(record)activate(record);}});});
  function show(id){const record=records.get(id);if(!record)throw Error('Unbekanntes Fenster: '+id);record.el.hidden=false;if(!record.el.open)record.el.show();buttonTask(record);if(!record.bounds){const r=record.el.getBoundingClientRect(),v=viewport(),offset=([...records.values()].filter(x=>x.el.open).length-1)*22;apply(record,{left:(v.width-r.width)/2+offset,top:(v.height-r.height)/2+offset,width:r.width,height:r.height});}else apply(record,record.maximized?{left:0,top:0,...viewport()}:record.snapSide?snapBounds(record.snapSide,viewport()):record.bounds);activate(record);record.el.focus({preventScroll:true});}
  function minimize(id){const record=records.get(id);if(!record)return;record.onMinimize?.();record.el.hidden=true;record.el.classList.remove('active-window');record.task?.classList.remove('active');}
  function maximize(id){const record=records.get(id);if(!record)return;if(record.maximized){record.maximized=false;record.snapSide=null;apply(record,record.restore||record.bounds);}else{if(!record.snapSide)record.restore={...record.bounds};record.snapSide=null;record.maximized=true;apply(record,{left:0,top:0,...viewport()});}updateCaption(record);activate(record);}
  window.addEventListener('resize',()=>{for(const r of records.values())if(r.el.open)apply(r,r.maximized?{left:0,top:0,...viewport()}:r.snapSide?snapBounds(r.snapSide,viewport()):r.bounds);});
  return {register,show,minimize,maximize,snap,unregister:id=>records.delete(id)};
}
