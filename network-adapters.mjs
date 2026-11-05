import fs from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import http from 'node:http';

const fail=(message,status=400)=>{throw Object.assign(Error(message),{status});};
const own=(value,key)=>Object.prototype.hasOwnProperty.call(value,key);
function object(value,keys){if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(key=>!keys.includes(key)))fail('Ungültige Netzwerkanfrage.');return value;}
const identifier=value=>typeof value==='string'&&/^[a-zA-Z0-9_.:-]{1,128}$/.test(value);
const token=value=>typeof value==='string'&&/^[a-f0-9-]{36}$/.test(value);

/** Server-wide display aliases; these never rename a Linux interface or change connectivity. */
export function createNetworkAliasStore(file){
 let queue=Promise.resolve();
 async function read(){try{const bytes=await fs.readFile(file);if(bytes.length>256*1024)throw Error('Alias-Speicher zu groß.');const raw=JSON.parse(bytes.toString('utf8'));if(!raw||raw.version!==1||!Number.isSafeInteger(raw.revision)||raw.revision<0||!raw.aliases||typeof raw.aliases!=='object'||Array.isArray(raw.aliases)||Object.keys(raw.aliases).length>1024)throw Error('Ungültiger Alias-Speicher.');const aliases={};for(const [id,value]of Object.entries(raw.aliases)){if(!identifier(id)||typeof value!=='string'||!value.trim()||value.length>80||/[\x00-\x1f\x7f]/.test(value))throw Error('Ungültiger gespeicherter Adapteranzeigename.');Object.defineProperty(aliases,id,{value,enumerable:true,writable:true,configurable:true});}return{version:1,revision:raw.revision,aliases};}catch(error){if(error.code==='ENOENT')return{version:1,revision:0,aliases:{}};throw error;}}
 function update(id,label,expectedRevision,authorized){
  const run=async()=>{if(!authorized())fail('Das Profil wurde gewechselt.',409);const current=await read();if(!authorized())fail('Das Profil wurde gewechselt.',409);if(current.revision!==expectedRevision)fail('Adapteranzeigenamen wurden zwischenzeitlich geändert.',409);const aliases={...current.aliases};if(label)Object.defineProperty(aliases,id,{value:label,enumerable:true,writable:true,configurable:true});else delete aliases[id];if(Object.keys(aliases).length>1024||current.revision===Number.MAX_SAFE_INTEGER)fail('Alias-Speicher ist voll.',409);const next={version:1,revision:current.revision+1,aliases};await fs.mkdir(path.dirname(file),{recursive:true});const temp=file+'.'+randomUUID()+'.tmp';try{await fs.writeFile(temp,JSON.stringify(next),{mode:0o600});if(!authorized())fail('Das Profil wurde gewechselt.',409);await fs.rename(temp,file);}finally{await fs.unlink(temp).catch(error=>{if(error.code!=='ENOENT')throw error;});}return next;};
  const result=queue.catch(()=>{}).then(run);queue=result;return result;
 }
 return{read,update};
}

/** Central routing supplies a server-derived actor and a live session/profile guard.
 * Construct one service per process; call handle separately for each request.
 * snapshot/detail => actual Linux values; unavailable values must remain null.
 */
export function requestNetworkHost(kind,body,{socket=process.env.HOST_AGENT_SOCKET}={}){
 if(!['snapshot','diagnose'].includes(kind))fail('OS-Netzwerkänderungen sind noch nicht freigegeben.',501);
 if(!socket)fail('Host-Netzwerkdienst ist nicht eingerichtet.',503);
 const bytes=Buffer.from(JSON.stringify(body));
 return new Promise((resolve,reject)=>{
  const req=http.request({socketPath:socket,path:'/network/'+kind,method:'POST',headers:{'Content-Type':'application/json','Content-Length':bytes.length}},res=>{
   const chunks=[];let size=0;
   res.on('data',chunk=>{size+=chunk.length;if(size>2*1024*1024)req.destroy(Error('Host-Ausgabe zu groß.'));else chunks.push(chunk);});
   res.on('error',reject);res.on('aborted',()=>reject(Error('Host-Antwort abgebrochen.')));
   res.on('end',()=>{try{const result=JSON.parse(Buffer.concat(chunks));if(res.statusCode>=400)reject(Object.assign(Error(result.error||'Host-Netzwerkaktion fehlgeschlagen.'),{status:res.statusCode}));else resolve(result);}catch(error){reject(error);}});
  });
  req.setTimeout(35000,()=>req.destroy(Error('Host-Netzwerkaktion hat das Zeitlimit überschritten.')));req.on('error',reject);req.end(bytes);
 });
}

export function createNetworkAdapters({host=requestNetworkHost,configurationProvider,aliasStore}={}){
 async function handle({action,value={},actor,authorized}={}){
  const assert=()=>{if(!actor?.id||actor.authenticated===false||actor.shareEditing||actor.readonly)fail('Bitte im persönlichen Profil anmelden.',401);if(actor.role!=='admin')fail('Adapterverwaltung erfordert Administratorrechte.',403);if(typeof authorized!=='function'||!authorized())fail('Das persönliche Profil wurde gewechselt.',409);};
  assert();const owner=String(actor.id);if(!identifier(owner))fail('Ungültiges persönliches Profil.',401);
  const invoke=async(kind,body)=>{assert();if(typeof host!=='function')fail('Host-Netzwerkdienst ist nicht eingerichtet.',503);const result=await host(kind,{...body,owner,admin:true});assert();return result;};
  const snapshot=async()=>{const result=await invoke('snapshot',{});if(!result||result.schemaVersion!==1||result.scope!=='host'||!Array.isArray(result.adapters)||result.adapters.length>1024||typeof result.revision!=='string'||!/^[a-f0-9]{64}$/.test(result.revision)||typeof result.generatedAt!=='string'||!result.capabilities||result.adapters.some(item=>!identifier(item?.id)||typeof item.name!=='string'))fail('Ungültige Host-Netzwerkantwort.',502);return result;};
  if(action==='snapshot'||action==='detail'){
   object(value,action==='detail'?['adapterId']:[]);if(action==='detail'&&!identifier(value.adapterId))fail('Ungültiger Adapter.');
   const result=await snapshot();
   const preferences=aliasStore?await aliasStore.read():{revision:0,aliases:{}};assert();const adapters=result.adapters.map(item=>({...item,displayName:own(preferences.aliases,item.id)?preferences.aliases[item.id]:item.name}));
   if(action==='detail'){const adapter=adapters.find(item=>item.id===value.adapterId);if(!adapter)fail('Adapter nicht mehr vorhanden.',404);return{schemaVersion:1,scope:'host',generatedAt:result.generatedAt,revision:result.revision,aliasRevision:preferences.revision,adapter,capabilities:{...result.capabilities,setDisplayName:!!aliasStore}};}
   return{...result,adapters,aliasRevision:preferences.revision,capabilities:{...result.capabilities,setDisplayName:!!aliasStore}};
  }
  if(action==='label'){
   object(value,['adapterId','displayName','expectedRevision']);if(!identifier(value.adapterId)||typeof value.displayName!=='string'||value.displayName.trim().length>80||/[\x00-\x1f\x7f]/.test(value.displayName)||!Number.isSafeInteger(value.expectedRevision)||value.expectedRevision<0)fail('Ungültiger Adapteranzeigename.');if(!aliasStore)fail('Adapteranzeigenamen können nicht gespeichert werden.',503);
   const inventory=await snapshot();if(!inventory.adapters.some(item=>item.id===value.adapterId))fail('Adapter nicht mehr vorhanden.',404);const result=await aliasStore.update(value.adapterId,value.displayName.trim(),value.expectedRevision,()=>{try{assert();return true;}catch{return false;}});assert();return{revision:result.revision,adapterId:value.adapterId,displayName:value.displayName.trim()||null,scope:'web-display-name'};
  }
  if(action==='diagnose'){
   object(value,['kind','target']);if(!['ping','dns'].includes(value.kind)||typeof value.target!=='string'||value.target.length>253||!/^[a-zA-Z0-9][a-zA-Z0-9.:-]*$/.test(value.target))fail('Bitte einen Hostnamen oder eine IP-Adresse angeben.');const result=await invoke('diagnose',{kind:value.kind,target:value.target});if(!result||result.kind!==value.kind||result.target!==value.target||typeof result.output!=='string'||Buffer.byteLength(result.output)>1024*1024||!Number.isInteger(result.exitCode))fail('Ungültige Host-Diagnoseantwort.',502);return{...result,scope:'host',internetConnectivity:'not-tested'};
  }
  if(action==='prepare'){
   object(value,['adapterId','expectedRevision','settings']);if(!identifier(value.adapterId)||typeof value.expectedRevision!=='string'||!/^[a-f0-9]{64}$/.test(value.expectedRevision))fail('Ungültige Adapterrevision.');object(value.settings,['ipv4Method','address','prefixLength','gateway','dnsMode','dnsServers','mtu']);if(typeof configurationProvider!=='function')fail('OS-Netzwerkänderungen sind noch nicht freigegeben.',501);assert();const result=await configurationProvider(actor,'prepare',{adapterId:value.adapterId,expectedRevision:value.expectedRevision,settings:value.settings});assert();return result;
  }
  if(['apply','confirm','rollback','status'].includes(action)){
   object(value,action==='apply'||action==='confirm'?['token','confirmed']:['token']);if(!token(value.token))fail('Ungültiger Netzwerkauftrag.');if(['apply','confirm'].includes(action)&&value.confirmed!==true)fail('Netzwerkänderung muss ausdrücklich bestätigt werden.',409);if(typeof configurationProvider!=='function')fail('OS-Netzwerkänderungen sind noch nicht freigegeben.',501);assert();const result=await configurationProvider(actor,action,{token:value.token,...(['apply','confirm'].includes(action)?{confirmed:true}:{})});assert();return result;
  }
  fail('Unbekannte Netzwerkaktion.',404);
 }
 return{handle};
}
