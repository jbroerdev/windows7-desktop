// Presentation only. The Control Panel host owns data access, authorization and routing.
export const controlPanelNetworkNavigation = Object.freeze([
  {target:'home', label:'Startseite der Systemsteuerung'},
  {target:'adapter-settings', label:'Adaptereinstellungen ändern'},
  {target:'advanced-sharing', label:'Erweiterte Freigabeeinstellungen ändern'},
  {target:'homegroup', label:'Heimnetzgruppe', related:true},
  {target:'internet-options', label:'Internetoptionen', related:true},
  {target:'firewall', label:'Windows-Firewall', related:true}
].map(item=>Object.freeze(item)));

const tasks = [
  ['setup-network','Neue Verbindung oder neues Netzwerk einrichten','Richtet eine Drahtlos-, Breitband-, Einwähl-, Ad-hoc- oder VPN-Verbindung bzw. einen Router oder Zugriffspunkt ein.'],
  ['connect-network','Verbindung mit einem Netzwerk herstellen','Stellt (erneut) eine Verbindung mit einem Drahtlosnetzwerk, verkabelten Netzwerk, Einwählnetzwerk oder VPN-Netzwerk her.'],
  ['homegroup','Heimnetzgruppen- und Freigabeoptionen auswählen','Ermöglicht Zugriff auf Dateien und Drucker auf anderen Netzwerkcomputern zu, oder ändert die Freigabeeinstellungen.'],
  ['network-troubleshoot','Probleme beheben','Diagnostiziert und behebt Netzwerkprobleme, oder ruft Problembehandlungsinformationen ab.']
];
const owns=(object,key)=>object!=null&&Object.prototype.hasOwnProperty.call(object,key);
const available=(targets,key)=>targets instanceof Set?targets.has(key):owns(targets,key)&&targets[key]===true;
const finite=value=>typeof value==='number'&&Number.isFinite(value)&&value>=0;
const bytes=value=>finite(value)?new Intl.NumberFormat('de-DE').format(value)+' Byte':'Nicht verfügbar';

/** Convert only the existing /api/task-manager host payload. No online/network inference. */
function getControlPanelNetworkData(snapshot,{now=Date.now(),shareEnabled}={}){
  const age=now-Date.parse(snapshot?.generatedAt);
  const fresh=snapshot?.scope==='host'&&Number.isFinite(age)&&age>=-5000&&age<=15000;
  const adapters=fresh&&Array.isArray(snapshot.interfaces)?snapshot.interfaces.filter(item=>typeof item?.name==='string'&&item.name.trim()).slice(0,256).map(item=>({
    name:item.name,received:finite(item.received)?item.received:null,sent:finite(item.sent)?item.sent:null,
    speed:finite(item.speed)&&item.speed>0?item.speed:null
  })):[];
  return {hostAvailable:fresh,hostname:fresh&&typeof snapshot.host?.hostname==='string'?snapshot.host.hostname:null,
    generatedAt:fresh?snapshot.generatedAt:null,adapters,
    shareEnabled:typeof shareEnabled==='boolean'?shareEnabled:null};
}

/** Match existing read-only task-manager access in personal user/admin contexts. */
export function networkDataFromTaskManager(snapshot,{authenticated=false,role,shareEditing=false,readonly=false,now=Date.now()}={}){
  if(authenticated!==true||!['admin','user'].includes(role)||shareEditing!==false||readonly!==false)return getControlPanelNetworkData(null,{now});
  return getControlPanelNetworkData(snapshot,{now});
}

const safeText=(value,max=200)=>typeof value==='string'&&value.trim()?value.trim().slice(0,max):null;
const validFamily=value=>value==='IPv4'||value==='IPv6';
const isIPv4Address=value=>typeof value==='string'&&value.split('.').length===4&&value.split('.').every(part=>/^\d{1,3}$/.test(part)&&Number(part)<=255);
const networkCapabilityKeys=['readAdapters','diagnose','setDisplayName','configureIpv4','enable','disable','networkManagerCheckpoint'];
const normalizeCapabilities=value=>Object.fromEntries(networkCapabilityKeys.map(key=>[key,value?.[key]===true]));
function normalizeNetworkAdapter(item,globalCapabilities){
  const ifIndex=Number.isInteger(item?.ifindex)&&item.ifindex>=0?item.ifindex:null,name=safeText(item?.name,160),mac=safeText(item?.mac,80);
  if(ifIndex===null||!name)return null;
  const adapterId=safeText(item.id,240)||String(ifIndex)+':'+(mac?mac.replaceAll(':',''):'no-mac');
  const addresses=Array.isArray(item.addresses)?item.addresses.slice(0,64).flatMap(address=>{
    const family=address?.family==='inet'?'IPv4':address?.family==='inet6'?'IPv6':validFamily(address?.family)?address.family:null,local=safeText(address?.local,128),prefixLength=Number.isInteger(address?.prefixLength)&&address.prefixLength>=0&&address.prefixLength<=(family==='IPv4'?32:128)?address.prefixLength:null;
    return family&&local? [{family,local,prefixLength,scope:safeText(address?.scope,40)}]:[];
  }):null;
  const routes=Array.isArray(item.routes)?item.routes.slice(0,64).flatMap(route=>{
    const family=route?.family==='inet'?'IPv4':route?.family==='inet6'?'IPv6':validFamily(route?.family)?route.family:null,gateway=safeText(route?.gateway,128),destination=safeText(route?.destination,160),metric=Number.isInteger(route?.metric)&&route.metric>=0?route.metric:null;
    return family?[{family,gateway,destination,metric}]:[];
  }):null;
  const operState=['up','down','dormant','lowerlayerdown','notpresent','unknown'].includes(String(item.operState||'').toLowerCase())?String(item.operState).toLowerCase():'unknown';
  const capabilities={...globalCapabilities,...Object.fromEntries(networkCapabilityKeys.filter(key=>owns(item.capabilities,key)).map(key=>[key,item.capabilities[key]===true]))};
  return {adapterId,ifIndex,name,displayName:safeText(item.displayName,160),mac,kind:safeText(item.kind,80),mtu:Number.isInteger(item.mtu)&&item.mtu>0&&item.mtu<=65535?item.mtu:null,
    adminUp:typeof item.adminUp==='boolean'?item.adminUp:null,operState,addresses,routes,dnsServers:Array.isArray(item.dnsServers)?item.dnsServers.slice(0,32).map(value=>safeText(value,128)).filter(Boolean):null,
    dnsSource:safeText(item.dnsSource,80),configurationReason:safeText(item.configurationReason,240),capabilities};
}

/** Normalize the versioned host-adapter contract without claiming Internet reachability. */
export function networkDataFromAdaptersSnapshot(snapshot,{authenticated=false,role,shareEditing=false,readonly=false,now=Date.now()}={}){
  const denied={adapterListAvailable:false,generatedAt:null,hostname:null,revision:null,aliasRevision:null,adapters:[],capabilities:normalizeCapabilities(null)};
  if(authenticated!==true||role!=='admin'||shareEditing!==false||readonly!==false)return denied;
  const age=now-Date.parse(snapshot?.generatedAt),fresh=snapshot?.schemaVersion===1&&snapshot?.scope==='host'&&Number.isFinite(age)&&age>=-5000&&age<=15000;
  if(!fresh)return denied;
  const capabilities=normalizeCapabilities(snapshot.capabilities);
  const adapters=Array.isArray(snapshot.adapters)?snapshot.adapters.slice(0,128).map(item=>normalizeNetworkAdapter(item,capabilities)).filter(Boolean):[];
  const adapter=snapshot.adapter?normalizeNetworkAdapter(snapshot.adapter,capabilities):null;
  return {adapterListAvailable:capabilities.readAdapters===true,generatedAt:snapshot.generatedAt,hostname:safeText(snapshot.hostname,160),revision:typeof snapshot.revision==='string'&&/^[a-f0-9]{64}$/.test(snapshot.revision)?snapshot.revision:null,aliasRevision:Number.isInteger(snapshot.aliasRevision)&&snapshot.aliasRevision>=0?snapshot.aliasRevision:null,internetConnectivity:snapshot.internetConnectivity==='not-tested'?'not-tested':null,adapters,adapter,capabilities};
}

/**
 * Returns a DOM section; no fetch, timers, dialogs, writes or global desktop access.
 * data = normalized network-adapter V1 DTO or the separate task-manager fallback.
 * availableTargets = Set<string> or own boolean properties. Rechecked on activation.
 * The host callback must recheck its current profile/permissions before navigation.
 * Own sidebar included; host hides its sidebar and removes its content padding.
 */
function targetAvailable(targets,key){return available(targets,key);}
function sectionElement(doc,tag,text,className){const node=doc.createElement(tag);if(text!==undefined)node.textContent=text;if(className)node.className=className;return node;}
function appendField(doc,parent,label,value){parent.append(sectionElement(doc,'dt',label),sectionElement(doc,'dd',value??'Nicht verfügbar'));}
function isSafeDiagnosticTarget(value){return typeof value==='string'&&value.trim().length>0&&value.trim().length<=253&&/^[a-zA-Z0-9][a-zA-Z0-9.:%_-]*$/.test(value.trim());}

export function renderControlPanelNetwork({document:doc=globalThis.document,data={},availableTargets={},onNavigate,onAction,busy=false,error=null,includeNavigation=true,now=Date.now()}={}){
  const el=(tag,text,className)=>sectionElement(doc,tag,text,className);
  const root=el('section',undefined,'cp-network-page');root.setAttribute('aria-label','Netzwerk- und Freigabecenter');root.setAttribute('aria-busy',String(!!busy));
  const diagnosticsReady=data?.capabilities?.diagnose===true&&targetAvailable(availableTargets,'network-troubleshoot')&&typeof onAction==='function';
  const link=(target,label,{internal=false,enabledOverride=false}={})=>{
    let enabled=enabledOverride;
    if(!enabled){
      if(internal==='adapter-settings')enabled=data?.capabilities?.readAdapters===true&&typeof onNavigate==='function';
      else if(internal==='network-troubleshoot')enabled=diagnosticsReady;
      else enabled=typeof onNavigate==='function'&&targetAvailable(availableTargets,target);
    }
    const node=el(enabled?'button':'span',label,'cp-network-link');node.dataset.networkTarget=target;
    if(enabled){node.type='button';node.addEventListener('click',()=>{if(internal==='network-troubleshoot'){diagnostic.hidden=!diagnostic.hidden;diagnosticTarget?.focus?.();return;}if(typeof onNavigate==='function'&&(internal==='adapter-settings'||targetAvailable(availableTargets,target)))onNavigate(target);});}
    else{node.classList.add('is-unavailable');node.setAttribute('aria-disabled','true');node.title=targetReason(data,target);}
    return node;
  };
  if(includeNavigation){
    const side=el('nav',undefined,'cp-network-sidebar');side.setAttribute('aria-label','Systemsteuerung');
    for(const item of controlPanelNetworkNavigation.filter(item=>!item.related))side.append(link(item.target,item.label,{internal:item.target==='adapter-settings'?'adapter-settings':false}));
    const related=el('div',undefined,'cp-network-related');related.append(el('p','Siehe auch'));
    for(const item of controlPanelNetworkNavigation.filter(item=>item.related))related.append(link(item.target,item.label));
    side.append(related);root.append(side);
  }
  const content=el('div',undefined,'cp-network-content');root.append(content);
  const home=el('div',undefined,'cp-network-home');content.append(home);
  home.append(el('h2','Zeigen Sie die grundlegenden Informationen zum Netzwerk an, und richten Sie Verbindungen ein.'));
  const map=el('div',undefined,'cp-network-map');
  map.append(el('p','Die Netzwerkübersicht des Webdesktops ist nicht mit einer Windows-Netzwerkübersicht gleichzusetzen.'),link('network-map','Gesamtübersicht anzeigen'));home.append(map);
  const heading=(text,target,label,internal)=>{const row=el('div',undefined,'cp-network-section-heading');row.append(el('h3',text));if(target)row.append(link(target,label,{internal}));home.append(row);};
  heading('Aktive Netzwerke anzeigen','connect-network','Verbindung herstellen oder trennen');
  const active=el('div',undefined,'cp-network-active');
  active.append(el('p','Für diesen Webdesktop liegen keine Informationen über aktive Windows-Netzwerke oder Internetzugriff vor.'));
  const status=el('dl');for(const [label,value]of [['Zugriffstyp:','Nicht ermittelt'],['Verbindungen:','Nicht ermittelt']])status.append(el('dt',label),el('dd',value));active.append(status);home.append(active);
  heading('Netzwerkeinstellungen ändern');
  const list=el('ul',undefined,'cp-network-tasks');
  for(const [target,label,description]of tasks){const row=el('li');row.append(link(target,label,{internal:target==='network-troubleshoot'?'network-troubleshoot':false}),el('p',description));list.append(row);}home.append(list);
  const diagnostic=el('section',undefined,'cp-network-diagnostic');diagnostic.hidden=true;diagnostic.setAttribute('aria-label','Netzwerkdiagnose');
  diagnostic.append(el('h3','Netzwerkdiagnose'),el('p','Die Diagnose läuft auf dem Serverhost. Sie prüft keine Verbindung aus Windows und ändert keine Adaptereinstellungen.'));
  const diagnosticForm=el('form',undefined,'cp-network-diagnostic-form'),diagnosticKind=el('select'),diagnosticTarget=el('input'),diagnosticSubmit=el('button','Diagnose starten');
  for(const [value,label]of [['ping','Ping'],['dns','DNS-Auflösung']]){const option=el('option',label);option.value=value;diagnosticKind.append(option);}
  diagnosticKind.value='ping';
  diagnosticTarget.type='text';diagnosticTarget.maxLength=253;diagnosticTarget.autocomplete='off';diagnosticTarget.setAttribute('aria-label','Hostname oder IP-Adresse');diagnosticTarget.placeholder='Hostname oder IP-Adresse';diagnosticSubmit.type='submit';diagnosticSubmit.disabled=!!busy;
  diagnosticForm.append(diagnosticKind,diagnosticTarget,diagnosticSubmit);diagnosticForm.addEventListener('submit',event=>{event.preventDefault();const target=diagnosticTarget.value.trim();if(!isSafeDiagnosticTarget(target)){diagnosticTarget.setCustomValidity?.('Bitte einen gültigen Hostnamen oder eine IP-Adresse eingeben.');diagnosticTarget.reportValidity?.();return;}diagnosticTarget.setCustomValidity?.('');onAction?.({action:'diagnose',kind:diagnosticKind.value,target});});
  const result=data?.diagnostic;if(result&&typeof result.output==='string'){const resultBox=el('section',undefined,'cp-network-diagnostic-result');resultBox.setAttribute('aria-label','Diagnoseergebnis');resultBox.append(el('h4','Ergebnis: '+(result.kind==='dns'?'DNS-Auflösung':'Ping')),el('p','Hostdiagnose · '+(Number.isInteger(result.exitCode)?'Exitcode '+result.exitCode:'Exitcode nicht verfügbar')));const output=el('pre',result.output);resultBox.append(output);if(result.internetConnectivity==='not-tested')resultBox.append(el('p','Ein fehlgeschlagener Ping belegt keinen getrennten Internetzugriff.'));diagnostic.append(resultBox);}
  diagnostic.append(diagnosticForm);if(error)diagnostic.append(el('p',String(error),'cp-network-error'));home.append(diagnostic);
  const model=getControlPanelNetworkData({scope:data?.hostAvailable===true?'host':null,generatedAt:data?.generatedAt,host:{hostname:data?.hostname},interfaces:data?.adapters},{now,shareEnabled:data?.shareEnabled});
  const observation=el('details',undefined,'cp-network-observations');observation.append(el('summary','Verfügbare Informationen des Webdesktops'));
  observation.append(el('p','Host-Adapter und öffentlicher Desktop sind getrennte Webdesktopdaten und belegen weder Windows-Netzwerkverbindungen noch eine Heimnetzgruppe.'));
  if(model.hostAvailable){
    observation.append(el('p','Datenquelle: Host-Monitor'+(model.hostname?' · '+model.hostname:'')+' · '+new Date(model.generatedAt).toLocaleString('de-DE')));
    if(model.adapters.length){
      const wrap=el('div',undefined,'cp-network-table-wrap'),table=el('table'),head=el('thead'),tr=el('tr');
      for(const title of ['Host-Adapter','Empfangen (gesamt)','Gesendet (gesamt)','Linkgeschwindigkeit']){const th=el('th',title);th.scope='col';tr.append(th);}head.append(tr);table.append(head);
      const body=el('tbody');for(const adapter of model.adapters){const row=el('tr');const th=el('th',adapter.name);th.scope='row';row.append(th,el('td',bytes(adapter.received)),el('td',bytes(adapter.sent)),el('td',adapter.speed===null?'Nicht verfügbar':new Intl.NumberFormat('de-DE',{maximumFractionDigits:2}).format(adapter.speed/1000000)+' MBit/s'));body.append(row);}table.append(body);wrap.append(table);observation.append(wrap);
    }else observation.append(el('p','Der Host-Monitor meldet keine Adapter. Dies belegt keinen getrennten Netzwerkzustand.'));
  }else observation.append(el('p','Aktuelle Host-Adapterdaten sind nicht verfügbar.'));
  observation.append(el('p','Öffentlicher Desktop: '+(model.shareEnabled===null?'Nicht ermittelt':model.shareEnabled?'Freigabe aktiviert':'Freigabe deaktiviert')));
  const actions=el('div',undefined,'cp-network-web-actions');actions.append(link('share','Öffentlichen Desktop verwalten'),link('explorer-network','Netzwerk im Explorer öffnen'),link('task-manager','Hostinformationen im Task-Manager anzeigen'));observation.append(actions);home.append(observation);
  home.append(el('p','Grau dargestellte Aufgaben sind in dieser Webumgebung noch nicht verfügbar.','cp-network-limit'));
  return root;
}

function renderControlPanelAdaptersLegacy({document:doc=globalThis.document,data={},availableTargets={},onNavigate,busy=false,error=null}={}){
  const el=(tag,text,className)=>sectionElement(doc,tag,text,className),root=el('section',undefined,'cp-network-adapters');root.setAttribute('aria-label','Netzwerkverbindungen');root.setAttribute('aria-busy',String(!!busy));
  const toolbar=el('div',undefined,'cp-network-adapter-toolbar'),back=el('button','Startseite der Systemsteuerung'),organize=el('button','Organisieren'),properties=el('button','Eigenschaften'),disable=el('button','Deaktivieren');
  back.type=organize.type=properties.type=disable.type='button';back.addEventListener('click',()=>{if(targetAvailable(availableTargets,'home'))onNavigate?.('home');});organize.disabled=true;organize.title='Keine weiteren Organisationsoptionen verfügbar.';properties.disabled=true;properties.title='Wählen Sie einen Adapter aus.';disable.disabled=true;disable.title=data?.adapter?.configurationReason||'Änderungen am Hostadapter sind nicht freigegeben.';toolbar.append(back,organize,properties,disable);root.append(toolbar);
  root.append(el('h2','Netzwerkverbindungen'));
  if(data?.generatedAt)root.append(el('p','Hostdaten · '+(data.hostname||'Name nicht verfügbar')+' · '+new Date(data.generatedAt).toLocaleString('de-DE'),'cp-network-source'));
  if(!data?.adapterListAvailable){root.append(el('p',data?.error||'Aktuelle Host-Adapterdaten sind nicht verfügbar.','cp-network-unavailable'));if(error)root.append(el('p',String(error),'cp-network-error'));return root;}
  const list=el('div',undefined,'cp-network-adapter-list');list.setAttribute('role','listbox');list.setAttribute('aria-label','Hostadapter');let selected=null;const rows=[];
  const detailsAvailable=adapter=>Boolean(adapter&&typeof adapter.adapterId==='string'&&data?.capabilities?.readAdapters===true);
  const openDetails=adapter=>{if(!detailsAvailable(adapter)||!targetAvailable(availableTargets,'adapter-details'))return;onNavigate?.('adapter-details',{adapterId:adapter.adapterId});};
  for(const adapter of data.adapters||[]){const tile=el('button',undefined,'cp-network-adapter-tile');tile.type='button';tile.setAttribute('role','option');tile.setAttribute('aria-selected','false');tile.setAttribute('data-state',adapter.operState);tile.dataset.adapterId=adapter.adapterId;tile.title='Schnittstellenindex '+adapter.ifIndex+(adapter.mac?' · '+adapter.mac:'');
    const icon=el('span',undefined,'cp-network-adapter-icon');icon.setAttribute('aria-hidden','true');const text=el('span',undefined,'cp-network-adapter-text');
    const state=adapter.operState==='up'?'Host · Aktiv':adapter.operState==='down'?'Host · Getrennt':adapter.adminUp===false?'Host · Deaktiviert':'Host · Status nicht verfügbar';
    const type=adapter.kind==='ether'?'Ethernet':adapter.kind==='wlan'?'WLAN':adapter.kind||'Adaptertyp nicht verfügbar';
    text.append(el('strong',adapter.displayName||adapter.name),el('span',state),el('span',type));tile.append(icon,text);
    tile.addEventListener('click',()=>{selected=adapter;for(const row of rows){const active=row===tile;row.setAttribute('aria-selected',String(active));row.classList.toggle('selected',active);}properties.disabled=!detailsAvailable(adapter)||!targetAvailable(availableTargets,'adapter-details');properties.title=properties.disabled?'Adapterdetails sind nicht verfügbar.':'';});
    tile.addEventListener('dblclick',()=>openDetails(adapter));rows.push(tile);list.append(tile);
  }
  if(!rows.length)list.append(el('p','Der Host-Agent hat keine Adapter gemeldet.'));
  properties.addEventListener('click',()=>{if(selected)openDetails(selected);});root.append(list);
  const foot=el('p','Diese Einträge sind Host-Adapter. Sie zeigen keine Windows-Verbindung und keinen Internetstatus.','cp-network-limit');root.append(foot);
  if(error)root.append(el('p',String(error),'cp-network-error'));
  return root;
}

function renderControlPanelAdapterStatusLegacy({document:doc=globalThis.document,data={},availableTargets={},onAction,busy=false,error=null}={}){
  const el=(tag,text,className)=>sectionElement(doc,tag,text,className),root=el('section',undefined,'cp-network-adapter-status');root.setAttribute('aria-label','Adapterstatus');root.setAttribute('aria-busy',String(!!busy));
  const adapter=data?.adapter;
  if(!adapter||typeof adapter.adapterId!=='string'){root.append(el('p','Adapterdetails sind nicht verfügbar.','cp-network-unavailable'));return root;}
  root.append(el('h2','Status von '+(adapter.displayName||adapter.name||'Hostadapter')));
  const tabs=el('div',undefined,'cp-network-status-tabs');tabs.setAttribute('role','tablist');const panel=el('div',undefined,'cp-network-status-panel');panel.setAttribute('role','tabpanel');
  const tabNames=['Allgemein','Details','Aktivität'];let activeTab='Allgemein';
  const renderTab=()=>{panel.replaceChildren();const values=el('dl',undefined,'cp-network-status-values');
    if(activeTab==='Allgemein'){
      appendField(doc,values,'Netzwerkname:',adapter.displayName||adapter.name);appendField(doc,values,'Hostschnittstelle:',adapter.name);appendField(doc,values,'Adaptertyp:',adapter.kind==='ether'?'Ethernet':adapter.kind==='wlan'?'WLAN':adapter.kind);appendField(doc,values,'Verwaltungsstatus:',adapter.adminUp===true?'Aktiviert':adapter.adminUp===false?'Deaktiviert':'Nicht verfügbar');appendField(doc,values,'Linkstatus:',adapter.operState==='up'?'Aktiv':adapter.operState==='down'?'Getrennt':'Nicht verfügbar');appendField(doc,values,'MAC-Adresse:',adapter.mac);appendField(doc,values,'MTU:',Number.isInteger(adapter.mtu)?String(adapter.mtu):null);
      const addresses=Array.isArray(adapter.addresses)?adapter.addresses.map(item=>item.family+' · '+item.local+(Number.isInteger(item.prefixLength)?'/'+item.prefixLength:'')).join('\n'):'';appendField(doc,values,'Adressen:',addresses||null);
    }else if(activeTab==='Details'){
      appendField(doc,values,'Schnittstellenindex:',String(adapter.ifIndex));appendField(doc,values,'MAC-Adresse:',adapter.mac);appendField(doc,values,'MTU:',Number.isInteger(adapter.mtu)?String(adapter.mtu):null);
      for(const family of ['IPv4','IPv6']){const addresses=(adapter.addresses||[]).filter(item=>item.family===family).map(item=>item.local+(Number.isInteger(item.prefixLength)?'/'+item.prefixLength:'')).join(', ');appendField(doc,values,family+'-Adressen:',addresses||null);}
      appendField(doc,values,'DNS-Server:',Array.isArray(adapter.dnsServers)?adapter.dnsServers.join(', ')||'Keine gemeldet':null);appendField(doc,values,'DNS-Quelle:',adapter.dnsSource);
      const routes=Array.isArray(adapter.routes)?adapter.routes.map(item=>item.family+' · '+(item.destination||'Ziel nicht verfügbar')+' → '+(item.gateway||'Gateway nicht verfügbar')+(Number.isInteger(item.metric)?' · Metrik '+item.metric:'')).join('\n'):'';appendField(doc,values,'Routen:',routes||null);
    }else{
      appendField(doc,values,'Empfangen (gesamt):',bytes(adapter.received));appendField(doc,values,'Gesendet (gesamt):',bytes(adapter.sent));appendField(doc,values,'Linkgeschwindigkeit:',finite(adapter.speed)?new Intl.NumberFormat('de-DE',{maximumFractionDigits:2}).format(adapter.speed/1000000)+' MBit/s':null);
      panel.append(el('p','Zähler und Linkgeschwindigkeit stammen vom Host-Monitor; sie belegen keinen Internetzugriff.'));
    }
    panel.prepend(values);
  };
  for(const name of tabNames){const button=el('button',name,'cp-network-status-tab');button.type='button';button.setAttribute('role','tab');button.setAttribute('aria-selected',String(name===activeTab));button.addEventListener('click',()=>{activeTab=name;for(const item of tabs.children)item.setAttribute('aria-selected',String(item.textContent===name));renderTab();});tabs.append(button);}
  renderTab();root.append(tabs,panel);
  const actions=el('div',undefined,'cp-network-status-actions');
  if((adapter.capabilities?.setDisplayName===true||data?.capabilities?.setDisplayName===true)&&targetAvailable(availableTargets,'adapter-label')&&typeof onAction==='function'){
    const form=el('form',undefined,'cp-network-label-form'),label=el('label','Anzeigename für diese Weboberfläche'),input=el('input'),save=el('button','Anzeigenamen speichern');input.type='text';input.maxLength=80;input.value=adapter.displayName===adapter.name?'':adapter.displayName||'';input.placeholder='Leer lassen, um den Alias zu entfernen';input.autocomplete='off';label.append(input);save.type='submit';save.disabled=!!busy;form.append(label,save);form.addEventListener('submit',event=>{event.preventDefault();const displayName=input.value.trim();if(displayName.length>80||/[\r\n\u0000-\u001f]/.test(displayName)){input.setCustomValidity?.('Bitte höchstens 80 druckbare Zeichen eingeben.');input.reportValidity?.();return;}input.setCustomValidity?.('');onAction({action:'label',adapterId:adapter.adapterId,displayName,expectedRevision:data.aliasRevision});});actions.append(form);
  }
  if((adapter.capabilities?.diagnose===true||data?.capabilities?.diagnose===true)&&targetAvailable(availableTargets,'network-troubleshoot')&&typeof onAction==='function'){
    const form=el('form',undefined,'cp-network-status-diagnostic'),kind=el('select'),target=el('input'),run=el('button','Diagnose');
    for(const [value,label]of [['ping','Ping'],['dns','DNS-Auflösung']]){const option=el('option',label);option.value=value;kind.append(option);}
    kind.value='ping';target.type='text';target.maxLength=253;target.autocomplete='off';target.placeholder='Hostname oder IP-Adresse';target.setAttribute('aria-label','Hostname oder IP-Adresse');run.type='submit';run.disabled=!!busy;form.append(kind,target,run);
    form.addEventListener('submit',event=>{event.preventDefault();const value=target.value.trim();if(!isSafeDiagnosticTarget(value)){target.setCustomValidity?.('Bitte einen gültigen Hostnamen oder eine IP-Adresse eingeben.');target.reportValidity?.();return;}target.setCustomValidity?.('');onAction({action:'diagnose',kind:kind.value,target:value});});
    actions.append(form);
  }
  if(data?.diagnostic&&typeof data.diagnostic.output==='string'){
    const result=el('section',undefined,'cp-network-diagnostic-result');result.setAttribute('aria-label','Diagnoseergebnis');result.append(el('h3','Hostdiagnose'),el('p','Exitcode: '+(Number.isInteger(data.diagnostic.exitCode)?data.diagnostic.exitCode:'Nicht verfügbar')),el('pre',data.diagnostic.output));
    if(data.diagnostic.internetConnectivity==='not-tested')result.append(el('p','Dies belegt keinen getrennten Internetzugriff.'));actions.append(result);
  }
  if(error)actions.append(el('p',String(error),'cp-network-error'));
  actions.append(el('p','Der Anzeigename ändert nur die Darstellung hier; der Hostname und die Konfiguration des Betriebssystems bleiben unverändert.','cp-network-limit'));
  root.append(actions);return root;
}

export function renderControlPanelAdapters({document:doc=globalThis.document,data={},availableTargets={},onNavigate,busy=false,error=null}={}){
  const el=(tag,text,className)=>sectionElement(doc,tag,text,className),root=el('section',undefined,'cp-network-adapters');root.setAttribute('aria-label','Netzwerkverbindungen');root.setAttribute('aria-busy',String(!!busy));
  const toolbar=el('div',undefined,'cp-network-adapter-toolbar'),organize=el('button','Organisieren'),disable=el('button','Netzwerkgerät deaktivieren'),inspect=el('button','Verbindung untersuchen'),rename=el('button','Verbindung umbenennen');
  for(const button of [organize,disable,inspect,rename])button.type='button';organize.disabled=true;organize.title='Keine weiteren Organisationsoptionen verfügbar.';disable.disabled=true;disable.title='Änderungen am Hostadapter sind nicht freigegeben.';inspect.disabled=true;rename.disabled=true;toolbar.append(organize,disable,inspect,rename);root.append(toolbar);
  if(!data?.adapterListAvailable){root.append(el('p',data?.error||'Aktuelle Host-Adapterdaten sind nicht verfügbar.','cp-network-unavailable'));if(error)root.append(el('p',String(error),'cp-network-error'));return root;}
  const list=el('div',undefined,'cp-network-adapter-list');list.setAttribute('role','listbox');list.setAttribute('aria-label','Hostadapter');let selected=null;const rows=[];
  const openStatus=adapter=>{if(adapter&&data?.capabilities?.readAdapters===true&&targetAvailable(availableTargets,'adapter-details'))onNavigate?.('adapter-details',{adapterId:adapter.adapterId});};
  const openAddressDetails=adapter=>{if(adapter&&data?.capabilities?.readAdapters===true&&targetAvailable(availableTargets,'adapter-address-details'))onNavigate?.('adapter-address-details',{adapterId:adapter.adapterId});};
  const select=adapter=>{selected=adapter;for(const row of rows){const active=row.dataset.adapterId===adapter.adapterId;row.setAttribute('aria-selected',String(active));row.classList.toggle('selected',active);}inspect.disabled=!(data?.capabilities?.readAdapters===true&&targetAvailable(availableTargets,'adapter-details'));rename.disabled=!(data?.capabilities?.setDisplayName===true&&targetAvailable(availableTargets,'adapter-address-details'));};
  for(const adapter of data.adapters||[]){const tile=el('button',undefined,'cp-network-adapter-tile');tile.type='button';tile.setAttribute('role','option');tile.setAttribute('aria-selected','false');tile.dataset.adapterId=adapter.adapterId;tile.title='Hostschnittstelle · Index '+adapter.ifIndex+(adapter.mac?' · '+adapter.mac:'');
    const icon=el('span',undefined,'cp-network-adapter-icon');icon.setAttribute('aria-hidden','true');const symbol=el('img');symbol.src='/icons/network-16.png';symbol.alt='';icon.append(symbol);const text=el('span',undefined,'cp-network-adapter-text'),type=adapter.kind==='ether'?'Ethernet':adapter.kind==='wlan'?'WLAN':adapter.kind||'Adaptertyp nicht verfügbar';
    text.append(el('span',adapter.displayName||adapter.name),el('span','Hostadapter'),el('span',type+' · '+adapter.name));tile.append(icon,text);tile.addEventListener('click',()=>select(adapter));tile.addEventListener('dblclick',()=>openStatus(adapter));rows.push(tile);list.append(tile);
  }
  if(!rows.length)list.append(el('p','Der Host-Agent hat keine Adapter gemeldet.'));
  inspect.addEventListener('click',()=>openStatus(selected));rename.addEventListener('click',()=>openAddressDetails(selected));root.append(list);if(error)root.append(el('p',String(error),'cp-network-error'));return root;
}

export function renderControlPanelAdapterStatus({document:doc=globalThis.document,data={},availableTargets={},onAction,onNavigate,busy=false,error=null}={}){
  const el=(tag,text,className)=>sectionElement(doc,tag,text,className),root=el('section',undefined,'cp-network-adapter-status');root.setAttribute('aria-label','Adapterstatus');root.setAttribute('aria-busy',String(!!busy));const adapter=data?.adapter;
  if(!adapter||typeof adapter.adapterId!=='string'){root.append(el('p','Adapterstatus ist nicht verfügbar.','cp-network-unavailable'));if(error)root.append(el('p',String(error),'cp-network-error'));return root;}
  const tab=el('div',undefined,'cp-network-status-tabs');tab.setAttribute('role','tablist');const tabButton=el('button','Allgemein','cp-network-status-tab');tabButton.type='button';tabButton.setAttribute('role','tab');tabButton.setAttribute('aria-selected','true');tab.append(tabButton);
  const panel=el('div',undefined,'cp-network-status-panel');panel.setAttribute('role','tabpanel');const connection=el('fieldset',undefined,'cp-network-status-group');connection.append(el('legend','Verbindung'));
  const mediaStatus=adapter.adminUp===false?'Deaktiviert':adapter.operState==='up'?'Aktiviert':adapter.operState==='down'?'Getrennt':null;
  const values=el('dl',undefined,'cp-network-status-values');appendField(doc,values,'IPv4-Konnektivität:',null);appendField(doc,values,'IPv6-Konnektivität:',null);appendField(doc,values,'Medienstatus:',mediaStatus);appendField(doc,values,'Dauer:',null);appendField(doc,values,'Übertragungsrate:',null);connection.append(values);
  const details=el('button','Details …','cp-network-details-button');details.type='button';details.disabled=!(data?.capabilities?.readAdapters===true&&targetAvailable(availableTargets,'adapter-address-details')&&typeof onNavigate==='function');details.addEventListener('click',()=>{if(!details.disabled)onNavigate('adapter-address-details',{adapterId:adapter.adapterId});});connection.append(details);
  const activity=el('fieldset',undefined,'cp-network-status-group cp-network-activity');activity.append(el('legend','Aktivität'));const directions=el('div',undefined,'cp-network-activity-directions'),sent=el('span','Gesendet'),icon=el('span',undefined,'cp-network-activity-icon'),image=el('img'),received=el('span','Empfangen');icon.setAttribute('aria-hidden','true');image.src='/icons/network-16.png';image.alt='';icon.append(image);directions.append(sent,icon,received);const counters=el('div',undefined,'cp-network-activity-counters');counters.append(el('span','Bytes: '+bytes(adapter.sent)),el('span',''),el('span','Bytes: '+bytes(adapter.received)));activity.append(directions,counters);panel.append(connection,activity);root.append(tab,panel);
  const actions=el('div',undefined,'cp-network-status-actions'),properties=el('button','Eigenschaften'),disable=el('button','Deaktivieren'),diagnose=el('button','Diagnose');properties.type=disable.type=diagnose.type='button';properties.disabled=true;properties.title=adapter.configurationReason||'Adapteränderungen sind in dieser Version nicht freigegeben.';disable.disabled=adapter.capabilities?.disable!==true;disable.title=adapter.configurationReason||'Adapteränderungen sind in dieser Version nicht freigegeben.';diagnose.disabled=!((adapter.capabilities?.diagnose===true||data?.capabilities?.diagnose===true)&&targetAvailable(availableTargets,'network-troubleshoot')&&typeof onAction==='function')||!!busy;actions.append(properties,disable,diagnose);root.append(actions);
  const diagnostic=el('section',undefined,'cp-network-status-diagnostic');diagnostic.hidden=true;const form=el('form',undefined,'cp-network-diagnostic-form'),kind=el('select'),target=el('input'),run=el('button','Diagnose starten');for(const [value,label]of [['ping','Ping'],['dns','DNS-Auflösung']]){const option=el('option',label);option.value=value;kind.append(option);}kind.value='ping';target.type='text';target.maxLength=253;target.autocomplete='off';target.placeholder='Hostname oder IP-Adresse';target.setAttribute('aria-label','Hostname oder IP-Adresse');run.type='submit';run.disabled=!!busy;form.append(kind,target,run);form.addEventListener('submit',event=>{event.preventDefault();const value=target.value.trim();if(!isSafeDiagnosticTarget(value)){target.setCustomValidity?.('Bitte einen gültigen Hostnamen oder eine IP-Adresse eingeben.');target.reportValidity?.();return;}target.setCustomValidity?.('');onAction?.({action:'diagnose',kind:kind.value,target:value});});diagnostic.append(form);diagnose.addEventListener('click',()=>{if(!diagnose.disabled){diagnostic.hidden=!diagnostic.hidden;if(!diagnostic.hidden)target.focus?.();}});root.append(diagnostic);
  if(data?.diagnostic&&typeof data.diagnostic.output==='string'){const result=el('section',undefined,'cp-network-diagnostic-result');result.setAttribute('aria-label','Diagnoseergebnis');result.append(el('h3','Hostdiagnose'),el('p','Exitcode: '+(Number.isInteger(data.diagnostic.exitCode)?data.diagnostic.exitCode:'Nicht verfügbar')),el('pre',data.diagnostic.output));if(data.diagnostic.internetConnectivity==='not-tested')result.append(el('p','Dies belegt keinen getrennten Internetzugriff.'));root.append(result);}
  if(error)root.append(el('p',String(error),'cp-network-error'));return root;
}

export function renderControlPanelAdapterDetails({document:doc=globalThis.document,data={},onAction,busy=false,error=null}={}){
  const el=(tag,text,className)=>sectionElement(doc,tag,text,className),root=el('section',undefined,'cp-network-adapter-details');root.setAttribute('aria-label','Netzwerkverbindungsdetails');root.setAttribute('aria-busy',String(!!busy));const adapter=data?.adapter;
  if(!adapter||typeof adapter.adapterId!=='string'){root.append(el('p','Adapterdetails sind nicht verfügbar.','cp-network-unavailable'));if(error)root.append(el('p',String(error),'cp-network-error'));return root;}
  root.append(el('p','Netzwerkverbindungsdetails:'));const rows=[],addresses=Array.isArray(adapter.addresses)?adapter.addresses:[],routes=Array.isArray(adapter.routes)?adapter.routes:[];
  const list=family=>addresses.filter(item=>item.family===family),v4=list('IPv4'),v6=list('IPv6');
  const dottedMask=prefix=>{if(!Number.isInteger(prefix)||prefix<0||prefix>32)return null;const bits=prefix===0?0:(0xffffffff<<(32-prefix))>>>0;return[24,16,8,0].map(shift=>(bits>>>shift)&255).join('.')};
  const routeDefaults=(family,values)=>routes.filter(item=>item.family===family&&['default',family==='IPv4'?'0.0.0.0/0':'::/0'].includes(item.destination||'')).map(item=>item.gateway).filter(Boolean).join(', ')||null;
  const add=(name,value)=>rows.push([name,value??'Nicht verfügbar']);add('Verbindungsspezifisches DNS-Suffix',null);add('Beschreibung','Hostadapter · '+adapter.name);add('Physische Adresse',adapter.mac);add('DHCP aktiviert',null);
  const dns=Array.isArray(adapter.dnsServers)?adapter.dnsServers:null,byFamily=family=>{if(!dns)return null;const matched=dns.filter(value=>family==='IPv4'?isIPv4Address(value):value.includes(':'));return matched.join(', ')||(dns.length?'Keine gemeldeten Server dieser Familie':'Keine gemeldet')},unknownDns=dns?.filter(value=>!isIPv4Address(value)&&!value.includes(':'));
  add('IPv4-Adresse',v4.map(item=>item.local).join(', ')||null);add('IPv4-Subnetzmaske',v4.map(item=>dottedMask(item.prefixLength)).filter(Boolean).join(', ')||null);add('Lease erhalten am',null);add('Lease läuft ab am',null);add('IPv4-Standardgateway',routeDefaults('IPv4',routes));add('IPv4-DHCP-Server',null);add('IPv4-DNS-Server',byFamily('IPv4'));add('IPv4-WINS-Server',null);add('NetBIOS über TCP/IP aktiviert',null);
  add('IPv6-Adresse',v6.filter(item=>item.scope!=='link').map(item=>item.local+(Number.isInteger(item.prefixLength)?'/'+item.prefixLength:'')).join(', ')||null);add('Temporäre IPv6-Adresse',null);add('IPv6-Link-Local-Adresse',v6.filter(item=>item.scope==='link').map(item=>item.local+(Number.isInteger(item.prefixLength)?'/'+item.prefixLength:'')).join(', ')||null);add('IPv6-Standardgateway',routeDefaults('IPv6',routes));add('IPv6-DNS-Server',byFamily('IPv6'));if(unknownDns?.length)add('DNS-Server (Familie nicht ermittelt)',unknownDns.join(', '));
  const table=el('table',undefined,'cp-network-details-table'),head=el('thead'),headRow=el('tr');for(const title of ['Eigenschaft','Wert']){const th=el('th',title);th.scope='col';headRow.append(th);}head.append(headRow);table.append(head);const body=el('tbody');for(const [name,value]of rows){const row=el('tr');row.append(el('th',name),el('td',value));row.children[0].scope='row';body.append(row);}table.append(body);root.append(table);
  if((adapter.capabilities?.setDisplayName===true||data?.capabilities?.setDisplayName===true)&&typeof onAction==='function'){
    const alias=el('details',undefined,'cp-network-alias'),summary=el('summary','Web-Anzeigename ändern …'),form=el('form',undefined,'cp-network-label-form'),label=el('label','Anzeigename'),input=el('input'),save=el('button','Speichern');input.type='text';input.maxLength=80;input.value=adapter.displayName===adapter.name?'':adapter.displayName||'';input.placeholder='Leer lassen, um den Alias zu entfernen';input.autocomplete='off';label.append(input);save.type='submit';save.disabled=!!busy;form.append(label,save);form.addEventListener('submit',event=>{event.preventDefault();const displayName=input.value.trim();if(displayName.length>80||/[\r\n\u0000-\u001f]/.test(displayName)){input.setCustomValidity?.('Bitte höchstens 80 druckbare Zeichen eingeben.');input.reportValidity?.();return;}input.setCustomValidity?.('');onAction({action:'label',adapterId:adapter.adapterId,displayName,expectedRevision:data.aliasRevision});});alias.append(summary,form);root.append(alias);
  }
  if(error)root.append(el('p',String(error),'cp-network-error'));return root;
}

function targetReason(data,target){return target==='adapter-settings'&&!data?.capabilities?.readAdapters?'Adapterinformationen sind nicht freigegeben.':'Diese Funktion wird vom aktuellen Hostvertrag nicht freigegeben.';}
