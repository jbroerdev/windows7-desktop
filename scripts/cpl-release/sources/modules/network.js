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

/**
 * Returns a DOM section; no fetch, timers, dialogs, writes or global desktop access.
 * data = networkDataFromTaskManager(GET /api/task-manager JSON, currentContext).
 * availableTargets = Set<string> or own boolean properties. Rechecked on activation.
 * The host callback must recheck its current profile/permissions before navigation.
 * Own sidebar included; host hides its sidebar and removes its content padding.
 */
export function renderControlPanelNetwork({document:doc=globalThis.document,data={},availableTargets={},onNavigate,includeNavigation=true,now=Date.now()}={}){
  const el=(tag,text,className)=>{const node=doc.createElement(tag);if(text!==undefined)node.textContent=text;if(className)node.className=className;return node;};
  const root=el('section',undefined,'cp-network-page');root.setAttribute('aria-label','Netzwerk- und Freigabecenter');
  const link=(target,label)=>{
    const enabled=typeof onNavigate==='function'&&available(availableTargets,target);
    const node=el(enabled?'button':'span',label,'cp-network-link');node.dataset.networkTarget=target;
    if(enabled){node.type='button';node.addEventListener('click',()=>{if(available(availableTargets,target))onNavigate(target);});}
    else{node.classList.add('is-unavailable');node.setAttribute('aria-disabled','true');node.title='In dieser Webumgebung noch nicht verfügbar.';}
    return node;
  };
  if(includeNavigation){
    const side=el('nav',undefined,'cp-network-sidebar');side.setAttribute('aria-label','Systemsteuerung');
    for(const item of controlPanelNetworkNavigation.filter(item=>!item.related))side.append(link(item.target,item.label));
    const related=el('div',undefined,'cp-network-related');related.append(el('p','Siehe auch'));
    for(const item of controlPanelNetworkNavigation.filter(item=>item.related))related.append(link(item.target,item.label));
    side.append(related);root.append(side);
  }
  const content=el('div',undefined,'cp-network-content');root.append(content);
  content.append(el('h2','Zeigen Sie die grundlegenden Informationen zum Netzwerk an, und richten Sie Verbindungen ein.'));
  const map=el('div',undefined,'cp-network-map');
  map.append(el('p','Die Netzwerkübersicht ist in dieser Webumgebung nicht verfügbar.'),link('network-map','Gesamtübersicht anzeigen'));content.append(map);
  const heading=(text,target,label)=>{const row=el('div',undefined,'cp-network-section-heading');row.append(el('h3',text));if(target)row.append(link(target,label));content.append(row);};
  heading('Aktive Netzwerke anzeigen','connect-network','Verbindung herstellen oder trennen');
  const active=el('div',undefined,'cp-network-active');
  active.append(el('p','Für diesen Webdesktop liegen keine Informationen über aktive Windows-Netzwerke vor.'));
  const status=el('dl');for(const [label,value]of [['Zugriffstyp:','Nicht ermittelt'],['Verbindungen:','Nicht ermittelt']])status.append(el('dt',label),el('dd',value));active.append(status);content.append(active);
  heading('Netzwerkeinstellungen ändern');
  const list=el('ul',undefined,'cp-network-tasks');
  for(const [target,label,description]of tasks){const row=el('li');row.append(link(target,label),el('p',description));list.append(row);}content.append(list);
  const model=getControlPanelNetworkData({scope:data?.hostAvailable===true?'host':null,generatedAt:data?.generatedAt,host:{hostname:data?.hostname},interfaces:data?.adapters},{now,shareEnabled:data?.shareEnabled});
  const observation=el('details',undefined,'cp-network-observations');observation.append(el('summary','Verfügbare Informationen des Webdesktops'));
  observation.append(el('p','Host-Adapter und öffentlicher Desktop sind keine Windows-Netzwerkverbindungen oder Heimnetzgruppe.'));
  if(model.hostAvailable){
    observation.append(el('p','Datenquelle: Host-Monitor'+(model.hostname?' · '+model.hostname:'')+' · '+new Date(model.generatedAt).toLocaleString('de-DE')));
    if(model.adapters.length){
      const wrap=el('div',undefined,'cp-network-table-wrap'),table=el('table'),head=el('thead'),tr=el('tr');
      for(const title of ['Host-Adapter','Empfangen (gesamt)','Gesendet (gesamt)','Linkgeschwindigkeit']){const th=el('th',title);th.scope='col';tr.append(th);}head.append(tr);table.append(head);
      const body=el('tbody');for(const adapter of model.adapters){const row=el('tr');const th=el('th',adapter.name);th.scope='row';row.append(th,el('td',bytes(adapter.received)),el('td',bytes(adapter.sent)),el('td',adapter.speed===null?'Nicht verfügbar':new Intl.NumberFormat('de-DE',{maximumFractionDigits:2}).format(adapter.speed/1000000)+' MBit/s'));body.append(row);}table.append(body);wrap.append(table);observation.append(wrap);
    }else observation.append(el('p','Der Host-Monitor meldet keine Adapter. Dies belegt keinen getrennten Netzwerkzustand.'));
  }else observation.append(el('p','Aktuelle Host-Adapterdaten sind nicht verfügbar.'));
  observation.append(el('p','Öffentlicher Desktop: '+(model.shareEnabled===null?'Nicht ermittelt':model.shareEnabled?'Freigabe aktiviert':'Freigabe deaktiviert')));
  const actions=el('div',undefined,'cp-network-web-actions');actions.append(link('share','Öffentlichen Desktop verwalten'),link('explorer-network','Netzwerk im Explorer öffnen'),link('task-manager','Hostinformationen im Task-Manager anzeigen'));observation.append(actions);content.append(observation);
  content.append(el('p','Grau dargestellte Aufgaben sind in dieser Webumgebung noch nicht verfügbar.','cp-network-limit'));
  return root;
}
