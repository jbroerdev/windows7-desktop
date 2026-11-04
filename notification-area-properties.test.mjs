import test from 'node:test';
import assert from 'node:assert/strict';
import {createNotificationAreaProperties} from './public/notification-area-properties.js';

function fixture(initial={}, {editable=true,fail=false}={}){
 const keys=['document','innerWidth','innerHeight'],prior=Object.fromEntries(keys.map(k=>[k,globalThis[k]])),elements=[],saved=[],opened=[],removed=[];
 class Element extends EventTarget{
  constructor(tag){super();this.tagName=tag.toUpperCase();this.children=[];this.attributes={};this.value='';this.style={};const classes=new Set();this.classList={toggle:(key,on)=>on?classes.add(key):classes.delete(key)};elements.push(this);}
  append(...nodes){this.children.push(...nodes);}replaceChildren(...nodes){this.children=[];this.append(...nodes);}setAttribute(k,v){this.attributes[k]=v;}
  close(){this.open=false;this.dispatchEvent(new Event('close'));}remove(){this.removed=true;}focus(){}
 }
 globalThis.document={body:new Element('body'),createElement:tag=>new Element(tag)};globalThis.innerWidth=1280;globalThis.innerHeight=720;
 let context='alice:personal',preferences={...initial};
 const app=createNotificationAreaProperties({desktop:{register(){},show(id){elements.find(e=>e.id===id).open=true;},unregister:id=>removed.push(id),applyWorkspaceGeometry(){}},getPreferences:()=>preferences,getContextKey:()=>context,canEdit:()=>editable,save:async value=>{if(fail)throw Error('Speicherfehler');saved.push(value);preferences=value;},openControlPanel:query=>opened.push(query)});
 const dialog=app.open(),all=node=>[node,...node.children.flatMap(all)],nodes=()=>all(dialog),button=text=>nodes().find(e=>e.tagName==='BUTTON'&&e.textContent===text),select=name=>nodes().find(e=>e.tagName==='SELECT'&&e.attributes['aria-label']===name),change=(name,value)=>{const node=select(name);node.value=value;node.onchange();};
 return{app,dialog,nodes,button,select,change,saved,opened,removed,context(value){context=value;},restore(){for(const key of keys)if(prior[key]===undefined)delete globalThis[key];else globalThis[key]=prior[key];}};
}

test('notification draft spans both pages, restores prior overflow after system toggle, and saves only on OK',async()=>{
 const f=fixture({volume:'overflow'});try{
  f.button('Systemsymbole aktivieren oder deaktivieren').onclick();f.change('Lautstärke','off');f.change('Uhr','off');f.change('Lautstärke','on');
  f.button('Benachrichtigungssymbole anpassen').onclick();assert.equal(f.select('Lautstärke').value,'overflow');assert.equal(f.saved.length,0);
  await f.button('OK').onclick();assert.deepEqual(f.saved,[{clock:false,volume:'overflow',alwaysShow:false}]);assert.equal(f.dialog.open,false);assert.equal(f.removed.length,1);
 }finally{f.restore();}
});

test('Cancel discards changes and reopening reads the saved preferences',()=>{
 const f=fixture();try{f.change('Lautstärke','off');f.button('Abbrechen').onclick();assert.equal(f.saved.length,0);const next=f.app.open();assert.notEqual(next,f.dialog);const all=node=>[node,...node.children.flatMap(all)];assert.equal(all(next).find(e=>e.tagName==='SELECT').value,'show');}finally{f.restore();}
});

test('failed saves retain page, draft and visible error for retry',async()=>{
 const f=fixture({}, {fail:true});try{f.change('Lautstärke','overflow');await f.button('OK').onclick();assert.equal(f.dialog.open,true);assert.equal(f.select('Lautstärke').value,'overflow');assert.equal(f.nodes().find(e=>e.attributes.role==='alert').textContent,'Speicherfehler');assert.equal(f.button('OK').disabled,false);}finally{f.restore();}
});

test('read-only controls cannot submit a preference update',async()=>{
 const f=fixture({}, {editable:false});try{assert.equal(f.select('Lautstärke').disabled,true);assert.equal(f.button('Standardverhalten für Symbole wiederherstellen').disabled,true);await f.button('OK').onclick();assert.equal(f.saved.length,0);}finally{f.restore();}
});

test('profile or share context changes close stale drafts and cannot save them into another profile',async()=>{
 for(const refresh of [false,true]){const f=fixture();try{f.change('Lautstärke','off');f.context('admin:share');if(refresh)f.app.refresh();else await f.button('OK').onclick();assert.equal(f.dialog.open,false);assert.equal(f.saved.length,0);assert.equal(f.removed.length,1);}finally{f.restore();}}
});

test('always-show keeps an explicitly disabled system icon disabled and defaults require OK',async()=>{
 const f=fixture({volume:'off'});try{const check=f.nodes().find(e=>e.tagName==='INPUT'&&e.type==='checkbox');check.checked=true;check.onchange();assert.equal(f.select('Lautstärke').disabled,true);assert.equal(f.select('Lautstärke').value,'off');f.button('Standardverhalten für Symbole wiederherstellen').onclick();assert.equal(f.select('Lautstärke').value,'show');assert.equal(f.saved.length,0);await f.button('OK').onclick();assert.deepEqual(f.saved,[{clock:true,volume:'show',alwaysShow:false}]);}finally{f.restore();}
});

test('Escape discards a draft, and search hands its query to the main Control Panel',()=>{
 const f=fixture();try{f.change('Lautstärke','off');const event=new Event('keydown',{cancelable:true});Object.defineProperty(event,'key',{value:'Escape'});f.dialog.dispatchEvent(event);assert.equal(f.dialog.open,false);assert.equal(f.saved.length,0);}finally{f.restore();}
 const s=fixture();try{const search=s.nodes().find(e=>e.tagName==='INPUT'&&e.type==='search');search.value='Sound';search.onkeydown({key:'Enter',preventDefault(){}});assert.deepEqual(s.opened,['Sound']);assert.equal(s.dialog.open,false);}finally{s.restore();}
});
