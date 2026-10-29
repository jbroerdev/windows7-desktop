import test from 'node:test';
import assert from 'node:assert/strict';
import Guacamole from './public/guacamole/guacamole.js';
import {createRdpTunnel} from './public/rdp-tunnel.js';
test('continuous mouse input flushes promptly and input requests stay ordered',async t=>{
 const original=globalThis.fetch,writes=[];let active=0,maxActive=0;
 globalThis.fetch=async(url,options)=>{if(url.endsWith('/input')){active++;maxActive=Math.max(maxActive,active);writes.push(JSON.parse(options.body).data);await new Promise(r=>setTimeout(r,15));active--;}return{ok:true};};t.after(()=>globalThis.fetch=original);
 const tunnel=createRdpTunnel(Guacamole,'test-session');tunnel.setState(Guacamole.Tunnel.State.OPEN);
 const interval=setInterval(()=>tunnel.sendMessage('mouse',1,2,0),2);t.after(()=>clearInterval(interval));await new Promise(r=>setTimeout(r,55));assert.ok(writes.length>0,'continuous input must be delivered before movement stops');clearInterval(interval);await new Promise(r=>setTimeout(r,40));assert.equal(maxActive,1);assert.ok(writes.every(text=>text.startsWith('5.mouse,')));tunnel.disconnect();
});
