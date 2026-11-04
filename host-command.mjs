import http from 'node:http';
export function hostCommand(user,value,{socket=process.env.HOST_AGENT_SOCKET}={}){
 if(!user||user.shareEditing)throw Object.assign(Error('Bitte im persönlichen Profil anmelden.'),{status:401});
 if(!socket)throw Object.assign(Error('Host-CMD ist nicht eingerichtet.'),{status:503});
 if(!value||typeof value!=='object'||Array.isArray(value))throw Object.assign(Error('Ungültige Host-Anfrage.'),{status:400});
 if(typeof value.command!=='string'||value.command.length>8192||typeof value.cwd!=='string'||value.cwd.length>4096)throw Object.assign(Error('Ungültiger Host-Befehl.'),{status:400});
 return requestHost('/execute',{command:value.command,cwd:value.cwd,confirmed:value.confirmed===true,admin:user.role==='admin'},socket);
}

export function hostTerminal(user,action,value,{socket=process.env.HOST_AGENT_SOCKET}={}){
 if(!user?.id||user.shareEditing)throw Object.assign(Error('Bitte im persönlichen Profil anmelden.'),{status:401});
 if(!socket)throw Object.assign(Error('Host-CMD ist nicht eingerichtet.'),{status:503});
 if(!value||typeof value!=='object'||Array.isArray(value))throw Object.assign(Error('Ungültige Host-Anfrage.'),{status:400});
 if(!['start','poll','cancel'].includes(action))throw Object.assign(Error('Unbekannte Terminalaktion.'),{status:404});
 if(action==='start'){if(typeof value.command!=='string'||value.command.length>8192||typeof value.cwd!=='string'||value.cwd.length>4096)throw Object.assign(Error('Ungültiger Host-Befehl.'),{status:400});}
 else if(typeof value.sessionId!=='string'||!/^[a-f0-9-]{36}$/.test(value.sessionId)||action==='poll'&&(!Number.isSafeInteger(value.offset??0)||(value.offset??0)<0||(value.offset??0)>2*1024*1024))throw Object.assign(Error('Ungültige Host-Sitzung.'),{status:400});
 return requestHost('/sessions/'+action,{owner:user.id,admin:user.role==='admin',...(action==='start'?{command:value.command,cwd:value.cwd,confirmed:value.confirmed===true}:{sessionId:value.sessionId,offset:value.offset??0})},socket);
}

export function hostFile(user,action,value,{socket=process.env.HOST_AGENT_SOCKET}={}){
 if(!user?.id||user.shareEditing||user.role!=='admin')throw Object.assign(Error('Das Host-Dateisystem erfordert ein Administratorkonto.'),{status:403});
 if(!socket)throw Object.assign(Error('Host-Dateisystem ist nicht eingerichtet.'),{status:503});
 if(!['list','stat','read','write','mkdir','rename','trash','trash-list','restore','chunk','create','upload-start','upload-chunk','upload-commit','upload-abort','upload-status'].includes(action)||!value||typeof value!=='object'||Array.isArray(value))throw Object.assign(Error('Ungültige Host-Dateiaktion.'),{status:400});
 if(!['trash-list','restore','upload-chunk','upload-commit','upload-abort','upload-status'].includes(action)&&(typeof value.path!=='string'||value.path.length>4096||!value.path.startsWith('/')||value.path.includes('\0')))throw Object.assign(Error('Ungültiger Host-Pfad.'),{status:400});
 return requestHost('/files/'+action,{...value,admin:true,owner:user.id},socket,16*1024*1024);
}

function requestHost(endpoint,data,socket,limit=2*1024*1024){
 const bytes=Buffer.from(JSON.stringify(data));
 return new Promise((resolve,reject)=>{const req=http.request({socketPath:socket,path:endpoint,method:'POST',headers:{'Content-Type':'application/json','Content-Length':bytes.length}},res=>{const chunks=[];let size=0;res.on('data',chunk=>{size+=chunk.length;if(size>limit)req.destroy(Error('Host-Ausgabe zu groß.'));else chunks.push(chunk);});res.on('end',()=>{try{const result=JSON.parse(Buffer.concat(chunks));if(res.statusCode>=400)reject(Object.assign(Error(result.error||'Host-Befehl fehlgeschlagen.'),{status:res.statusCode}));else resolve(result);}catch(error){reject(error);}});});req.setTimeout(35000,()=>req.destroy(Error('Host-Befehl hat das Zeitlimit überschritten.')));req.on('error',reject);req.end(bytes);});
}
