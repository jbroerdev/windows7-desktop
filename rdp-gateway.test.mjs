import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {once} from 'node:events';
import {createHmac} from 'node:crypto';
import {rdpGateway} from './rdp-gateway.mjs';
test('RDP gateway derives identity from desktop session and cuts stream after logout',async t=>{
 const previous={url:process.env.RDP_SERVICE_URL,secret:process.env.RDP_SERVICE_SECRET},requests=[];let streamClosed=false,allowed=true;
 const secret='gateway-test-only-'.repeat(3),upstream=http.createServer(async(req,res)=>{let body='';for await(const b of req)body+=b;const actor=req.headers['x-rdp-actor'];assert.equal(req.headers['x-rdp-signature'],createHmac('sha256',secret).update([actor,req.headers['x-rdp-time'],req.method,req.url].join('\n')+'\n').update(body).digest('hex'));requests.push(JSON.parse(Buffer.from(actor,'base64url')));if(req.url.startsWith('/stream')){res.writeHead(200);res.write('stream-data');res.on('close',()=>streamClosed=true);}else res.end(JSON.stringify({ok:true}));});upstream.listen(0,'127.0.0.1');await once(upstream,'listening');process.env.RDP_SERVICE_URL='http://127.0.0.1:'+upstream.address().port;process.env.RDP_SERVICE_SECRET=secret;
 const gateway=http.createServer((req,res)=>{const user=req.headers['x-test-user']==='personal'?{id:'trusted-id',username:'Trusted Name'}:req.headers['x-test-user']==='share'?{id:'share',shareEditing:true}:null;rdpGateway({req,res,url:new URL(req.url,'http://test'),user,body:async()=>{const b=[];for await(const c of req)b.push(c);return Buffer.concat(b);},json:(s,v)=>{res.writeHead(s);res.end(JSON.stringify(v));},authorized:()=>allowed});});gateway.listen(0,'127.0.0.1');await once(gateway,'listening');
 t.after(async()=>{for(const[key,value]of [['RDP_SERVICE_URL',previous.url],['RDP_SERVICE_SECRET',previous.secret]])if(value===undefined)delete process.env[key];else process.env[key]=value;gateway.closeAllConnections();upstream.closeAllConnections();await Promise.all([new Promise(r=>gateway.close(r)),new Promise(r=>upstream.close(r))]);});
 const base='http://127.0.0.1:'+gateway.address().port;
 assert.equal((await fetch(base+'/api/rdp/profiles')).status,401);assert.equal((await fetch(base+'/api/rdp/profiles',{headers:{'x-test-user':'share'}})).status,401);assert.equal(requests.length,0);
 assert.equal((await fetch(base+'/api/rdp/sessions',{method:'POST',headers:{'x-test-user':'personal','x-rdp-actor':'spoof'},body:JSON.stringify({id:'spoof'})})).status,200);assert.deepEqual(requests[0],{id:'trusted-id',name:'Trusted Name'});
 const response=await fetch(base+'/api/rdp/stream?session=test',{headers:{'x-test-user':'personal'}}),reader=response.body.getReader();assert.equal(new TextDecoder().decode((await reader.read()).value),'stream-data');allowed=false;assert.equal((await reader.read()).done,true);await new Promise(r=>setTimeout(r,30));assert.equal(streamClosed,true);
});
