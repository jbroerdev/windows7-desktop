import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {taskbarWorkArea} from './public/taskbar-state.js';

// Load the actual browser module and its real dependencies without a browser URL root.
const urls=new Map();
async function browserModule(name){
 if(urls.has(name))return urls.get(name);
 let source=await readFile(new URL('./public/'+name,import.meta.url),'utf8');
 for(const match of [...source.matchAll(/from\s*(['"])\/([^'"]+)\1/g)])source=source.replace(match[0],'from '+JSON.stringify(await browserModule(match[2])));
 const url='data:text/javascript;base64,'+Buffer.from(source).toString('base64');urls.set(name,url);return url;
}
const {snippingPopupBounds}=await import(await browserModule('snipping-tool.js'));

test('Snipping popup opens below its trigger, or above when the lower edge has no room',()=>{
 const area={left:0,top:0,width:1280,height:678},size={width:215,height:128};
 assert.deepEqual(snippingPopupBounds({left:100,top:100,bottom:122},size,area),{left:100,top:122,width:215,height:128});
 assert.deepEqual(snippingPopupBounds({left:1100,top:620,bottom:642},size,area),{left:1059,top:492,width:215,height:128});
});

test('Snipping popup stays inside every taskbar work area, including oversized menus and tiny viewports',()=>{
 for(const viewport of [{width:1280,height:720},{width:320,height:240},{width:8,height:8}])for(const position of ['top','bottom','left','right'])for(const smallIcons of [false,true])for(const autoHide of [false,true]){
  const area=taskbarWorkArea(viewport,{position,smallIcons,autoHide});
  for(const size of [{width:215,height:128},{width:5000,height:5000}])for(const anchor of [{left:-200,top:-100,bottom:-80},{left:viewport.width+50,top:viewport.height+50,bottom:viewport.height+72}]){
   const result=snippingPopupBounds(anchor,size,area);
   assert.ok(result.left>=area.left&&result.top>=area.top,JSON.stringify({area,result}));
   assert.ok(result.left+result.width<=area.left+area.width&&result.top+result.height<=area.top+area.height,JSON.stringify({area,result}));
   assert.ok(result.width>=0&&result.height>=0);
  }
 }
});
