import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

// Exercise the actual navigation renderer with an IMAP reply held in flight.
// The DOM double records identity and commits, rather than comparing snapshots.
class Node{
 constructor(tag,text='',cls=''){this.tag=tag;this.text=text;this.cls=cls;this.children=[];this.scrollTop=0;this.commits=0;this.classList={toggle:(name,value)=>{if(value)this.cls+=' '+name;}};}
 append(...nodes){this.children.push(...nodes);}
 replaceChildren(...nodes){this.commits++;this.children=nodes.flatMap(n=>n.tag==='fragment'?n.children:[n]);}
 get childNodes(){return this.children;}
 get outerHTML(){return JSON.stringify([this.tag,this.text,this.cls,this.src,this.disabled,this.title,this.children.map(n=>n.outerHTML)]);}
}
test('mail navigation remains mounted during slow refreshes, preserves scroll and skips unchanged or obsolete results',async()=>{
 const code=await readFile(new URL('./public/live-mail.js',import.meta.url),'utf8'),start=code.indexOf('async function renderFolders()'),end=code.indexOf('async function loadMessages(',start);assert.ok(start>=0&&end>start);
 const account={id:'a',email:'test@example.org',name:'Test'},nav=new Node('nav'),old=new Node('old');nav.append(old);nav.scrollTop=54;let release;const gate=new Promise(r=>release=r);
 const env={nav,account,folder:'INBOX',unread:false,navSignature:'',state:{accounts:[account],drafts:[]},api:()=>gate,document:{createDocumentFragment:()=>new Node('fragment')},el:(...args)=>new Node(...args),button:(parent,label)=>{const b=new Node('button',label);parent.append(b);return b;},action:fn=>fn,labels:{},openCalendar(){},closeCalendar(){},mailNavigation:()=>new Node('footer')};
 const render=Function('env','with(env){return ('+code.slice(start,end).trim()+');}')(env),pending=render();assert.equal(nav.children[0],old);assert.equal(nav.commits,0,'slow IMAP must not blank the existing navigation');release([{path:'INBOX',name:'Inbox'}]);await pending;assert.equal(nav.commits,1);assert.equal(nav.scrollTop,54);const first=nav.children[0];
 env.api=async()=>[{path:'INBOX',name:'Inbox'}];await render();assert.equal(nav.commits,1,'unchanged polling must not replace DOM or reload icons');assert.equal(nav.children[0],first);
 let finish;env.api=()=>new Promise(r=>finish=r);const obsolete=render();env.folder='Trash';finish([{path:'INBOX',name:'Inbox'}]);await obsolete;assert.equal(nav.commits,1,'an older folder response must not overwrite a newer selection');
});

test('mail and calendar share identical original navigation icons and only the selected module differs',async()=>{
 const code=await readFile(new URL('./public/live-calendar.js',import.meta.url),'utf8'),start=code.indexOf('export function mailNavigation('),end=code.indexOf('export function createLiveCalendar(',start);
 const build=Function('el',code.slice(start,end).replace(/^export /,'')+';return mailNavigation;')((...args)=>new Node(...args)),mail=build({selected:'E-Mail'}),calendar=build({selected:'Kalender'});
 assert.equal(mail.children.length,5);assert.equal(calendar.children.length,5);const icons=footer=>footer.children.map(b=>b.children[0].src);assert.deepEqual(icons(mail),icons(calendar));assert.deepEqual(icons(mail),['/icons/live-mail.png','/icons/win7-settings/date-time.png','/icons/filetypes/users.ico','/icons/live-mail/nav-feeds.png','/icons/filetypes/network.ico']);assert.equal(mail.children[0].cls,'selected');assert.equal(calendar.children[1].cls,'selected');assert.ok(calendar.children.slice(2).every(b=>b.disabled));
});

test('Delete moves selected mail through the existing trash action and leaves editing, dialogs and modified shortcuts alone',async()=>{
 const code=await readFile(new URL('./public/live-mail.js',import.meta.url),'utf8'),start=code.indexOf('function mailKeydown('),end=code.indexOf('async function remove(',start);let removed=0;
 const env={selected:42,account:{id:'mail'},removing:false,client:{dataset:{}},folder:'INBOX',action:fn=>fn,remove:()=>removed++},keydown=Function('env','with(env){return ('+code.slice(start,end).trim()+');}')(env);
 const event=extra=>({key:'Delete',target:{closest:()=>false},preventDefault(){this.prevented=true;},stopPropagation(){this.stopped=true;},...extra});
 const normal=event();keydown(normal);assert.equal(removed,1);assert.equal(normal.prevented,true);assert.equal(normal.stopped,true);
 for(const extra of [{repeat:true},{ctrlKey:true},{metaKey:true},{altKey:true},{shiftKey:true},{isComposing:true},{defaultPrevented:true},{key:'Backspace'},{target:{closest:()=>true}}])keydown(event(extra));assert.equal(removed,1);
 env.removing=true;keydown(event());env.removing=false;env.client.dataset.module='calendar';keydown(event());delete env.client.dataset.module;env.selected=null;keydown(event());assert.equal(removed,1);
});
