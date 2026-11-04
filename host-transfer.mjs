import path from 'node:path';
import {createHash} from 'node:crypto';
import {hostFile} from './host-command.mjs';

// Paths are resolved from authorized Explorer nodes by the backend, never from
// request-supplied physical profile paths.
export async function transferHostFile({user,source,destination,name,sourceVersion,overwrite=false,version,confirmed=false,signal,authorized=()=>true,onProgress,finish=async()=>{},call=hostFile}){
 const check=()=>{signal?.throwIfAborted();if(!authorized())throw Object.assign(Error('Sitzung nicht mehr gültig.'),{status:401});};
 check();if(!user?.id||user.role!=='admin'||user.shareEditing)throw Object.assign(Error('Host-Übertragungen erfordern ein Administratorkonto.'),{status:403});
 if(typeof name!=='string'||!name||name!==name.trim()||name==='.'||name==='..'||/[\\/\x00-\x1f<>:"|?*]/.test(name)||Buffer.byteLength(name)>255)throw Object.assign(Error('Ungültiger Zielname.'),{status:400});
 const to=path.posix.join(destination.path,name);if(path.posix.normalize(source.path)===to)throw Object.assign(Error('Quelle und Ziel sind identisch.'),{status:409});
 const current=(await call(user,'stat',{path:source.path})).node;
 if(current.kind!=='file'||current.symlink)throw Object.assign(Error('Dieser Übertragungsweg unterstützt derzeit reguläre Dateien. Ordnerübertragungen sind noch im Ausbau.'),{status:400});
 const preview=await call(user,'upload-start',{path:destination.path,name,size:current.size});
 if(!confirmed)return {requiresConfirmation:true,sourceVersion:current.version,size:current.size,existing:preview.existing,preview:source.path+' → '+to};
 if(!sourceVersion||sourceVersion!==current.version)throw Object.assign(Error('Die Quelldatei wurde geändert. Bitte den Vorgang erneut starten.'),{status:409});
 let uploadId,published=false;const hash=createHash('sha256');let offset=0;
 try{
  check();({uploadId}=await call(user,'upload-start',{path:destination.path,name,size:current.size,overwrite,version,confirmed:true,...(destination.profile?{uid:destination.uid,gid:destination.gid}:{})}));
  onProgress?.({name,totalBytes:current.size,loadedBytes:0});
  do{
   check();const chunk=await call(user,'chunk',{path:source.path,version:current.version,offset});const bytes=Buffer.from(chunk.data,'base64');
   if(!bytes.length&&current.size!==0||chunk.offset!==offset+bytes.length||chunk.size!==current.size)throw Error('Die Quelldatei konnte nicht vollständig gelesen werden.');
   hash.update(bytes);check();const written=await call(user,'upload-chunk',{uploadId,offset,data:chunk.data});if(written.offset!==chunk.offset)throw Error('Ungültige Übertragungsposition.');offset=written.offset;onProgress?.({name,totalBytes:current.size,loadedBytes:offset});
  }while(offset<current.size);
  check();const latest=(await call(user,'stat',{path:source.path})).node;if(latest.version!==current.version)throw Object.assign(Error('Die Quelldatei wurde während der Übertragung geändert.'),{status:409});
  check();const result=await call(user,'upload-commit',{uploadId,digest:hash.digest('hex')});published=true;
  // Once published, finish bookkeeping even when the browser disconnects. A
  // failed source removal leaves the completed copy and the source intact.
  await finish({result,sourceVersion:current.version});return {...result,copied:true};
 }catch(error){if(published)error.message='Die Zieldatei wurde vollständig kopiert. Der Abschluss ist fehlgeschlagen: '+error.message;throw error;}
 finally{if(uploadId&&!published)await call({id:user.id,role:'admin'},'upload-abort',{uploadId}).catch(()=>{});}
}
