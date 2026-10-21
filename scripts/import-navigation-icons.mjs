import{execFileSync}from'node:child_process';import fs from'node:fs';
const repo=process.argv[2]||'.reference-icons';
function read(file,seen=new Set()){if(seen.has(file))throw Error('Icon link loop');seen.add(file);const bytes=execFileSync('git',['-C',repo,'show','HEAD:'+file]);if(bytes[0]===137&&bytes[1]===80)return bytes;return read(new URL(bytes.toString().trim(),'file:///'+file).pathname.slice(1),seen);}
fs.mkdirSync('public/icons/aero',{recursive:true});
for(const[name,file]of Object.entries({'nav-back':'actions/25/go-previous.png','nav-forward':'actions/25/go-next.png','nav-search':'actions/16/edit-find.png','nav-refresh':'actions/16/view-refresh1.png'}))fs.writeFileSync('public/icons/aero/'+name+'.png',read(file));
for(const[name,file]of Object.entries({documents:'folder-documents2',music:'folder-music2',pictures:'folder-pictures2',videos:'folder-videos2'}))fs.writeFileSync('public/icons/library-'+name+'-16.png',read('filesystems/16/'+file+'.png'));
console.log('Imported Windows 7 navigation artwork');
