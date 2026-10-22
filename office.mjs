import {promises as fs,createReadStream} from 'node:fs';
import path from 'node:path';
import {randomBytes,createHash} from 'node:crypto';
import {zipSync,unzipSync,strToU8,strFromU8} from 'fflate';

const extensions=new Set('doc docx docm dot dotx odt ott rtf xls xlsx xlsm xlt xltx ods ots csv ppt pptx pps ppsx odp otp'.split(' '));
export const isOfficeFile=n=>n?.kind==='file'&&extensions.has(path.extname(n.name).slice(1).toLowerCase());
const error=(message,status=400)=>{throw Object.assign(Error(message),{status});};
const digest=b=>createHash('sha256').update(b).digest('hex');
const MAX_FILE=64*1024*1024,LOCK_TTL=30*60*1000,TOKEN_TTL=8*60*60*1000;
function baseUrl(value){const u=new URL(value);if(!['http:','https:'].includes(u.protocol)||u.username||u.password||u.search||u.hash||u.pathname!=='/')error('Office-Adressen müssen HTTP-/HTTPS-Ursprünge ohne Pfad sein.');return u.origin;}
function xmlValue(value){return value.replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;/g,"'");}
export function parseDiscovery(xml,publicUrl){
 if(xml.length>1024*1024||/<!DOCTYPE|<!ENTITY/i.test(xml))error('Ungültige Office-Discovery.',502);
 const actions=[];
 for(const match of xml.matchAll(/<action\b([^>]+)\/?\s*>/g)){
  const attr=Object.create(null);for(const item of match[1].matchAll(/([\w-]+)\s*=\s*(["'])(.*?)\2/g))attr[item[1]]=xmlValue(item[3]);
  if(!attr.ext||!['edit','view'].includes(attr.name)||!attr.urlsrc)continue;
  let url;try{url=new URL(attr.urlsrc.replace(/<[^>]*>/g,''));}catch{continue;}
  // Discovery may advertise the internal container address. Only the editor path is rebased.
  if(!/^\/browser\/[a-zA-Z0-9._/-]+\/cool\.html$/.test(url.pathname))continue;
  const launch=new URL(url.pathname+url.search,publicUrl);actions.push({ext:attr.ext.toLowerCase(),action:attr.name,url:launch.href});
 }
 if(!actions.length)error('Collabora bietet keine unterstützten Office-Editoren an.',502);
 return actions;
}

export function blankOfficeDocument(kind){
 const types={text:['odt','application/vnd.oasis.opendocument.text','<office:text><text:p/></office:text>'],sheet:['ods','application/vnd.oasis.opendocument.spreadsheet','<office:spreadsheet><table:table table:name="Tabelle1"><table:table-row><table:table-cell/></table:table-row></table:table></office:spreadsheet>'],presentation:['odp','application/vnd.oasis.opendocument.presentation','<office:presentation><draw:page draw:name="Folie1" draw:master-page-name="Standard"/></office:presentation>']};
 const type=types[kind];if(!type)error('Unbekannter Office-Dokumenttyp.');
 const namespaces='xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0" xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0" xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0" xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0"';
 const files={mimetype:[strToU8(type[1]),{level:0}],
  'content.xml':strToU8(`<?xml version="1.0" encoding="UTF-8"?><office:document-content ${namespaces} office:version="1.3"><office:automatic-styles/><office:body>${type[2]}</office:body></office:document-content>`),
  'styles.xml':strToU8(`<?xml version="1.0" encoding="UTF-8"?><office:document-styles ${namespaces} office:version="1.3"><office:styles/><office:automatic-styles><style:page-layout style:name="pm1"><style:page-layout-properties fo:page-width="29.7cm" fo:page-height="21cm"/></style:page-layout></office:automatic-styles><office:master-styles><style:master-page style:name="Standard" style:page-layout-name="pm1"/></office:master-styles></office:document-styles>`),
  'META-INF/manifest.xml':strToU8(`<?xml version="1.0"?><manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0" manifest:version="1.3"><manifest:file-entry manifest:full-path="/" manifest:media-type="${type[1]}"/><manifest:file-entry manifest:full-path="content.xml" manifest:media-type="text/xml"/><manifest:file-entry manifest:full-path="styles.xml" manifest:media-type="text/xml"/></manifest:manifest>`)};
 return {extension:type[0],bytes:Buffer.from(zipSync(files,{level:6}))};
}

export async function createOffice({get:lookup,readable,owned,publicNode,filePath:nodePath,save,metadataDir,resolveSession,canLock=()=>true,runLocked,config=process.env}){
 const enabled=!!config.OFFICE_URL;
 if(!enabled)return {enabled:false,origin:null,isOfficeFile,assertUnlocked(){},open:()=>error('Office ist noch nicht eingerichtet.',503),handle:()=>error('Office ist nicht eingerichtet.',404)};
 const origin=baseUrl(config.OFFICE_URL),publicOrigin=baseUrl(config.EXPLORER_PUBLIC_URL||'http://localhost:3000');
 const drafts=new Map(),draftDir=path.join(metadataDir,'office-drafts');await fs.mkdir(draftDir,{recursive:true});
 // Drafts are private, session-bound and never enter the Explorer index.
 for(const name of await fs.readdir(draftDir))if(/^[a-f0-9]{32}$/.test(name))await fs.unlink(path.join(draftDir,name));
 const get=id=>drafts.get(id)||lookup(id),filePath=n=>drafts.has(n.id)?path.join(draftDir,n.id):nodePath(n);
 function draftFor(id,user,sid){const n=drafts.get(id);if(!n||!user||n.owner!==user.id||n.sid!==sid)error('Temporäres Dokument nicht gefunden.',404);return n;}
 async function newDraft(kind,user,sid,template){if(!user||!sid)error('Bitte anmelden, um neue Dokumente zu bearbeiten.',401);if(drafts.size>=128)error('Zu viele temporäre Dokumente.',429);const blank=blankOfficeDocument(kind);let bytes=blank.bytes;if(template){const source=lookup(template);if(!isOfficeFile(source)||!readable(source,user)||!['.'+blank.extension,'.'+({text:'ott',sheet:'ots',presentation:'otp'}[kind])].includes(path.extname(source.name).toLowerCase()))error('Bitte eine passende OpenDocument-Vorlage auswählen.');bytes=await bytesFor(source);if(/\.(ott|ots|otp)$/i.test(source.name)){let total=0;const files=unzipSync(bytes,{filter:f=>{total+=f.originalSize;if(total>MAX_FILE)error('Vorlage ist zu groß.',413);return true;}});const mime=strFromU8(files.mimetype||new Uint8Array()).replace(/-template$/,'');if(!/^application\/vnd\.oasis\.opendocument\.(text|spreadsheet|presentation)$/.test(mime))error('Ungültige Vorlage.');files.mimetype=[strToU8(mime),{level:0}];if(files['META-INF/manifest.xml'])files['META-INF/manifest.xml']=strToU8(strFromU8(files['META-INF/manifest.xml']).replaceAll(mime+'-template',mime));bytes=Buffer.from(zipSync(files));}}const n={id:randomBytes(16).toString('hex'),owner:user.id,sid,shareMode:!!user.shareEditing,expires:Date.now()+TOKEN_TTL,kind:'file',name:'Unbenannt.'+blank.extension,size:bytes.length};await fs.writeFile(path.join(draftDir,n.id),bytes,{flag:'wx'});drafts.set(n.id,n);return {id:n.id,name:n.name,temporary:true};}
 async function draftBytes(id,user,sid,kind){return runLocked('office:'+id,async()=>{const n=draftFor(id,user,sid);if(kind&&path.extname(n.name)!=='.'+blankOfficeDocument(kind).extension)error('Dokumenttyp stimmt nicht überein.');return bytesFor(n);});}
 function draftName(id,user,sid){return draftFor(id,user,sid).name;}
 async function discardDraft(id,user,sid){draftFor(id,user,sid);return runLocked('office:'+id,async()=>{drafts.delete(id);for(const[token,g]of tokens)if(g.id===id)tokens.delete(token);fileLocks.delete(id);await fs.unlink(path.join(draftDir,id)).catch(()=>{});await persistLocks();});}
 async function editCopy(id,user,sid){const source=lookup(id);if(!isOfficeFile(source)||!readable(source,user))error('Datei nicht gefunden.',404);if(!owned(source,user))return {id:source.id,name:source.name};const bytes=await bytesFor(source),n={id:randomBytes(16).toString('hex'),owner:user.id,sid,shareMode:!!user.shareEditing,expires:Date.now()+TOKEN_TTL,kind:'file',name:source.name,sourceId:id,sourceVersion:digest(bytes)};if(drafts.size>=128)error('Zu viele temporäre Dokumente.',429);await fs.writeFile(path.join(draftDir,n.id),bytes,{flag:'wx'});drafts.set(n.id,n);return {id:n.id,name:n.name,workingCopy:true,sourceId:id};}
 async function commitCopy(id,user,sid){
  const n=draftFor(id,user,sid);if(!n.sourceId)error('Kein gespeichertes Dokument.');
  return runLocked('office:'+id,()=>runLocked('office:'+n.sourceId,async()=>{
   draftFor(id,user,sid);
   const source=lookup(n.sourceId);if(!readable(source,user)||!owned(source,user))error('Datei ist nicht mehr bearbeitbar.',403);
   assertUnlocked([source.id]);if(!canLock(source.id))error('Datei wird gerade im Explorer geändert.',409);
   // Block native rename/delete while the optimistic save checks and writes the original.
   const guard={lock:'commit-'+id,expires:Date.now()+LOCK_TTL,version:n.sourceVersion};fileLocks.set(source.id,guard);
   try{
    if(await versionFor(source)!==n.sourceVersion)error('Die Datei wurde zwischenzeitlich geändert. Bitte mit „Speichern unter“ separat speichern.',409);
    const bytes=await bytesFor(n),filename=filePath(source),temp=filename+'.office-'+randomBytes(8).toString('hex')+'.tmp';
    try{await fs.writeFile(temp,bytes,{flag:'wx'});await fs.rename(temp,filename);}finally{await fs.unlink(temp).catch(()=>{});}
    n.sourceVersion=digest(bytes);source.size=bytes.length;source.modified=new Date().toISOString();await save();return {id:source.id};
   }finally{if(fileLocks.get(source.id)===guard){fileLocks.delete(source.id);await persistLocks();}}
  }));
 }
 const draftCleanup=setInterval(()=>{for(const n of drafts.values())if(!resolveSession(n.sid,n.shareMode)||n.expires<=Date.now())discardDraft(n.id,{id:n.owner},n.sid).catch(()=>{});},60000);draftCleanup.unref();
 if(origin===publicOrigin)error('Office benötigt einen eigenen Ursprung, z. B. office.xserverx.app.');
 const wopiOrigin=baseUrl(config.OFFICE_WOPI_URL||publicOrigin),discoveryUrl=new URL('/hosting/discovery',config.OFFICE_DISCOVERY_URL||origin).href;
 const lockFile=path.join(metadataDir,'office-locks.json'),tokens=new Map(),fileLocks=new Map();let discovery=null,discoveryTime=0,lockWrites=Promise.resolve();
 try{for(const [id,value]of Object.entries(JSON.parse(await fs.readFile(lockFile,'utf8'))))if(value?.expires>Date.now()&&typeof value.lock==='string'&&typeof value.version==='string')fileLocks.set(id,value);}catch(e){if(e.code!=='ENOENT')throw e;}
 async function persistLocks(){const snapshot=JSON.stringify(Object.fromEntries(fileLocks));lockWrites=lockWrites.catch(()=>{}).then(async()=>{await fs.writeFile(lockFile+'.tmp',snapshot);await fs.rename(lockFile+'.tmp',lockFile);});await lockWrites;}
 function currentLock(id){const lock=fileLocks.get(id);if(lock?.expires<=Date.now()){fileLocks.delete(id);return null;}return lock;}
 function assertUnlocked(ids){const roots=new Set(ids);for(const[id]of fileLocks){if(!currentLock(id))continue;let n=get(id),seen=new Set();while(n&&!seen.has(n.id)){if(roots.has(n.id))error('Die Datei ist in Office geöffnet. Bitte zuerst dort schließen.',409);seen.add(n.id);n=get(n.parent);}}}
 async function bytesFor(node){const name=filePath(node),info=await fs.stat(name);if(info.size>MAX_FILE)error('Office unterstützt Dateien bis 64 MB.',413);const bytes=await fs.readFile(name);if(bytes.length>MAX_FILE)error('Office unterstützt Dateien bis 64 MB.',413);return bytes;}
 async function versionFor(node){return digest(await bytesFor(node));}
 function authorize(token,id,write=false){
  const grant=tokens.get(token);if(!grant||grant.id!==id||grant.expires<=Date.now()){tokens.delete(token);error('Office-Berechtigung abgelaufen. Bitte Datei erneut öffnen.',401);}
  const node=get(id),actor=grant.sid?resolveSession(grant.sid,grant.shareMode):null;
  if(grant.sid&&!actor)error('Office-Sitzung wurde beendet.',401);
  const draft=drafts.has(id),allowed=draft?!!actor&&node.owner===actor.id&&node.sid===grant.sid&&(!node.sourceId||readable(lookup(node.sourceId),actor)&&owned(lookup(node.sourceId),actor)):(grant.publicOnly?publicNode(node):readable(node,actor));
  if(!isOfficeFile(node)||!allowed)error('Datei nicht freigegeben oder nicht mehr verfügbar.',404);
  if(write&&(!grant.write||!actor||!(draft||owned(node,actor))))error('Diese Office-Datei ist schreibgeschützt.',403);
  return {grant,node,actor};
 }
 async function getDiscovery(){if(discovery&&Date.now()-discoveryTime<3600000)return discovery;let response;try{response=await fetch(discoveryUrl,{signal:AbortSignal.timeout(10000),redirect:'error'});}catch{error('Collabora ist noch nicht erreichbar. Bitte Office-Container und Adresse prüfen.',503);}
  if(!response.ok)error('Collabora-Discovery ist nicht erreichbar.',503);if(Number(response.headers.get('content-length'))>1024*1024)error('Office-Discovery ist zu groß.',502);
  let size=0,parts=[];for await(const chunk of response.body){size+=chunk.length;if(size>1024*1024)error('Office-Discovery ist zu groß.',502);parts.push(chunk);}discovery=parseDiscovery(Buffer.concat(parts).toString('utf8'),origin);discoveryTime=Date.now();return discovery;
 }
 async function open(node,user,sid,{publicOnly=false}={}){
  node=get(node?.id);const draft=drafts.has(node?.id);if(draft)draftFor(node.id,user,sid);
  if(!isOfficeFile(node)||!(draft||(publicOnly?publicNode(node):readable(node,user))))error('Office-Datei nicht gefunden.',404);
  await bytesFor(node);const write=!!(!publicOnly&&user&&(draft||owned(node,user))),ext=path.extname(node.name).slice(1).toLowerCase(),actions=await getDiscovery();
  const action=actions.find(a=>a.ext===ext&&a.action===(write?'edit':'view'))||actions.find(a=>a.ext===ext&&a.action==='edit');if(!action)error('Dieses Dateiformat wird von Collabora nicht angeboten.',415);
  for(const[token,g]of tokens)if(g.expires<=Date.now())tokens.delete(token);if(tokens.size>=4096)error('Zu viele geöffnete Office-Sitzungen.',429);
  const token=randomBytes(32).toString('hex'),expires=Date.now()+TOKEN_TTL;
  tokens.set(token,{id:node.id,sid:sid||null,shareMode:!!user?.shareEditing,publicOnly:publicOnly||!user,write,expires,userId:user?.id||'guest-'+randomBytes(8).toString('hex'),username:user?.username||'Gast'});
  const actionUrl=new URL(action.url);actionUrl.searchParams.set('WOPISrc',wopiOrigin+'/wopi/files/'+node.id);actionUrl.searchParams.set('lang','de-DE');actionUrl.searchParams.set('closebutton','1');if(!write)actionUrl.searchParams.set('permission','readonly');
  return {url:actionUrl.href,accessToken:token,accessTokenTtl:expires,origin,writable:write,name:node.name};
 }
 async function handle(req,res,url){
  const match=url.pathname.match(/^\/wopi\/files\/([a-f0-9]{32})(\/contents)?$/);if(!match)error('Office-Datei nicht gefunden.',404);
  const [,id,contents]=match,token=url.searchParams.get('access_token')||req.headers.authorization?.replace(/^Bearer /i,'');
  const {grant,node,actor}=authorize(token,id),override=req.headers['x-wopi-override'];
  const reply=(status,data,headers={})=>{res.writeHead(status,{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...(data!==undefined?{'Content-Type':'application/json'}:{}),...headers});res.end(data===undefined?undefined:JSON.stringify(data));};
  if(req.method==='GET'){
   if(contents){const name=filePath(node),info=await fs.stat(name);if(info.size>MAX_FILE)error('Office unterstützt Dateien bis 64 MB.',413);res.writeHead(200,{'Content-Type':'application/octet-stream','Content-Length':info.size,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});const stream=createReadStream(name);res.on('close',()=>stream.destroy());stream.on('error',()=>res.destroy());stream.pipe(res);return;}
   const bytes=await bytesFor(node);return reply(200,{BaseFileName:node.name,OwnerId:node.owner,Size:bytes.length,UserId:grant.userId,UserFriendlyName:grant.username,Version:digest(bytes),UserCanWrite:!!(grant.write&&actor&&(drafts.has(id)||owned(node,actor))),ReadOnly:!grant.write,SupportsLocks:true,SupportsGetLock:true,SupportsUpdate:true,SupportsRename:false,SupportsDeleteFile:false,SupportsFileCreation:false,SupportsFolders:false,UserCanNotWriteRelative:true,PostMessageOrigin:publicOrigin,ClosePostMessage:true});
  }
  if(req.method!=='POST')error('Methode nicht erlaubt.',405);
  authorize(token,id,true);
  return runLocked('office:'+id,async()=>{
   const active=currentLock(id),provided=req.headers['x-wopi-lock'],conflict=reason=>reply(409,undefined,{'X-WOPI-Lock':active?.lock||'','X-WOPI-LockFailureReason':reason});
   if(contents){
    if(override!=='PUT')error('Unbekannte Office-Operation.',501);
    if(active?provided!==active.lock:provided||!canLock(id)||(await fs.stat(filePath(node))).size!==0)return conflict('Lock mismatch');
    if(active)active.expires=Date.now()+LOCK_TTL;
    let total=0,parts=[];for await(const chunk of req){total+=chunk.length;if(total>MAX_FILE)error('Maximal 64 MB je Office-Datei.',413);parts.push(chunk);}const bytes=Buffer.concat(parts);
    // Recheck rights and the actual host file after receiving the entire upload.
    authorize(token,id,true);if(active&&await versionFor(node)!==active.version)return conflict('File changed outside Office');
    const filename=filePath(node),temporary=filename+'.office-'+randomBytes(8).toString('hex')+'.tmp';
    try{await fs.writeFile(temporary,bytes,{flag:'wx'});await fs.rename(temporary,filename);}finally{await fs.unlink(temporary).catch(()=>{});}
    const version=digest(bytes);if(active){active.version=version;active.expires=Date.now()+LOCK_TTL;await persistLocks();}node.size=bytes.length;node.modified=new Date().toISOString();await save();return reply(200,undefined,{'X-WOPI-ItemVersion':version});
   }
   if(override==='GET_LOCK')return reply(200,undefined,{'X-WOPI-Lock':active?.lock||''});
   if(!['LOCK','REFRESH_LOCK','UNLOCK'].includes(override))error('Office-Operation wird nicht unterstützt.',501);
   if(typeof provided!=='string'||!provided||Buffer.byteLength(provided)>1024)error('Ungültige Office-Sperre.');
   if(override==='LOCK'){
    if(req.headers['x-wopi-oldlock']&&!active)return conflict('Lock mismatch');
    if(active&&(req.headers['x-wopi-oldlock']?req.headers['x-wopi-oldlock']!==active.lock:provided!==active.lock))return conflict('Lock mismatch');
    if(!active&&!canLock(id))return conflict('Explorer operation in progress');
    fileLocks.set(id,{lock:provided,expires:Date.now()+LOCK_TTL,version:active?.version||await versionFor(node)});
   }else{if(!active||active.lock!==provided)return conflict('Lock mismatch');if(override==='UNLOCK')fileLocks.delete(id);else active.expires=Date.now()+LOCK_TTL;}
   await persistLocks();return reply(200);
  });
 }
 return {enabled,origin,isOfficeFile,open,handle,assertUnlocked,newDraft,draftBytes,draftName,discardDraft,editCopy,commitCopy};
}
