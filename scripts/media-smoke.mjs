// Run inside the built image: docker exec -i CONTAINER node --input-type=module < scripts/media-smoke.mjs
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
const temp=await mkdtemp(path.join(os.tmpdir(),'windows7-media-smoke-'));
process.env.NODE_ENV='test';process.env.DATA_DIR=path.join(temp,'metadata');process.env.EXPLORER_ROOT=path.join(temp,'Explorer');process.env.FFMPEG_ENABLED='1';
const run=(command,args)=>new Promise((resolve,reject)=>{const child=spawn(command,args,{stdio:['ignore','pipe','pipe']});let output='',error='';child.stdout.on('data',c=>output+=c);child.stderr.on('data',c=>error+=c);child.on('error',reject);child.on('close',code=>code===0?resolve(output):reject(Error(error)));});
let server;
try{
 const input=path.join(temp,'incompatible.mkv'),output=path.join(temp,'browser.mp4');
 await run('ffmpeg',['-hide_banner','-loglevel','error','-f','lavfi','-i','testsrc2=size=320x180:rate=15','-f','lavfi','-i','sine=frequency=440:sample_rate=48000','-t','3','-c:v','ffv1','-pix_fmt','yuv444p10le','-c:a','pcm_s16le',input]);
 ({server}=await import('./backend.mjs'));await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
 const setup=await fetch(origin+'/api/setup',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:'media-test',password:'disposable-media-test-2026'})});assert.equal(setup.status,200);const cookie=setup.headers.get('set-cookie').split(';')[0];
 const nodes=await(await fetch(origin+'/api/nodes?cached=1',{headers:{cookie}})).json(),folder=nodes.nodes.find(n=>n.space==='videos'&&n.system);
 const upload=await fetch(origin+'/api/upload?'+new URLSearchParams({name:'incompatible.mkv',parent:folder.id}),{method:'POST',headers:{cookie},body:await readFile(input)});assert.equal(upload.status,201);const {id}=await upload.json();
 const response=await fetch(origin+'/transcode/'+id,{headers:{cookie},signal:AbortSignal.timeout(60000)});assert.equal(response.status,200);assert.equal(response.headers.get('content-type'),'video/mp4');await writeFile(output,Buffer.from(await response.arrayBuffer()));
 const probe=JSON.parse(await run('ffprobe',['-v','error','-show_streams','-of','json',output]));
 assert.ok(probe.streams.some(s=>s.codec_name==='h264'&&s.pix_fmt==='yuv420p'));assert.ok(probe.streams.some(s=>s.codec_name==='aac'));
 assert.equal((await fetch(origin+'/transcode/'+id)).status,404);
 console.log('PASS: 10-Bit-FFV1/PCM-MKV → H.264/yuv420p + AAC; API und Dateirechte geprüft.');
}finally{if(server)await new Promise(r=>server.close(r));await rm(temp,{recursive:true,force:true});}
