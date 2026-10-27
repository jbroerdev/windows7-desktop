import test from 'node:test';
import assert from 'node:assert/strict';

test('Ladebildschirm wartet auf Apps und Bilder und gibt nach Fehlern die Oberfläche frei',async()=>{
 const names=['document','getComputedStyle','Image','requestAnimationFrame'],previous=Object.fromEntries(names.map(k=>[k,globalThis[k]]));
 const message={},detail={},attrs=new Map(),classes=new Set();let focusRestored=false,backgroundDecoded=false,finishApp,finishImage,finished=false;
 const overlay={hidden:true,querySelector:s=>s.includes('message')?message:detail,focus(){}},focus={isConnected:true,focus:()=>focusRestored=true};
 globalThis.document={activeElement:focus,getElementById:()=>overlay,addEventListener(){},documentElement:{setAttribute:(k,v)=>attrs.set(k,v),removeAttribute:k=>attrs.delete(k)},body:{classList:{add:k=>classes.add(k),remove:k=>classes.delete(k)}},fonts:{ready:Promise.resolve()},images:[{loading:'eager',getClientRects:()=>[{}],decode:()=>new Promise(resolve=>finishImage=resolve)},{loading:'lazy',getClientRects:()=>[{}],decode:()=>{throw Error('Lazy-Bilder dürfen den Start nicht blockieren.');}}],querySelectorAll:()=>[{whenReady:new Promise(resolve=>finishApp=resolve)}]};
 globalThis.getComputedStyle=()=>({backgroundImage:'url("/wallpaper/test.jpg")'});globalThis.Image=class{decode(){backgroundDecoded=true;return Promise.reject(Error('Bild nicht verfügbar'));}};globalThis.requestAnimationFrame=fn=>fn();
 try{
  const {showBusy,hideBusy,waitForDesktopAssets}=await import('./public/session-loading.js');showBusy('Arbeitsstand wird gesichert …','Computer wird gesperrt.');assert.equal(overlay.hidden,false);assert.equal(message.textContent,'Arbeitsstand wird gesichert …');assert.equal(detail.textContent,'Computer wird gesperrt.');assert.equal(attrs.get('aria-busy'),'true');
  const pending=waitForDesktopAssets().then(()=>finished=true);await Promise.resolve();assert.equal(finished,false);finishImage();await Promise.resolve();assert.equal(finished,false);finishApp();await pending;assert.equal(backgroundDecoded,true);assert.equal(finished,true);
  hideBusy();assert.equal(overlay.hidden,true);assert.equal(attrs.has('aria-busy'),false);assert.equal(classes.size,0);assert.equal(focusRestored,true);
 }finally{for(const name of names)if(previous[name]===undefined)delete globalThis[name];else globalThis[name]=previous[name];}
});
