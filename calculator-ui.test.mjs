import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const source=(await readFile(new URL('./public/calculator.js',import.meta.url),'utf8')).replace("'/calculator-engine.js'",JSON.stringify(new URL('./public/calculator-engine.js',import.meta.url).href));
const {createCalculator,formatNumber}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));

test('German digit grouping preserves precision, fractional input and scientific notation',()=>{
 assert.equal(formatNumber('1234567890123456789.012300',true),'1.234.567.890.123.456.789,012300');
 assert.equal(formatNumber('-12345.',true),'-12.345,');
 assert.equal(formatNumber('12345.6',false),'12345,6');
 assert.equal(formatNumber('1e+21',true),'1e+21');
});

// Small DOM adapter exercises event routing rather than matching source strings.
function fixture(resume){
 const previous=globalThis.document;
 class Element{
  constructor(tag){this.tag=tag;this.children=[];this.style={};this.dataset={};this.attributes={};this.events={};this.classList={toggle(){}};}
  append(...nodes){for(const n of nodes){n.parent=this;this.children.push(n);}}
  replaceChildren(...nodes){this.children=[];this.append(...nodes);}
  setAttribute(k,v){this.attributes[k]=v;}
  addEventListener(k,fn){this.events[k]=fn;}
  removeEventListener(k){delete this.events[k];}
  remove(){this.parent.children=this.parent.children.filter(x=>x!==this);}
  focus(){document.activeElement=this;}
  click(){if(!this.disabled)this.onclick?.();}
  contains(e){return e===this||this.children.some(c=>c.contains(e));}
  closest(selector){return selector==='input,select'&&['input','select'].includes(this.tag)?this:null;}
  querySelectorAll(selector){const matches=e=>selector==='input'?e.tag==='input':selector==='button:not(:disabled)'?e.tag==='button'&&!e.disabled:selector==='[data-digit]'?e.dataset.digit!==undefined:selector.startsWith('.')?(e.className||'').split(' ').includes(selector.slice(1)):false;return this.children.flatMap(c=>[...(matches(c)?[c]:[]),...c.querySelectorAll(selector)]);}
  querySelector(s){return this.querySelectorAll(s)[0];}
 }
 const doc={createElement:t=>new Element(t),createTextNode:t=>Object.assign(new Element('text'),{textContent:t}),head:new Element('head'),body:new Element('body'),querySelector(){return true;},addEventListener(){},removeEventListener(){}};
 globalThis.document=doc;
 const sizes=[];const dialog=createCalculator({desktop:{register(){},show(){},setFixedSize:(id,w,h)=>sizes.push([w,h]),unregister(){}},toast(){}}).open(resume);
 const nav=dialog.children[1],output=dialog.children[2].children[0].children[0].children[1];
 const press=(key,options={})=>{const event={key,target:doc.activeElement||output,preventDefault(){},stopPropagation(){},...options};dialog.events.keydown(event);};
 return {dialog,nav,output,press,sizes,restore(){globalThis.document=previous;}};
}

test('Escape closes the menu without clearing input and restores the menu anchor',()=>{
 const f=fixture();try{
  f.press('7');f.nav.children[0].click();
  assert.ok(f.dialog.querySelector('.calc-popup'));
  f.press('Escape');assert.equal(f.output.textContent,'7');
  assert.equal(f.dialog.querySelector('.calc-popup'),undefined);
  assert.equal(document.activeElement,f.nav.children[0]);
 }finally{f.restore();}
});
test('menu keyboard navigation skips unavailable modes and switches menu directly',()=>{
 const f=fixture();try{
  f.nav.children[0].click();f.press('ArrowDown');f.press('ArrowDown');f.press('ArrowDown');
  assert.equal(document.activeElement.children[1].textContent,'Statistik');
  f.press('ArrowDown');assert.equal(document.activeElement.children[1].textContent,'Verlauf');
  f.press('ArrowRight');assert.equal(f.nav.children[1].attributes['aria-expanded'],'true');
  assert.equal(f.nav.children[0].attributes['aria-expanded'],'false');
  f.press('Escape');f.press('2',{altKey:true});assert.equal(f.dialog.dataset.mode,'scientific');
  f.press('1',{altKey:true});assert.deepEqual(f.sizes.at(-1),[228,322]);
 }finally{f.restore();}
});

test('scientific controls keep their operations after moving into the native grid',()=>{
 const f=fixture();try{
  f.press('2',{altKey:true});assert.deepEqual(f.sizes.at(-1),[422,322]);
  f.press('9');f.press('0');
  const all=e=>[e,...e.children.flatMap(all)];
  all(f.dialog).find(e=>e.tag==='button'&&e.textContent==='sin').click();
  assert.equal(f.output.textContent,'1');
  f.press('h',{ctrlKey:true});assert.deepEqual(f.sizes.at(-1),[422,428]);
 }finally{f.restore();}
});
test('programmer view labels both full 32-bit rows correctly',()=>{
 const f=fixture();try{
  f.press('3',{altKey:true});assert.deepEqual(f.sizes.at(-1),[422,388]);
  const bits=f.dialog.querySelector('.calc-bits');
  assert.deepEqual(bits.children.filter(e=>e.tag==='small').map(e=>e.textContent),['63','47','32','31','15','0']);
  assert.equal(bits.children.filter(e=>e.tag==='span').map(e=>e.textContent).join('').length,64);
  f.press('h',{ctrlKey:true});assert.deepEqual(f.sizes.at(-1),[422,494]);
 }finally{f.restore();}
});

test('calculator workspace keeps grouping and visible history alongside observed values',async()=>{
 const first=fixture();let saved;try{for(const n of '12345')first.press(n);first.nav.children[0].click();const grouping=first.dialog.querySelector('.calc-popup').children.find(e=>e.children?.[1]?.textContent==='Zifferngruppierung');grouping.click();first.press('h',{ctrlKey:true});saved=await first.dialog.workspaceState();assert.equal(saved.groupDigits,true);assert.equal(saved.showHistory,true);}finally{first.restore();}
 const resumed=fixture(saved);try{assert.equal(resumed.output.textContent,'12.345');assert.deepEqual(resumed.sizes.at(-1),[228,428]);assert.equal((await resumed.dialog.workspaceState()).showHistory,true);}finally{resumed.restore();}
});

test('statistics UI adds observations, calculates results, deletes selected data and resumes',async()=>{
 const f=fixture();let saved;try{f.press('4',{altKey:true});assert.equal(f.dialog.dataset.mode,'statistics');assert.deepEqual(f.sizes.at(-1),[228,422]);const all=e=>[e,...e.children.flatMap(all)],key=operation=>all(f.dialog).find(e=>e.dataset?.key===operation);for(const n of ['4','8']){f.press(n);key('stat:add').click();}assert.equal(f.dialog.querySelector('.calc-stat-count').textContent,'Anzahl = 2');key('stat:mean').click();assert.equal(f.output.textContent,'6');key('stat:meanSquares').click();assert.equal(f.output.textContent,'40');saved=await f.dialog.workspaceState();const list=f.dialog.querySelector('.calc-stat-list');list.children[0].click();f.dialog.querySelector('.calc-stat-list').events.keydown({key:'Delete',preventDefault(){},stopPropagation(){}});assert.equal(f.dialog.querySelector('.calc-stat-count').textContent,'Anzahl = 1');key('stat:clear').click();assert.equal(f.dialog.querySelector('.calc-stat-count').textContent,'Anzahl = 0');key('stat:mean').click();assert.match(f.output.textContent,/Keine Daten/);}finally{f.restore();}
 const restored=fixture(saved);try{assert.equal(restored.dialog.querySelector('.calc-stat-count').textContent,'Anzahl = 2');assert.equal(restored.output.textContent,'40');assert.deepEqual(restored.sizes.at(-1),[228,422]);}finally{restored.restore();}
});

test('statistics keyboard navigation keeps the list focused and Enter still opens the menu',()=>{
 const f=fixture();try{f.press('4',{altKey:true});for(const n of ['4','8']){f.press(n);f.press('Enter');}let list=f.dialog.querySelector('.calc-stat-list');const key=value=>f.dialog.querySelector('.calc-stat-list').events.keydown({key:value,preventDefault(){},stopPropagation(){}});key('Home');assert.equal(f.output.textContent,'4');assert.equal(document.activeElement,f.dialog.querySelector('.calc-stat-list').children[0]);key('ArrowDown');assert.equal(f.output.textContent,'8');key('Delete');assert.equal(f.dialog.querySelector('.calc-stat-count').textContent,'Anzahl = 1');assert.equal(document.activeElement,f.dialog.querySelector('.calc-stat-list').children[0]);f.nav.children[0].focus();f.press('Enter');assert.ok(f.dialog.querySelector('.calc-popup'));f.press('Escape');assert.equal(document.activeElement,f.nav.children[0]);}finally{f.restore();}
});

test('view shortcuts restore input focus after removing the previously focused keypad',()=>{
 const f=fixture();try{const button=f.dialog.querySelectorAll('[data-digit]')[0];button.focus();f.press('2',{altKey:true});assert.equal(document.activeElement,f.output);f.press('9');f.press('0');assert.equal(f.output.textContent,'90');const next=f.dialog.querySelectorAll('[data-digit]')[0];next.focus();f.press('h',{ctrlKey:true});assert.equal(document.activeElement,f.output);f.press('4',{altKey:true});assert.equal(document.activeElement,f.output);f.press('8');f.press('Enter');assert.equal(f.dialog.querySelector('.calc-stat-count').textContent,'Anzahl = 1');}finally{f.restore();}
});

test('inverse rebuild retains input focus and programmer radio rebuild retains the selected control',()=>{
 const f=fixture();try{f.press('2',{altKey:true});const all=e=>[e,...e.children.flatMap(all)];all(f.dialog).find(e=>e.tag==='button'&&e.textContent==='Inv').click();assert.equal(document.activeElement,f.output);f.press('5');assert.equal(f.output.textContent,'5');f.press('3',{altKey:true});const hex=all(f.dialog).find(e=>e.tag==='input'&&e.value==='16');hex.focus();hex.onchange();assert.equal(document.activeElement.value,'16');assert.notEqual(document.activeElement,hex);assert.equal(document.activeElement.checked,true);f.press('1',{altKey:true});assert.equal(f.dialog.dataset.mode,'standard');assert.equal(document.activeElement,f.output);}finally{f.restore();}
});
