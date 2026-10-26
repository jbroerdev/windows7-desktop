export function createComputerManagement({db,id,fail,makeUser,sessions,save,get,fullPath,owner}) {
 if(!Array.isArray(db.groups))db.groups=[];
 const users=()=>db.users.filter(u=>!u.deleted&&!u.sharedWorkspace);
 const groups=()=>[{id:'admin',name:'Administratoren',description:'Vollzugriff auf die Webverwaltung',builtin:true},{id:'user',name:'Benutzer',description:'Standardbenutzer',builtin:true},...db.groups];
 const view=()=>({users:users().map(u=>({id:u.id,username:u.username,fullName:u.fullName||'',description:u.description||'',disabled:!!u.disabled,role:u.role,avatar:u.avatar,groups:[u.role,...db.groups.filter(g=>g.members.includes(u.id)).map(g=>g.id)]})),groups:groups().map(g=>({...g,members:g.builtin?users().filter(u=>u.role===g.id).map(u=>u.id):g.members})),shareEnabled:db.shareEnabled!==false});
 const text=(value,max=250)=>{if(typeof value!=='string'||value.length>max||/[\x00-\x1f]/.test(value))fail('Ungültige Kontoeigenschaft.');return value.trim();};
 const revoke=uid=>{for(const[token,s]of sessions)if(s.userId===uid)sessions.delete(token);};
 function validateAdmins(changes){if(!users().some(u=>{const next=changes.get(u.id)||u;return !next.deleted&&!next.disabled&&next.role==='admin';}))fail('Mindestens ein aktiver Administrator muss erhalten bleiben.');}
 return {async handle(method,data,actor){
 if(!actor)fail('Bitte zuerst anmelden.',401);
 if(actor.role!=='admin'||actor.shareEditing)fail('Nur Administratoren im eigenen Profil können die Computerverwaltung verwenden.',403);
 if(method==='GET')return view();
 if(method!=='POST')fail('Methode nicht erlaubt.',405);
 const action=data.action;
 if(action==='user-create'){
  const fullName=text(data.fullName||''),description=text(data.description||'');
  const role=data.role==='admin'?'admin':'user';const u=makeUser(data.username,data.password,role);Object.assign(u,{fullName,description});
 }else if(action==='user-update'||action==='user-delete'){
  const u=users().find(u=>u.id===data.id);if(!u)fail('Benutzer nicht gefunden.',404);
  const deleting=action==='user-delete';const next={...u};
  if(deleting)next.deleted=true;else {next.fullName=text(data.fullName??u.fullName??'');next.description=text(data.description??u.description??'');if(data.role!==undefined){if(!['admin','user'].includes(data.role))fail('Ungültige Kontogruppe.');next.role=data.role;}if(data.disabled!==undefined)next.disabled=data.disabled===true;}
  if(u.id===actor.id&&(next.deleted||next.disabled))fail('Das eigene Konto kann nicht deaktiviert oder gelöscht werden.');
  if(data.groups!==undefined&&(!Array.isArray(data.groups)||data.groups.some(gid=>!db.groups.some(g=>g.id===gid))))fail('Ungültige Gruppenmitgliedschaft.');
  validateAdmins(new Map([[u.id,next]]));Object.assign(u,next);if(!deleting&&data.groups!==undefined)for(const g of db.groups){g.members=g.members.filter(uid=>uid!==u.id);if(data.groups.includes(g.id))g.members.push(u.id);}if(u.deleted||u.disabled||u.role!==actor.role&&u.id===actor.id)revoke(u.id);
  if(deleting){for(const g of db.groups)g.members=g.members.filter(uid=>uid!==u.id);for(const r of db.folderAcl)r.users=r.users?.filter(uid=>uid!==u.id);}
 }else if(action==='group-save'){
  const g=data.id?groups().find(g=>g.id===data.id):null;if(data.id&&!g)fail('Gruppe nicht gefunden.',404);
  const members=Array.isArray(data.members)?[...new Set(data.members)]:[];if(members.some(uid=>!users().some(u=>u.id===uid)))fail('Ungültiges Gruppenmitglied.');
  if(g?.builtin){
   const changes=new Map(users().map(u=>[u.id,{...u,role:members.includes(u.id)?g.id:u.role===g.id?(g.id==='admin'?'user':'admin'):u.role}]));
   validateAdmins(changes);for(const u of users())Object.assign(u,changes.get(u.id));
  }else{
   const name=text(data.name,60),description=text(data.description||'');if(!name||/[\\/]/.test(name))fail('Ungültiger Gruppenname.');if(groups().some(x=>x.id!==g?.id&&x.name.toLowerCase()===name.toLowerCase()))fail('Gruppenname bereits vorhanden.',409);
   if(g)Object.assign(g,{name,description,members});else db.groups.push({id:id(),name,description,members});
  }
 }else if(action==='group-delete'){
  const g=db.groups.find(g=>g.id===data.id);if(!g)fail('Systemgruppen können nicht gelöscht werden.',400);db.groups=db.groups.filter(x=>x.id!==g.id);for(const r of db.folderAcl)r.groups=r.groups?.filter(gid=>gid!==g.id);
 }else fail('Unbekannte Verwaltungsaktion.');
 await save();return view();
 },groups};
}
