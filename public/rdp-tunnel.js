// Same-origin, authenticated HTTP streaming tunnel. guacd is never exposed to browsers.
export function createRdpTunnel(Guacamole,session){
 const tunnel=new Guacamole.Tunnel(),controller=new AbortController(),parser=new Guacamole.Parser();
 let closed=false,queue=[],size=0,sending=false,timer;
 function stop(message){if(closed)return;closed=true;clearTimeout(timer);controller.abort();queue=[];size=0;tunnel.setState(Guacamole.Tunnel.State.CLOSED);fetch('/api/rdp/close',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({session}),keepalive:true}).catch(()=>{});if(message)tunnel.onerror?.(new Guacamole.Status(512,message));}
 async function flush(){
  if(sending||closed)return;sending=true;
  try{while(queue.length&&!closed){let text='';while(queue.length&&text.length+queue[0].length<40000){const part=queue.shift();text+=part;size-=part.length;}if(!text)throw Error('Die Eingabe ist zu groß.');const r=await fetch('/api/rdp/input',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({session,data:text}),signal:controller.signal});if(!r.ok)throw Error((await r.json()).error||'Verbindung unterbrochen.');}}
  catch(e){if(!closed)stop(e.message);}finally{sending=false;}
 }
 parser.oninstruction=(opcode,args)=>{if(opcode===''){tunnel.setUUID(args[0]);tunnel.setState(Guacamole.Tunnel.State.OPEN);}else tunnel.oninstruction?.(opcode,args);};
 tunnel.connect=async()=>{tunnel.setState(Guacamole.Tunnel.State.CONNECTING);try{const r=await fetch('/api/rdp/stream?session='+encodeURIComponent(session),{signal:controller.signal});if(!r.ok)throw Error((await r.json()).error||'Verbindung fehlgeschlagen.');const reader=r.body.getReader(),decoder=new TextDecoder();while(!closed){const {value,done}=await reader.read();if(done)break;parser.receive(decoder.decode(value,{stream:true}));}if(!closed)stop();}catch(e){if(!closed)stop(e.message);}};
 tunnel.sendMessage=(...args)=>{if(closed||!tunnel.isConnected())return;const part=Guacamole.Parser.toInstruction(args);size+=part.length;if(size>512000){stop('Die Verbindung verarbeitet Eingaben zu langsam.');return;}queue.push(part);if(!timer)timer=setTimeout(()=>{timer=null;flush();},10);};
 tunnel.disconnect=()=>stop();return tunnel;
}
