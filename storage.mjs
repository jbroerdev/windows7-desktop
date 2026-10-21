import fs from 'node:fs';
import path from 'node:path';
import{randomBytes}from'node:crypto';

// Both local and Docker storage mirror the Explorer directory tree.
// An omitted root is supported only for legacy ID-based storage.
export function createStorage({root,metadataDir,db}){
const pending=new Map();
if(!root)return{enabled:false,path:n=>path.join(metadataDir,'files',n.id),sync(){},register(){},release(){},refresh(){return false;},initialize(){return false;}};
root=path.resolve(root);const usersRoot=path.join(root,'Users');
function inside(base,target){const relative=path.relative(base,target);if(relative==='..'||relative.startsWith('..'+path.sep)||path.isAbsolute(relative))throw Error('Speicherpfad außerhalb von /Explorer/Users.');}
function safeSegment(name){if(typeof name!=='string'||!name||name==='.'||name==='..'||/[\\/\x00-\x1f]/.test(name))throw Error('Ungültiger Speicherpfad.');return name;}
function noLinks(target){inside(root,target);let current=root;for(const component of ['',...path.relative(root,target).split(path.sep).filter(Boolean)]){if(component)current=path.join(current,component);if(fs.existsSync(current)&&fs.lstatSync(current).isSymbolicLink())throw Error('Symbolische Links sind im Explorer-Speicher nicht erlaubt.');}}
function userPath(user){const dest=path.join(usersRoot,safeSegment(user.username));inside(usersRoot,dest);noLinks(dest);return dest;}
function physical(n){const user=db.users.find(u=>u.id===n.owner);if(!user)throw Error('Datei hat keinen gültigen Besitzer.');const segments=[],seen=new Set();let current=n;while(current){if(seen.has(current.id))throw Error('Zyklischer Ordnerpfad.');seen.add(current.id);segments.unshift(safeSegment(current.name));if(current.programRoot){const dest=path.resolve(root,...segments);inside(path.join(root,'Programme'),dest);noLinks(dest);return dest;}if(!current.parent)break;current=db.nodes.find(x=>x.id===current.parent)||pending.get(current.parent);if(!current||current.owner!==user.id&&!current.programRoot)throw Error('Ungültiger Elternordner.');}const dest=path.resolve(userPath(user),...segments);inside(userPath(user),dest);noLinks(dest);return dest;}
function ensureFolder(folder){noLinks(folder);fs.mkdirSync(folder,{recursive:true});}
function synchronize(){ensureFolder(usersRoot);for(const user of db.users)ensureFolder(userPath(user));for(const n of db.nodes.filter(n=>n.kind==='folder'))ensureFolder(physical(n));}
function refresh(){let changed=false;
function scan(user,parent,folder){noLinks(folder);if(!fs.existsSync(folder))return;for(const entry of fs.readdirSync(folder,{withFileTypes:true})){const actual=path.join(folder,entry.name);if(entry.isSymbolicLink()||!entry.isFile()&&!entry.isDirectory()||entry.name.trim()!==entry.name||entry.name.length>180||/[\\/\x00-\x1f]/.test(entry.name))continue;let node=db.nodes.find(n=>(parent!==null||n.owner===user.id)&&n.parent===parent&&n.name===entry.name);if(node?.kind==='link')continue;if(!node){node={id:randomBytes(16).toString('hex'),owner:user.id,parent,name:entry.name,kind:entry.isDirectory()?'folder':'file',space:parent?db.nodes.find(n=>n.id===parent)?.space||'home':'home',created:new Date().toISOString(),shared:false};db.nodes.push(node);changed=true;}if(entry.isDirectory()&&node.kind==='folder')scan(db.users.find(u=>u.id===node.owner)||user,node.id,actual);else if(entry.isFile()&&node.kind==='file'){const info=fs.lstatSync(actual);if(!info.isFile())continue;const size=info.size;if(node.size!==size){node.size=size;changed=true;}}}}
for(const user of db.users)scan(user,null,userPath(user));const programs=db.nodes.find(n=>n.programRoot);if(programs){const user=db.users.find(u=>u.id===programs.owner);if(user)scan(user,programs.id,physical(programs));}return changed;}
return{enabled:true,
path(n){const dest=physical(n);if(n.kind==='file')ensureFolder(path.dirname(dest));return dest;},
register(nodes){for(const n of nodes)pending.set(n.id,n);},release(nodes){for(const n of nodes)pending.delete(n.id);},sync:synchronize,refresh,
initialize(){synchronize();
// Retain the legacy ID files as a fallback backup, and never overwrite a host file.
for(const n of db.nodes.filter(n=>n.kind==='file')){const dest=physical(n),previousTree=path.join(metadataDir,'Explorer',path.relative(root,dest)),legacy=fs.existsSync(previousTree)?previousTree:path.join(metadataDir,'files',n.id);if(!fs.existsSync(dest)&&fs.existsSync(legacy)){if(fs.lstatSync(legacy).isSymbolicLink())throw Error('Symbolische Links werden nicht übernommen.');ensureFolder(path.dirname(dest));fs.copyFileSync(legacy,dest,fs.constants.COPYFILE_EXCL);}}
return refresh();}
};}
