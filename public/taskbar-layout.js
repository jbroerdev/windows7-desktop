import{normalizeTaskbar,taskbarThickness,taskbarWorkArea}from'./taskbar-state.js';

export function nearestTaskbarEdge(x,y,width,height){
 if(![x,y,width,height].every(Number.isFinite))return'bottom';
 return[['left',Math.abs(x)],['right',Math.abs(width-x)],['top',Math.abs(y)],['bottom',Math.abs(height-y)]].sort((a,b)=>a[1]-b[1])[0][0];
}

export function attachTaskbarLayout({taskbar,tray,startMenu,showDesktopButton,desktopSurface,getPreferences,savePreferences,desktop,canEdit=()=>true,onWorkAreaChange=()=>{},document:doc=globalThis.document,window:win=globalThis.window,schedule=setTimeout,cancel=clearTimeout}){
 const body=doc.body,listeners=[],hovered=new Set();let prefs=normalizeTaskbar(),hideTimer=null,peekTimer=null,drag=null,pendingPosition=null,signature='',disposed=false,lastAnchor=null,areaSignature='';
 const on=(target,name,handler)=>{if(!target)return;target.addEventListener(name,handler);listeners.push(()=>target.removeEventListener(name,handler));};
 const clearHide=()=>{if(hideTimer!==null)cancel(hideTimer);hideTimer=null;};
 const hidden=value=>body.classList.toggle('taskbar-auto-hidden',!!value);
 const clearPeek=()=>{if(peekTimer!==null)cancel(peekTimer);peekTimer=null;body.classList.remove('taskbar-peeking');};
 const popups=()=>[...doc.querySelectorAll('.dt-flyout,.sound-flyout,.task-preview,.notification-overflow,#context')].filter(node=>!node.hidden&&node.style?.display!=='none');
 const protectedUI=()=>hovered.size||drag||pendingPosition||startMenu&&!startMenu.hidden||taskbar.contains(doc.activeElement)||tray?.contains(doc.activeElement)||popups().length;
 function considerHide(){
  if(!prefs.autoHide||protectedUI()){clearHide();hidden(false);return;}
  if(hideTimer!==null||body.classList.contains('taskbar-auto-hidden'))return;
  hideTimer=schedule(()=>{hideTimer=null;if(!disposed&&prefs.autoHide&&!protectedUI())hidden(true);},600);
 }
 function positionPopups(){
  const position=pendingPosition||drag?.position||prefs.position;
  if(position==='bottom')return;
  for(const popup of popups()){
   if(popup.id==='context'||popup.classList.contains('notification-overflow'))continue;
   const anchor=popup.classList.contains('task-preview')?lastAnchor||taskbar:popup.classList.contains('dt-flyout')?tray?.querySelector('time')||tray:tray?.querySelector('.sound-tray')||doc.querySelector?.('.notification-overflow .sound-tray')||tray;
   if(!anchor)continue;const rect=anchor.getBoundingClientRect(),width=popup.offsetWidth,height=popup.offsetHeight;
   const x=position==='left'?rect.right+6:position==='right'?rect.left-width-6:rect.right-width;
   const y=position==='top'?rect.bottom+6:rect.bottom-height;
   Object.assign(popup.style,{bottom:'auto',right:'auto',left:Math.max(6,Math.min(win.innerWidth-width-6,x))+'px',top:Math.max(6,Math.min(win.innerHeight-height-6,y))+'px'});
  }
 }
 function geometry(value){
  const p=normalizeTaskbar(value),vertical=['left','right'].includes(p.position),thickness=taskbarThickness({...p,autoHide:false}),noTaskbar=body.classList.contains('secondary-screen')&&!body.classList.contains('secondary-taskbar'),area=noTaskbar?{left:0,top:0,width:win.innerWidth,height:win.innerHeight}:taskbarWorkArea({width:win.innerWidth,height:win.innerHeight},p);
  body.dataset.taskbarPosition=p.position;body.dataset.taskbarSmall=String(p.smallIcons);body.dataset.taskbarAutoHide=String(p.autoHide);body.dataset.taskbarLocked=String(p.locked);
  Object.assign(taskbar.style,{left:p.position==='right'?'auto':'0px',right:p.position==='left'?'auto':'0px',top:p.position==='bottom'?'auto':'0px',bottom:p.position==='top'?'auto':'0px',width:vertical?thickness+'px':'auto',height:vertical?'auto':thickness+'px',flexDirection:vertical?'column':'row'});
  const startButton=taskbar.querySelector('#start-button');if(startButton)Object.assign(startButton.style,{position:'absolute',left:vertical?'50%':'8px',right:'auto',transform:vertical?'translateX(-50%)':'none',top:vertical||p.position==='top'?'1px':'auto',bottom:vertical||p.position==='top'?'auto':'1px'});
  if(tray)Object.assign(tray.style,{left:p.position==='left'?'0px':'auto',right:p.position==='left'?'auto':'0px',top:p.position==='top'?'0px':'auto',bottom:p.position==='top'?'auto':'0px',width:vertical?thickness+'px':'auto',height:vertical?'auto':thickness+'px',flexDirection:vertical?'column':'row'});
  const trayExtent=tray?(vertical?tray.getBoundingClientRect().height:tray.getBoundingClientRect().width):0,reserved=Number.isFinite(trayExtent)?Math.max(0,Math.ceil(trayExtent))+4:4;
  Object.assign(taskbar.style,{paddingTop:vertical?(p.smallIcons?'48px':'59px'):'0px',paddingBottom:vertical?reserved+'px':'0px',paddingLeft:vertical?'0px':'59px',paddingRight:vertical?'0px':reserved+'px'});
  if(desktopSurface)Object.assign(desktopSurface.style,{left:area.left+'px',top:area.top+'px',right:'auto',bottom:'auto',width:area.width+'px',height:area.height+'px'});
  if(startMenu)Object.assign(startMenu.style,{left:p.position==='right'?'auto':p.position==='left'?thickness+'px':'0px',right:p.position==='right'?thickness+'px':'auto',top:p.position==='top'?thickness+'px':'auto',bottom:p.position==='top'?'auto':p.position==='bottom'?thickness+'px':'0px'});
  desktop.configureTaskbar?.(p);desktop.refreshTaskbar?.();positionPopups();
  const nextAreaSignature=JSON.stringify(area);if(nextAreaSignature!==areaSignature){areaSignature=nextAreaSignature;onWorkAreaChange({...area});}
 }
 function update(){
  if(disposed)return;const next=normalizeTaskbar(getPreferences()?.taskbar),key=JSON.stringify(next);
  if(signature!==key){prefs=next;signature=key;clearHide();hidden(false);clearPeek();}
  geometry({...prefs,position:pendingPosition||drag?.position||prefs.position});considerHide();
 }
 for(const node of [taskbar,tray].filter(Boolean)){
  on(node,'pointerenter',()=>{hovered.add(node);clearHide();hidden(false);});on(node,'pointerleave',()=>{hovered.delete(node);considerHide();});
  on(node,'focusin',()=>{clearHide();hidden(false);});on(node,'focusout',()=>{schedule(()=>{if(!disposed)considerHide();},0);});
 }
 on(taskbar,'pointerover',event=>{lastAnchor=event.target.closest?.('button')||lastAnchor;});
 on(showDesktopButton,'pointerenter',()=>{clearPeek();if(prefs.peek)peekTimer=schedule(()=>{peekTimer=null;if(!disposed&&prefs.peek)body.classList.add('taskbar-peeking');},800);});
 on(showDesktopButton,'pointerleave',clearPeek);on(showDesktopButton,'pointerdown',clearPeek);on(doc,'keydown',event=>{if(event.key==='Escape')clearPeek();});
 on(taskbar,'pointerdown',event=>{
  if(event.button!==0||prefs.locked||!canEdit()||event.target.closest?.('button,input,a,time,[role="button"]'))return;
  clearPeek();drag={pointer:event.pointerId,x:event.clientX,y:event.clientY,position:prefs.position,moved:false};taskbar.setPointerCapture?.(event.pointerId);clearHide();hidden(false);
 });
 on(doc,'pointermove',event=>{if(!drag||event.pointerId!==drag.pointer)return;if(Math.hypot(event.clientX-drag.x,event.clientY-drag.y)<8&&!drag.moved)return;drag.moved=true;const position=nearestTaskbarEdge(event.clientX,event.clientY,win.innerWidth,win.innerHeight);if(position!==drag.position){drag.position=position;geometry({...prefs,position});}});
 function finish(event){
  if(!drag||event.pointerId!==drag.pointer)return;const value=drag;drag=null;
  if(event.type==='pointerup'&&value.moved&&value.position!==prefs.position){pendingPosition=value.position;Promise.resolve().then(()=>savePreferences({taskbar:{...prefs,position:value.position}})).catch(()=>{}).finally(()=>{pendingPosition=null;update();});}
  else update();
 }
 on(doc,'pointerup',finish);on(doc,'pointercancel',finish);on(taskbar,'lostpointercapture',finish);
 on(doc,'pointerdown',event=>{if(!showDesktopButton?.contains(event.target))clearPeek();schedule(()=>{if(!disposed)considerHide();},0);});
 on(win,'blur',()=>{drag=null;hovered.clear();clearPeek();update();});on(win,'resize',update);
 const Observer=win.MutationObserver||globalThis.MutationObserver,observer=Observer?new Observer(()=>{positionPopups();considerHide();}):null;
 observer?.observe(body,{childList:true});for(const node of [startMenu,doc.getElementById('context')].filter(Boolean))observer?.observe(node,{attributes:true,attributeFilter:['hidden']});
 const ResizeObserver=win.ResizeObserver,resizeObserver=ResizeObserver&&tray?new ResizeObserver(()=>{if(!disposed)update();}):null;resizeObserver?.observe(tray);
 update();
 return{update,dispose(){disposed=true;resizeObserver?.disconnect();clearHide();clearPeek();hidden(false);observer?.disconnect();for(const remove of listeners)remove();}};
}
