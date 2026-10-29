import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import {unzipSync} from 'fflate';
const root=path.resolve(import.meta.dirname,'..'),context=path.join(root,'.asset-cache','yt2009-build');
const response=await fetch('https://github.com/ftde0/yt2009/archive/refs/heads/main.zip');
if(!response.ok)throw Error('yt2009-Quellarchiv nicht erreichbar.');
const archive=Buffer.from(await response.arrayBuffer());
if(createHash('sha256').update(archive).digest('hex')!=='bda4a9e9c28a6f3f5b52d873085cfec43bfb5534aaca88e64efc86a46c586b0b')throw Error('Upstream wurde geändert. Quellstand prüfen und Prüfsumme bewusst aktualisieren.');
await fs.mkdir(context,{recursive:true});
for(const [name,data] of Object.entries(unzipSync(archive))){const dest=path.resolve(context,name);if(!dest.startsWith(context+path.sep))throw Error('Ungültiger Archivpfad.');if(name.endsWith('/'))await fs.mkdir(dest,{recursive:true});else{await fs.mkdir(path.dirname(dest),{recursive:true});await fs.writeFile(dest,data);}}
const run=args=>new Promise((resolve,reject)=>{const child=spawn('docker',args,{stdio:'inherit'});child.on('error',reject);child.on('exit',code=>code===0?resolve():reject(Error('Docker-Bau fehlgeschlagen: '+code)));});
await run(['build','-t','windows7-yt2009:upstream',path.join(context,'yt2009-main')]);
await run(['build','-t','windows7-youtube:local',path.join(root,'services','youtube')]);
console.log('yt2009 und Desktop-Schnittstelle sind gebaut.');
