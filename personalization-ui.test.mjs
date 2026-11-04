import test from 'node:test';import assert from'node:assert/strict';import{readFile}from'node:fs/promises';
const source=(await readFile(new URL('./public/personalization.js',import.meta.url),'utf8')).replace(/from'\/([^']+)'/g,(_,name)=>'from'+JSON.stringify(new URL('./public/'+name,import.meta.url).href));
const startupDocument=globalThis.document;globalThis.document={addEventListener(){}};
const{renderPersonalization}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
globalThis.document=startupDocument;
function fixture(){const previous=globalThis.document;class Element{constructor(tag){this.tag=tag;this.children=[];this.attributes={};this.style={};}append(...nodes){for(const n of nodes){n.parentElement=this;this.children.push(n);}}setAttribute(k,v){this.attributes[k]=v;}}globalThis.document={createElement:tag=>new Element(tag)};return{root:new Element('main'),all:e=>[e,...e.children.flatMap(x=>[x,...descend(x)])],restore:()=>globalThis.document=previous};function descend(e){return e.children.flatMap(x=>[x,...descend(x)]);}}
const groups=['Windows 7 – Windows','Windows 7 – Architektur','Windows 7 – Figuren','Windows 7 – Landschaften','Windows 7 – Natur','Windows 7 – Szenen','Regionen – Deutschland','Regionen – Japan'];
const defaults=groups.map((group,i)=>({name:'Image '+i,group,url:'/wallpapers/'+i+'.jpg'}));
const options=current=>({gallery:{defaults,history:[],current},prefs:{appearance:{color:'#69a4c9',intensity:50,transparency:true},themes:[]},select:async()=>{},wallpaper(){},colors(){},sound(){},saveTheme:async()=>{},applyTheme:async()=>{},deleteTheme:async()=>{}});

test('an unchanged preset has no phantom unsaved theme and German Aero order is native',()=>{
 const f=fixture();try{renderPersonalization(f.root,options(defaults[0].url));const nodes=f.all(f.root);
 assert.equal(nodes.some(e=>e.textContent==='Eigene Designs (0)'),true);
 assert.equal(nodes.some(e=>e.attributes['aria-label']==='Design Nicht gespeichertes Design'),false);
 const themes=nodes.filter(e=>e.attributes['aria-label']?.startsWith('Design '));
 assert.deepEqual(themes.slice(0,7).map(e=>e.attributes['aria-label']),['Design Windows 7','Design Architektur','Design Figuren','Design Landschaften','Design Natur','Design Szenen','Design Deutschland']);
 assert.equal(nodes.some(e=>e.textContent==='Aero-Designs (7)'),true);
 }finally{f.restore();}
});
test('Germany uses an existing wallpaper record and preserves the select callback contract',async()=>{
 const f=fixture();try{const opts=options(defaults[0].url);let selected;opts.select=async(item,color)=>selected={item,color};renderPersonalization(f.root,opts);const german=f.all(f.root).find(e=>e.attributes['aria-label']==='Design Deutschland');await german.onclick();assert.equal(selected.item,defaults[6]);assert.equal(selected.color,'#69a4c9');}finally{f.restore();}
});
test('a custom appearance keeps the existing unsaved-theme path',()=>{
 const f=fixture();try{const opts=options('/wallpapers/custom.jpg');renderPersonalization(f.root,opts);const nodes=f.all(f.root);assert.equal(nodes.some(e=>e.textContent==='Eigene Designs (1)'),true);assert.equal(nodes.some(e=>e.attributes['aria-label']==='Design Nicht gespeichertes Design'),true);assert.equal(nodes.some(e=>e.textContent==='Design speichern'),true);}finally{f.restore();}
});

test('modified preset sound or transparency still exposes saving, while mixer volume does not change a theme',()=>{
 for(const patch of [{sound:{scheme:'silent'}},{appearance:{color:'#69a4c9',intensity:23,transparency:true}},{appearance:{color:'#69a4c9',intensity:50,transparency:false}}]){const f=fixture();try{const opts=options(defaults[0].url);Object.assign(opts.prefs,patch);renderPersonalization(f.root,opts);const nodes=f.all(f.root);assert.ok(nodes.some(e=>e.attributes['aria-label']==='Design Nicht gespeichertes Design'));assert.ok(nodes.some(e=>e.textContent==='Design speichern'));}finally{f.restore();}}
 const f=fixture();try{const opts=options(defaults[0].url);opts.prefs.sound={volume:21};renderPersonalization(f.root,opts);assert.equal(f.all(f.root).some(e=>e.attributes['aria-label']==='Design Nicht gespeichertes Design'),false);}finally{f.restore();}
});
