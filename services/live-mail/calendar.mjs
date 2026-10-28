import {randomBytes,createHash,timingSafeEqual} from 'node:crypto';
import {promises as fs} from 'node:fs';
import path from 'node:path';
import {XMLParser,XMLValidator} from 'fast-xml-parser';

const fail=(message,status=400)=>{const e=new Error(message);e.status=status;throw e;};
const id=()=>randomBytes(16).toString('hex');
const hash=v=>createHash('sha256').update(v).digest('hex');
const xml=v=>String(v).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const escape=v=>String(v||'').replaceAll('\\','\\\\').replaceAll('\r','').replaceAll('\n','\\n').replaceAll(';','\\;').replaceAll(',','\\,');
const utc=v=>new Date(v).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');
function fold(line){let result='',width=0;for(const char of line){const size=Buffer.byteLength(char);if(width+size>75){result+='\r\n ';width=1;}result+=char;width+=size;}return result;}
export function eventIcs(event,calendar){const allDay=event.allDay,lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Live Mail//Calendar//DE','CALSCALE:GREGORIAN','X-WR-CALNAME:'+escape(calendar.name),'BEGIN:VEVENT','UID:'+event.id+'@live-mail','DTSTAMP:'+utc(event.updated),'LAST-MODIFIED:'+utc(event.updated),'SEQUENCE:'+event.sequence,'SUMMARY:'+escape(event.title),allDay?'DTSTART;VALUE=DATE:'+event.start.replaceAll('-',''):'DTSTART:'+utc(event.start),allDay?'DTEND;VALUE=DATE:'+event.end.replaceAll('-',''):'DTEND:'+utc(event.end),'DESCRIPTION:'+escape(event.description),'LOCATION:'+escape(event.location),'END:VEVENT','END:VCALENDAR'];return lines.map(fold).join('\r\n')+'\r\n';}
export function calendarIcs(events,calendar){const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Live Mail//Calendar//DE','CALSCALE:GREGORIAN','X-WR-CALNAME:'+escape(calendar.name)];for(const event of events){const text=eventIcs(event,calendar);lines.push(text.slice(text.indexOf('BEGIN:VEVENT'),text.indexOf('END:VEVENT')+10));}lines.push('END:VCALENDAR');return lines.map(line=>line.includes('\r\n')?line:fold(line)).join('\r\n')+'\r\n';}
export function validateEvent(value,calendar){
 const string=(key,max)=>{if(value[key]!==undefined&&(typeof value[key]!=='string'||value[key].length>max))fail('Ungültiges Terminfeld: '+key);return(value[key]||'').trim();};
 const title=string('title',200);if(!title)fail('Bitte einen Betreff für den Termin eingeben.');const allDay=value.allDay===true,start=string('start',40),end=string('end',40);
 const valid=v=>allDay?/^\d{4}-\d{2}-\d{2}$/.test(v)&&new Date(v).toISOString().slice(0,10)===v:/^\d{4}-\d{2}-\d{2}T/.test(v)&&Number.isFinite(Date.parse(v))&&/(Z|[+-]\d{2}:\d{2})$/.test(v);
 try{if(!valid(start)||!valid(end)||Date.parse(start)>=Date.parse(end))fail('Das Ende des Termins muss nach dem Beginn liegen.');}catch{fail('Bitte gültige Anfangs- und Endzeiten eingeben.');}
 return{calendar:calendar.id,title,start:allDay?start:new Date(start).toISOString(),end:allDay?end:new Date(end).toISOString(),allDay,description:string('description',16000),location:string('location',300)};
}
const active=db=>(db.calendarEvents||[]).filter(e=>!e.deleted);
function ensure(db){db.calendars||=[{id:'local',name:'Mein Kalender',color:'#77b58b',timeZone:'Europe/Berlin'}];db.calendarEvents||=[];return db;}
const arrays=v=>v===undefined?[]:Array.isArray(v)?v:[v];
export function createCalendarService({directory,read,mutate,seal,open}){
 const shares=path.join(directory,'calendar-shares'),tokenFile=token=>path.join(shares,hash(token)+'.json');
 return{async handle(user,method,route,q,data={}){
  if(route==='/calendars'&&method==='GET'){const db=ensure(await read(user));return{calendars:db.calendars,events:active(db)};}
  if(route==='/calendars'&&method==='POST')return mutate(user,db=>{ensure(db);const old=data.id&&db.calendars.find(c=>c.id===data.id);if(data.id&&!old)fail('Kalender nicht gefunden.',404);if(!old&&db.calendars.length>=20)fail('Maximal 20 Kalender.');if(typeof data.name!=='string'||!data.name.trim()||data.name.length>100)fail('Bitte einen Kalendernamen eingeben.');const timeZone=data.timeZone||old?.timeZone||'Europe/Berlin';try{new Intl.DateTimeFormat('de',{timeZone});}catch{fail('Ungültige Zeitzone.');}const calendar={...old,id:old?.id||id(),name:data.name.trim(),color:/^#[a-f0-9]{6}$/i.test(data.color)?data.color:old?.color||'#77b58b',timeZone};db.calendars=db.calendars.filter(c=>c.id!==calendar.id);db.calendars.push(calendar);return calendar;});
  if(route==='/calendar/events'&&method==='POST')return mutate(user,db=>{ensure(db);const calendar=db.calendars.find(c=>c.id===data.calendar);if(!calendar)fail('Kalender nicht gefunden.',404);const old=data.id&&db.calendarEvents.find(e=>e.id===data.id);if(data.id&&!old)fail('Termin nicht gefunden.',404);if(!old&&active(db).length>=5000)fail('Maximal 5.000 Termine.');const event={...validateEvent(data,calendar),id:old?.id||id(),updated:new Date().toISOString(),sequence:(old?.sequence||0)+1};db.calendarEvents=db.calendarEvents.filter(e=>e.id!==event.id);db.calendarEvents.push(event);return event;});
  if(route==='/calendar/events/remove'&&method==='POST')return mutate(user,db=>{ensure(db);const event=db.calendarEvents.find(e=>e.id===data.id);if(!event)fail('Termin nicht gefunden.',404);if(data.restore)delete event.deleted;else event.deleted=new Date().toISOString();event.updated=new Date().toISOString();event.sequence++;return{ok:true};});
  if(route==='/calendar/share'&&method==='POST'){
   const oldToken=(await read(user)).calendars?.find(c=>c.id===data.calendar)?.token;
   const calendar=await mutate(user,db=>{ensure(db);const c=db.calendars.find(c=>c.id===data.calendar);if(!c)fail('Kalender nicht gefunden.',404);if(data.enabled)c.token||=randomBytes(32).toString('base64url');else delete c.token;return{...c};});
   if(calendar.token){await fs.mkdir(shares,{recursive:true});await fs.writeFile(tokenFile(calendar.token),seal({user,calendar:calendar.id}),{mode:0o600});}else if(oldToken)await fs.unlink(tokenFile(oldToken)).catch(e=>{if(e.code!=='ENOENT')throw e;});return calendar;
  }
  fail('Unbekannte Kalenderfunktion.',404);
 },async published(method,url,body='',depth='0',etag=''){
  const parts=url.pathname.split('/').filter(Boolean),token=parts[1];if(parts[0]!=='caldav'||! /^[\w-]{43}$/.test(token||''))fail('Kalenderfreigabe nicht gefunden.',404);
  let target;try{target=open(await fs.readFile(tokenFile(token),'utf8'));}catch{fail('Kalenderfreigabe nicht gefunden.',404);}const db=ensure(await read(target.user)),calendar=db.calendars.find(c=>c.id===target.calendar);if(!calendar?.token||!timingSafeEqual(Buffer.from(calendar.token),Buffer.from(token)))fail('Kalenderfreigabe nicht gefunden.',404);
  const base='/caldav/'+token+'/',suffix=parts.slice(2).join('/'),events=active(db).filter(e=>e.calendar===calendar.id),headers={'DAV':'1, calendar-access','Allow':'OPTIONS, GET, HEAD, PROPFIND, REPORT','Cache-Control':'private, no-cache','X-Content-Type-Options':'nosniff'};
  if(!['OPTIONS','GET','HEAD','PROPFIND','REPORT'].includes(method))return{status:405,headers,body:'Dieser abonnierte Kalender ist schreibgeschützt.'};
  if(method==='OPTIONS')return{status:204,headers,body:''};
  const event=suffix.match(/^(?:home\/calendar\/)?([a-f0-9]{32})\.ics$/)?.[1],collectionBase=suffix.startsWith('home/calendar')?base+'home/calendar/':base,selected=event?events.filter(e=>e.id===event):events;if(event&&!selected.length)fail('Termin nicht gefunden.',404);if(suffix&&!event&&!['home','principal','home/calendar'].includes(suffix))fail('Nicht gefunden.',404);
  if(method==='GET'||method==='HEAD'){if(suffix&&!event&&suffix!=='home/calendar')fail('Nicht gefunden.',404);const content=event?eventIcs(selected[0],calendar):calendarIcs(events,calendar),tag='"'+hash(content)+'"';return{status:etag===tag?304:200,headers:{...headers,'Content-Type':'text/calendar; charset=utf-8','ETag':tag,'Content-Disposition':'inline; filename="calendar.ics"'},body:method==='HEAD'||etag===tag?'':content};}
  if(Buffer.byteLength(body)>1024*1024||/<!DOCTYPE|<!ENTITY/i.test(body))fail('Ungültige Kalenderanfrage.');let request={};if(body){if(XMLValidator.validate(body)!==true)fail('Ungültige XML-Anfrage.');request=new XMLParser({ignoreAttributes:false,removeNSPrefix:true,processEntities:false}).parse(body);}
  const props=(href,values)=>'<d:response><d:href>'+xml(href)+'</d:href><d:propstat><d:prop>'+values+'</d:prop><d:status>HTTP/1.1 200 OK</d:status></d:propstat></d:response>';
  const item=e=>{const content=eventIcs(e,calendar);return props(collectionBase+e.id+'.ics','<d:resourcetype/><d:getetag>&quot;'+hash(content)+'&quot;</d:getetag><d:getcontenttype>text/calendar; charset=utf-8</d:getcontenttype><d:getcontentlength>'+Buffer.byteLength(content)+'</d:getcontentlength>'+(method==='REPORT'?'<c:calendar-data>'+xml(content)+'</c:calendar-data>':''));};
  let output='';
  if(method==='REPORT'){
   const multi=request['calendar-multiget'],query=request['calendar-query'];if(!multi&&!query)fail('Dieser CalDAV-Bericht wird nicht unterstützt.',400);
   let filtered=events;
   if(multi){const hrefs=arrays(multi.href).map(v=>typeof v==='string'?v:v['#text']);filtered=events.filter(e=>hrefs.some(h=>{try{return new URL(h,'http://calendar').pathname===collectionBase+e.id+'.ics';}catch{return false;}}));}
   if(query){const ranges=[];const visit=v=>{if(!v||typeof v!=='object')return;for(const[k,x]of Object.entries(v)){if(k==='time-range')ranges.push(...arrays(x));else for(const child of arrays(x))visit(child);}};visit(query);const parse=v=>{if(!v)return null;const match=String(v).match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/);if(!match)fail('Ungültiger Zeitfilter.');return Date.UTC(...match.slice(1).map((x,i)=>Number(x)-(i===1?1:0)));};for(const range of ranges){const start=parse(range['@_start']),end=parse(range['@_end']);filtered=filtered.filter(e=>(!end||Date.parse(e.start)<end)&&(!start||Date.parse(e.end)>start));}}
   output=filtered.map(item).join('');
  }else if(event)output=item(selected[0]);else{
   const principal=base+'principal/',home=base+'home/',type=suffix==='principal'?'<d:principal/>':suffix==='home'?'<d:collection/>':'<d:collection/><c:calendar/>';
   const reports='<d:supported-report-set><d:supported-report><d:report><c:calendar-query/></d:report></d:supported-report><d:supported-report><d:report><c:calendar-multiget/></d:report></d:supported-report></d:supported-report-set>';
   const collection=href=>props(href,'<d:displayname>'+xml(calendar.name)+'</d:displayname><d:resourcetype>'+type+'</d:resourcetype><d:current-user-principal><d:href>'+xml(principal)+'</d:href></d:current-user-principal><c:calendar-home-set><d:href>'+xml(home)+'</d:href></c:calendar-home-set><d:current-user-privilege-set><d:privilege><d:read/></d:privilege></d:current-user-privilege-set><c:supported-calendar-component-set><c:comp name="VEVENT"/></c:supported-calendar-component-set>'+reports);
   output=collection(base+(suffix?suffix+'/':''));if(depth==='1')output+=suffix==='home'?props(home+'calendar/','<d:displayname>'+xml(calendar.name)+'</d:displayname><d:resourcetype><d:collection/><c:calendar/></d:resourcetype>'+reports):suffix===''||suffix==='home/calendar'?events.map(item).join(''):'';
  }
  return{status:207,headers:{...headers,'Content-Type':'application/xml; charset=utf-8'},body:'<?xml version="1.0" encoding="utf-8"?><d:multistatus xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">'+output+'</d:multistatus>'};
 }};
}
