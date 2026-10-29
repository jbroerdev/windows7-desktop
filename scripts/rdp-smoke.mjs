// Run inside the disposable broker container from compose.rdp-test.yaml.
import {createHmac} from 'node:crypto';
import {InstructionParser,instruction} from './protocol.mjs';
const actor=Buffer.from(JSON.stringify({id:'integration-test',name:'RDP integration test'})).toString('base64url'),secret=process.env.RDP_SERVICE_SECRET;
const call=async(url,data)=>{const time=String(Date.now()),method=data===undefined?'GET':'POST',body=data===undefined?'':JSON.stringify(data),signature=createHmac('sha256',secret).update([actor,time,method,url].join('\n')+'\n').update(body).digest('hex');return fetch('http://127.0.0.1:3003'+url,{method,headers:{'X-RDP-Actor':actor,'X-RDP-Time':time,'X-RDP-Signature':signature},...(data===undefined?{}:{body}),signal:AbortSignal.timeout(45000)});};
let session;
try{
 const response=await call('/sessions',{hostname:'test-rdp',username:'rdptest',password:'isolated-test-only',security:'tls',ignoreCertificate:true,width:1024,height:768});if(!response.ok)throw Error(await response.text());session=(await response.json()).id;
 const stream=await call('/stream?session='+session);if(!stream.ok)throw Error(await stream.text());const reader=stream.body.getReader(),decoder=new TextDecoder(),parser=new InstructionParser();let data='',sync=null,dimensions=false,drawing=false;parser.receive('',()=>{});
 while(true){const part=await reader.read();if(part.done)throw Error('RDP stream ended before display sync: '+data.slice(-1000));const text=decoder.decode(part.value,{stream:true});data+=text;parser.receive(text,values=>{if(values[0]==='error')throw Error(values[1]);if(values[0]==='sync')sync=values[1];if(values[0]==='size'&&values[1]==='0'&&Number(values[2])>0)dimensions=true;if(['img','rect','copy'].includes(values[0]))drawing=true;});if(sync){await call('/input',{session,data:instruction('sync',sync)});sync=null;if(dimensions&&drawing)break;}if(data.length>8*1024*1024)throw Error('Display did not synchronize');}
 const input=await call('/input',{session,data:'3.key,2.65,1.1;3.key,2.65,1.0;'});if(!input.ok)throw Error('Keyboard input failed');console.log('PASS: real xrdp login, Guacamole display synchronization and keyboard input');await reader.cancel();
}finally{if(session)await call('/close',{session}).catch(()=>{});}
