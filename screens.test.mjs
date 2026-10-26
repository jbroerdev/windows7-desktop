import test from 'node:test';import assert from 'node:assert/strict';import {createScreens,transferredGeometry,recoveredGeometry} from './public/screens.js';
test('Bildschirmübergabe bestätigt den Arbeitsstand vor dem Schließen des Originals',async()=>{
 const original={BroadcastChannel:globalThis.BroadcastChannel,document:globalThis.document,window:globalThis.window,setInterval:globalThis.setInterval,clearInterval:globalThis.clearInterval},channels=[],ticks=[],cleanup=[],events=[];globalThis.BroadcastChannel=class{constructor(){channels.push(this);}postMessage(data){for(const c of channels)if(c!==this)queueMicrotask(()=>c.onmessage?.({data}));}close(){}};globalThis.setInterval=fn=>(ticks.push(fn),ticks.length);globalThis.clearInterval=()=>{};globalThis.document={body:{classList:{toggle(){}}},getElementById:()=>({inert:false,isConnected:true})};globalThis.window={addEventListener:(name,fn)=>{if(name==='pagehide')cleanup.push(fn);}};globalThis.innerWidth=1200;globalThis.innerHeight=800;
 try{let rejectRestore=false;const state={userId:'alice',authenticated:true,desktop:{}},snapshot={version:1,items:[{type:'editor',id:null,name:'Entwurf.txt',content:'Ungespeichert',original:'',geometry:{left:.1}}]};const base={getState:()=>state,api:async()=>({}),reload:async()=>{},toast:message=>events.push(message),capture:async()=>snapshot};let firstHooks;const first=createScreens({...base,desktop:{configureScreenTransfer(hooks){firstHooks=hooks;}},isSecondary:false,restore:async value=>{assert.deepEqual(value,snapshot);events.push('recovered');},closeTransferred:id=>events.push('closed:'+id)});createScreens({...base,desktop:{configureScreenTransfer(){}},isSecondary:true,restore:async value=>{if(rejectRestore)throw Error('Empfängerfehler');assert.deepEqual(value,snapshot);events.push('restored');},closeTransferred(){}});for(const tick of ticks)tick();await new Promise(r=>setTimeout(r,0));await first.transfer('editor-1');assert.deepEqual(events,['restored','closed:editor-1']);rejectRestore=true;await first.transfer('editor-2');assert.deepEqual(events,['restored','closed:editor-1','Empfängerfehler']);assert.ok(firstHooks.target('right'));rejectRestore=false;cleanup[1]();await new Promise(r=>setTimeout(r,0));assert.equal(firstHooks.target('right'),null);assert.equal(events.filter(e=>e==='recovered').length,1);await first.transfer('editor-3');assert.match(events.at(-1),/anderen Bildschirm öffnen/);
 }finally{for(const fn of cleanup)fn();Object.assign(globalThis,original);delete globalThis.innerWidth;delete globalThis.innerHeight;}
});

test('Bildschirmübergang erhält Pixelgröße und Überhang an beiden gemeinsamen Kanten',()=>{
 const source={width:1200,height:800},target={width:1600,height:900};
 const right=transferredGeometry({left:1050,top:120,width:500,height:400},'right',source,target);
 assert.equal(right.left*target.width,-150);
 assert.equal(right.width*target.width,500);
 assert.equal(right.top*target.height,120);
 assert.equal(right.height*target.height,400);
 const left=transferredGeometry({left:-230,top:90,width:500,height:400},'left',source,target);
 assert.equal(left.left*target.width,1370);
 assert.equal(left.width*target.width,500);
});

test('Rückkehr nach Schließen erhält Position und Größe auch bei anderen Bildschirmmaßen',()=>{
 const saved={mode:'normal',left:.25,top:.2,width:.5,height:.6,minimized:false};
 const result=recoveredGeometry(saved,{width:1600,height:900},{width:1200,height:758});
 assert.equal(result.left*1200,400);
 assert.equal(result.top*758,180);
 assert.equal(result.width*1200,800);
 assert.equal(result.height*758,540);
});
