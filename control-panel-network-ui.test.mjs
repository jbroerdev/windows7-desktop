import test from 'node:test';
import assert from 'node:assert/strict';
import {
  networkDataFromAdaptersSnapshot,
  renderControlPanelAdapterDetails,
  renderControlPanelAdapterStatus,
  renderControlPanelAdapters,
  renderControlPanelNetwork
} from './public/control-panel-network.js';

const now=Date.parse('2026-11-05T10:00:00Z');
const context={authenticated:true,role:'admin',shareEditing:false,readonly:false,now};
const sample=()=>({schemaVersion:1,scope:'host',generatedAt:new Date(now-1000).toISOString(),hostname:'fixture-host',revision:'a'.repeat(64),aliasRevision:3,internetConnectivity:'not-tested',
  capabilities:{readAdapters:true,diagnose:true,setDisplayName:true,configureIpv4:false,enable:false,disable:false,networkManagerCheckpoint:false},
  adapters:[{id:'2:020000000001',name:'eth0',displayName:'Büro-LAN',ifindex:2,mac:'02:00:00:00:00:01',kind:'ether',mtu:1500,adminUp:true,operState:'UP',
    addresses:[{family:'inet',local:'192.0.2.20',prefixLength:24,scope:'global'}],routes:[{family:'inet',destination:'default',gateway:'192.0.2.1',metric:100}],dnsServers:['192.0.2.53','2001:db8::53'],dnsSource:'resolvectl',configurationReason:'Hostfreigabe fehlt.',capabilities:{configureIpv4:false,enable:false,disable:false}}]});

class FakeClassList {
  constructor(node){this.node=node;this.values=new Set();}
  add(value){this.values.add(value);}
  toggle(value,force){if(force??!this.values.has(value))this.values.add(value);else this.values.delete(value);}
  contains(value){return this.values.has(value);}
}
class FakeNode {
  constructor(tag,text){this.tagName=tag.toUpperCase();this.children=[];this.attributes={};this.dataset={};this.listeners={};this.classList=new FakeClassList(this);this.value='';this.disabled=false;this.hidden=false;this.text='';this.type='';this.maxLength=0;if(text!==undefined)this.textContent=text;}
  set className(value){this.classList.values=new Set(String(value).split(/\s+/).filter(Boolean));}
  get className(){return [...this.classList.values].join(' ');}
  set textContent(value){this.text=String(value);this.children=[];}
  get textContent(){return this.text+this.children.map(child=>child.textContent).join('');}
  append(...nodes){this.children.push(...nodes);}
  prepend(...nodes){this.children.unshift(...nodes);}
  replaceChildren(...nodes){this.children=[...nodes];this.text='';}
  setAttribute(key,value){this.attributes[key]=String(value);}
  getAttribute(key){return this.attributes[key]??null;}
  addEventListener(name,callback){(this.listeners[name]??=[]).push(callback);}
  dispatch(name,event={}){event.preventDefault??=()=>{};for(const callback of this.listeners[name]??[])callback(event);}
  focus(){this.focused=true;}
  setCustomValidity(message){this.validationMessage=message;}
  reportValidity(){return !this.validationMessage;}
  queryAll(predicate){const result=[];const visit=node=>{if(predicate(node))result.push(node);for(const child of node.children)visit(child);};visit(this);return result;}
}
const document={createElement:(tag)=>new FakeNode(tag)};
const byText=(root,tag,label)=>root.queryAll(node=>node.tagName===tag&&node.textContent===label)[0];

test('versioned adapter DTO is fresh, personal-admin only and does not invent online state',()=>{
  const payload=sample(),before=structuredClone(payload),data=networkDataFromAdaptersSnapshot(payload,context);
  assert.equal(data.adapterListAvailable,true);assert.equal(data.adapters[0].adapterId,'2:020000000001');
  assert.equal(data.revision,'a'.repeat(64));assert.equal(data.internetConnectivity,'not-tested');
  assert.equal(data.adapters[0].capabilities.setDisplayName,true);assert.equal(data.adapters[0].routes[0].gateway,'192.0.2.1');
  assert.equal(data.adapters[0].configurationReason,'Hostfreigabe fehlt.');assert.equal(data.adapters[0].capabilities.configureIpv4,false);
  assert.equal(data.adapters[0].speed,undefined);assert.equal(data.adapters[0].received,undefined);assert.equal(data.adapters[0].sent,undefined);
  for(const key of ['internet','online','connected','wifiConnected'])assert.equal(Object.hasOwn(data,key),false);
  assert.deepEqual(payload,before);
  for(const patch of [{authenticated:false},{role:'user'},{role:'guest'},{shareEditing:true},{readonly:true}])assert.equal(networkDataFromAdaptersSnapshot(payload,{...context,...patch}).adapterListAvailable,false);
  assert.equal(networkDataFromAdaptersSnapshot({...payload,generatedAt:new Date(now-16000).toISOString()},context).adapterListAvailable,false);
  const detail=networkDataFromAdaptersSnapshot({...payload,adapters:undefined,adapter:payload.adapters[0]},context);
  assert.equal(detail.adapter.adapterId,'2:020000000001');assert.equal(detail.adapter.addresses[0].family,'IPv4');
});

test('network center keeps native tasks visible and calls only enabled host actions',()=>{
  const actions=[],routes=[];const data=networkDataFromAdaptersSnapshot(sample(),context);
  const root=renderControlPanelNetwork({document,data,availableTargets:new Set(['adapter-settings','network-troubleshoot']),onNavigate:(...args)=>routes.push(args),onAction:action=>actions.push(action)});
  assert.ok(byText(root,'H2','Zeigen Sie die grundlegenden Informationen zum Netzwerk an, und richten Sie Verbindungen ein.'));
  byText(root,'BUTTON','Probleme beheben').dispatch('click');
  const form=root.queryAll(node=>node.tagName==='FORM')[0];assert.ok(form);
  const input=root.queryAll(node=>node.tagName==='INPUT')[0];input.value='example.test';
  form.dispatch('submit');assert.deepEqual(actions,[{action:'diagnose',kind:'ping',target:'example.test'}]);
  byText(root,'BUTTON','Adaptereinstellungen ändern').dispatch('click');assert.deepEqual(routes,[['adapter-settings']]);
  const unavailable=renderControlPanelNetwork({document,data:{},availableTargets:{},onNavigate:()=>assert.fail('unavailable action fired')});
  assert.equal(byText(unavailable,'SPAN','Verbindung herstellen oder trennen').getAttribute('aria-disabled'),'true');
});

test('adapter list uses native toolbar order, selection and status/details routes',()=>{
  const routes=[],data=networkDataFromAdaptersSnapshot(sample(),context),targets=new Set(['adapter-details','adapter-address-details']);
  const root=renderControlPanelAdapters({document,data,availableTargets:targets,onNavigate:(...args)=>routes.push(args)});
  const tile=root.queryAll(node=>node.dataset.adapterId==='2:020000000001')[0];assert.ok(tile);tile.dispatch('click');
  byText(root,'BUTTON','Verbindung untersuchen').dispatch('click');byText(root,'BUTTON','Verbindung umbenennen').dispatch('click');
  assert.deepEqual(routes,[['adapter-details',{adapterId:'2:020000000001'}],['adapter-address-details',{adapterId:'2:020000000001'}]]);
  assert.equal(byText(root,'BUTTON','Netzwerkgerät deaktivieren').disabled,true);
  assert.equal(tile.queryAll(node=>node.tagName==='IMG'&&node.src==='/icons/network-16.png').length,1);
});

test('adapter status tabs show host facts and alias action is scoped to a web label',()=>{
  const actions=[],routes=[],data=networkDataFromAdaptersSnapshot(sample(),context);data.adapter=data.adapters[0];
  const targets=new Set(['adapter-address-details','network-troubleshoot']),root=renderControlPanelAdapterStatus({document,data,availableTargets:targets,onAction:action=>actions.push(action),onNavigate:(...args)=>routes.push(args)});
  const tabs=root.queryAll(node=>node.getAttribute('role')==='tab');assert.equal(tabs.length,1);assert.equal(tabs[0].textContent,'Allgemein');
  const panel=root.queryAll(node=>node.getAttribute('role')==='tabpanel')[0];assert.ok(panel);assert.equal(panel.queryAll(node=>node.classList.contains('cp-network-status-actions')).length,1);
  assert.equal(root.queryAll(node=>node.tagName==='IMG'&&node.src==='/icons/network-adapter-connected-48.png').length,1);
  byText(root,'BUTTON','Details …').dispatch('click');assert.deepEqual(routes,[['adapter-address-details',{adapterId:'2:020000000001'}]]);
  assert.match(root.textContent,/Aktivität/);assert.match(root.textContent,/Nicht verfügbar/);
  byText(root,'BUTTON','Diagnose').dispatch('click');const diagForm=root.queryAll(node=>node.tagName==='FORM')[0],diagInput=root.queryAll(node=>node.tagName==='INPUT')[0];diagInput.value='example.test';diagForm.dispatch('submit');
  assert.deepEqual(actions,[{action:'diagnose',kind:'ping',target:'example.test'}]);
  const resultData={...data,diagnostic:{kind:'ping',output:'fixture <safe text>',exitCode:1,internetConnectivity:'not-tested'}};
  const resultRoot=renderControlPanelAdapterStatus({document,data:resultData,availableTargets:targets,onAction:()=>{},onNavigate:()=>{}});
  assert.ok(resultRoot.textContent.includes('fixture <safe text>'));assert.ok(resultRoot.queryAll(node=>node.tagName==='PRE').length===1);
});

test('separate details view preserves null values and stores only a web alias',()=>{
  const actions=[],data=networkDataFromAdaptersSnapshot(sample(),context);data.adapter={...data.adapters[0],addresses:null,routes:null,dnsServers:null,dnsSource:null};
  const root=renderControlPanelAdapterDetails({document,data,onAction:action=>actions.push(action)});
  assert.match(root.textContent,/EigenschaftWert/);assert.match(root.textContent,/DHCP aktiviertNicht verfügbar/);assert.match(root.textContent,/IPv4-DNS-ServerNicht verfügbar/);
  const form=root.queryAll(node=>node.tagName==='FORM')[0],input=root.queryAll(node=>node.tagName==='INPUT')[0];input.value='Werkstatt';form.dispatch('submit');
  assert.deepEqual(actions,[{action:'label',adapterId:'2:020000000001',displayName:'Werkstatt',expectedRevision:3}]);
  assert.match(root.textContent,/Web-Anzeigename ändern/);
});

test('details keep the native table in its own scroll viewport and preserve long values',()=>{
  const data=networkDataFromAdaptersSnapshot(sample(),context);data.adapter=data.adapters[0];
  const root=renderControlPanelAdapterDetails({document,data}),rows=root.queryAll(node=>node.tagName==='TR'),valueFor=label=>rows.find(row=>row.children[0]?.textContent===label)?.children[1]?.textContent,viewport=root.queryAll(node=>node.classList.contains('cp-network-details-viewport'))[0];
  assert.equal(viewport.getAttribute('role'),'region');assert.equal(viewport.getAttribute('tabindex'),'0');assert.equal(viewport.children[0].classList.contains('cp-network-details-table'),true);
  assert.equal(valueFor('IPv4-DNS-Server'),'192.0.2.53');assert.equal(valueFor('IPv6-DNS-Server'),'2001:db8::53');
  const longData=networkDataFromAdaptersSnapshot({...sample(),adapters:[{...sample().adapters[0],addresses:[{family:'inet6',local:'2001:db8:ffff:ffff:1234:5678:9abc:def0',prefixLength:128,scope:'global'}],dnsServers:['2001:db8:ffff:ffff:ffff:ffff:ffff:ffff']}]},context);longData.adapter=longData.adapters[0];
  const longRoot=renderControlPanelAdapterDetails({document,data:longData});assert.ok(longRoot.textContent.includes('2001:db8:ffff:ffff:1234:5678:9abc:def0/128'));assert.ok(longRoot.textContent.includes('2001:db8:ffff:ffff:ffff:ffff:ffff:ffff'));
});
