import net from 'node:net';
import {StringDecoder} from 'node:string_decoder';

export const instruction=(...values)=>values.map(v=>{const s=String(v);return [...s].length+'.'+s;}).join(',')+';';
// Handshake parsing must tolerate arbitrary TCP packet boundaries, including UTF-8.
export class InstructionParser {
 buffer=''; elements=[];
 receive(text,consume){
  this.buffer+=text;
  if(this.buffer.length>1024*1024)throw Error('Guacamole instruction too large');
  while(this.buffer){
   const dot=this.buffer.indexOf('.');if(dot<0)return;
   const prefix=this.buffer.slice(0,dot);if(!/^\d{1,7}$/.test(prefix))throw Error('Invalid instruction');
   const length=Number(prefix);if(length>512*1024)throw Error('Invalid element length');
   let end=dot+1,count=0;while(end<this.buffer.length&&count<length){const code=this.buffer.codePointAt(end);end+=code>0xffff?2:1;count++;}
   if(count<length||end>=this.buffer.length)return;
   const separator=this.buffer[end];if(separator!==','&&separator!==';')throw Error('Invalid instruction separator');
   this.elements.push(this.buffer.slice(dot+1,end));this.buffer=this.buffer.slice(end+1);
   if(this.elements.length>256)throw Error('Too many elements');
   if(separator===';'){const values=this.elements;this.elements=[];consume(values);}
  }
 }
}

export function connectGuacd({host,port,config,onReady,onData,onClose}){
 const socket=net.createConnection({host,port}),decoder=new StringDecoder('utf8'),parser=new InstructionParser();
 let ready=false,ended=false;
 const timer=setTimeout(()=>finish('Der entfernte Computer antwortet nicht.'),20000);timer.unref?.();
 function finish(message){if(ended)return;ended=true;clearTimeout(timer);socket.destroy();onClose(message);}
 socket.on('connect',()=>socket.write(instruction('select','rdp')));
 socket.on('data',chunk=>{try{
  const text=decoder.write(chunk);
  if(ready){onData(text);return;}
  parser.receive(text,values=>{
   if(ready){onData(instruction(...values));return;}
   if(values[0]==='error'){onData(instruction(...values));finish('Die Remotedesktopverbindung wurde abgelehnt.');return;}
   if(values[0]==='args'){
    const parameters={hostname:config.hostname,port:String(config.port),username:config.username,password:config.password||'',domain:config.domain||'',security:config.security,'ignore-cert':String(config.ignoreCertificate),'color-depth':String(config.colorDepth),'resize-method':'display-update','disable-copy':String(!config.clipboard),'disable-paste':String(!config.clipboard),'enable-drive':'false','enable-printing':'false','enable-audio-input':'false','disable-audio':String(!config.audio),'server-layout':'de-de-qwertz','enable-wallpaper':'true','enable-font-smoothing':'true'};
    socket.write(instruction('size',config.width,config.height,96)+instruction('audio',...(config.audio?['audio/L16;rate=44100,channels=2']:[]))+instruction('video')+instruction('image','image/png','image/jpeg')+instruction('timezone',config.timezone||'Europe/Berlin')+instruction('name',config.displayName||'Remotedesktop')+instruction('connect',...values.slice(1).map(name=>name.startsWith('VERSION_')?'VERSION_1_5_0':parameters[name]??'')));
   }else if(values[0]==='ready'){
    ready=true;clearTimeout(timer);delete config.password;onReady(values[1]);
   }
  });
  // Any partial drawing instruction following ready belongs to the display stream.
  if(ready&&(parser.buffer||parser.elements.length)){onData(parser.elements.map(v=>instruction(v).slice(0,-1)).join(',')+(parser.elements.length?',':'')+parser.buffer);parser.buffer='';parser.elements=[];}
 }catch{finish('Die Remotedesktopverbindung konnte nicht aufgebaut werden.');}});
 socket.on('error',()=>finish('Der Remotedesktop-Dienst ist nicht erreichbar.'));
 socket.on('close',()=>finish());
 return{write(text){if(!ready||ended)throw Error('Verbindung ist nicht bereit.');if(socket.writableLength>1024*1024)throw Error('Verbindung ist ausgelastet.');socket.write(text);},pause:()=>socket.pause(),resume:()=>socket.resume(),close:()=>finish()};
}
