import{createMediaLoad,isHLS}from'./public/media-load.js';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {EventEmitter} from 'node:events';
import {PassThrough} from 'node:stream';
import {createTranscoder,transcodeArguments,transcodeOptions} from './media-transcode.mjs';
import {needsTranscoding} from './public/media-source.js';

test('Medien-Fallback lässt MP4 direkt laufen und behandelt unsichere MKV-Unterstützung',()=>{
 assert.equal(needsTranscoding('Video.mp4',()=> 'probably'),false);
 assert.equal(needsTranscoding('Video.mkv',()=> 'maybe'),true);
 assert.equal(needsTranscoding('Video.mkv',()=> ''),true);
 assert.equal(needsTranscoding('Video.mkv',()=> 'probably'),false);
 const options=transcodeOptions({FFMPEG_THREADS:'999',FFMPEG_MAX_WIDTH:'1920'}),args=transcodeArguments('Test.mkv',false,options);
 assert.equal(options.threads,2);assert.equal(options.width,1920);assert.ok(args.includes('libx264'));assert.ok(args.some(a=>a.includes('format=yuv420p')));assert.ok(args.includes('aac'));assert.ok(args.includes('0:a:0?'));
});

test('Fehlendes FFmpeg gibt eine echte Fehlermeldung statt eines leeren 200-Streams zurück',async()=>{
 const stream=createTranscoder({spawnProcess:()=>{const child=new EventEmitter();child.stdout=new PassThrough();child.stderr=new PassThrough();child.kill=()=>{};queueMicrotask(()=>child.emit('error',Error('ENOENT')));return child;}});
 const server=http.createServer((req,res)=>stream(res,'fixture.mkv',false));await new Promise(r=>server.listen(0,'127.0.0.1',r));
 try{const response=await fetch('http://127.0.0.1:'+server.address().port);assert.equal(response.status,503);assert.match((await response.json()).error,/FFmpeg/);}finally{await new Promise(r=>server.close(r));}
});

test('Gleichzeitiges Transcoding ist begrenzt und der Platz wird nach Prozessende frei',async()=>{
 let signal,child;const spawned=new Promise(r=>signal=r);
 const stream=createTranscoder({options:{...transcodeOptions({}),maxProcesses:1},queueTimeout:30,spawnProcess:()=>{child=new EventEmitter();child.stdout=new PassThrough();child.stderr=new PassThrough();child.exitCode=null;child.kill=()=>{child.exitCode=0;};signal();return child;}});
 const server=http.createServer((req,res)=>stream(res,'fixture.mkv',false));await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
 try{const first=fetch(origin);await spawned;const busy=await fetch(origin);assert.equal(busy.status,503);child.stdout.write('mp4-test');child.exitCode=0;child.emit('close',0);const response=await first;assert.equal(response.status,200);assert.equal(await response.text(),'mp4-test');}finally{await new Promise(r=>server.close(r));}
});

test('Neue Auswahl verwirft verspätete Playlist-Ergebnisse; Schließen bricht alle Anfragen ab',async()=>{
 const loads=createMediaLoad(),old=loads.begin();let resolveOld,display='';
 const pending=new Promise(resolve=>resolveOld=resolve).then(value=>{if(old.current())display=value;});
 const current=loads.begin();assert.equal(old.signal.aborted,true);display='Neue MKV';resolveOld('Alte Playlist');await pending;assert.equal(display,'Neue MKV');
 loads.cancel();assert.equal(current.signal.aborted,true);assert.equal(current.isLatest(),false);
 assert.equal(isHLS('#EXTM3U\n#EXT-X-TARGETDURATION:6\nsegment.ts'),true);
 assert.equal(isHLS('#EXTM3U\n#EXTINF:-1,Radio\nhttps://example.test/radio.mp3'),false);
});

const until=async predicate=>{const deadline=Date.now()+2000;while(!predicate()){if(Date.now()>deadline)throw Error('Zeitlimit im Test');await new Promise(r=>setTimeout(r,2));}};
function fakeEncoder(children){const child=new EventEmitter();child.stdout=new PassThrough();child.stderr=new PassThrough();child.exitCode=null;child.signals=[];child.kill=signal=>{child.signals.push(signal);if(signal==='SIGKILL'){child.exitCode=137;child.stdout.end();child.emit('close',137);}return true;};children.push(child);return child;}
function complete(child,text){child.stdout.write(text);child.exitCode=0;child.stdout.end();child.emit('close',0);}

test('Schneller Titelwechsel beendet den alten Encoder notfalls mit SIGKILL und startet den neuesten',async()=>{
 const children=[],stream=createTranscoder({options:{...transcodeOptions({}),maxProcesses:1},terminationTimeout:20,spawnProcess:()=>fakeEncoder(children)});
 const server=http.createServer((req,res)=>stream(res,req.url,false,'user:player-1'));await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
 try{
  const old=fetch(origin+'/alt').catch(error=>error);await until(()=>children.length===1);
  const current=fetch(origin+'/neu');await until(()=>children.length===2);
  assert.deepEqual(children[0].signals,['SIGTERM','SIGKILL']);complete(children[1],'neue MP4');
  const response=await current;assert.equal(response.status,200);assert.equal(await response.text(),'neue MP4');assert.ok(await old instanceof Error);
 }finally{await new Promise(r=>server.close(r));}
});

test('Unabhängige VLC-Fenster beenden einander nicht und warten kurz auf freie Encoder',async()=>{
 const children=[],stream=createTranscoder({options:{...transcodeOptions({}),maxProcesses:1},spawnProcess:()=>fakeEncoder(children)});
 const server=http.createServer((req,res)=>stream(res,'clip.mkv',false,req.url));await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
 try{
  const first=fetch(origin+'/player-a');await until(()=>children.length===1);const second=fetch(origin+'/player-b');await new Promise(r=>setTimeout(r,20));
  assert.equal(children.length,1);assert.deepEqual(children[0].signals,[]);complete(children[0],'A');assert.equal(await(await first).text(),'A');
  await until(()=>children.length===2);complete(children[1],'B');assert.equal(await(await second).text(),'B');
 }finally{await new Promise(r=>server.close(r));}
});

test('Abgebrochene wartende Anfragen hinterlassen keinen Encoder-Auftrag',async()=>{
 const children=[],stream=createTranscoder({options:{...transcodeOptions({}),maxProcesses:1},spawnProcess:()=>fakeEncoder(children)});let requests=0;
 const server=http.createServer((req,res)=>{requests++;stream(res,'clip.mkv',false,req.url);});await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
 try{
  const first=fetch(origin+'/a');await until(()=>children.length===1);const controller=new AbortController(),waiting=fetch(origin+'/b',{signal:controller.signal}).catch(error=>error);await until(()=>requests===2);controller.abort();await waiting;await new Promise(r=>setTimeout(r,15));
  complete(children[0],'A');assert.equal(await(await first).text(),'A');await new Promise(r=>setTimeout(r,15));assert.equal(children.length,1);
 }finally{await new Promise(r=>server.close(r));}
});
