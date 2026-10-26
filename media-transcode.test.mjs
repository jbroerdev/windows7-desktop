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
 const stream=createTranscoder({options:{...transcodeOptions({}),maxProcesses:1},spawnProcess:()=>{child=new EventEmitter();child.stdout=new PassThrough();child.stderr=new PassThrough();child.exitCode=null;child.kill=()=>{child.exitCode=0;};signal();return child;}});
 const server=http.createServer((req,res)=>stream(res,'fixture.mkv',false));await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
 try{const first=fetch(origin);await spawned;const busy=await fetch(origin);assert.equal(busy.status,503);child.stdout.write('mp4-test');child.exitCode=0;child.emit('close',0);const response=await first;assert.equal(response.status,200);assert.equal(await response.text(),'mp4-test');}finally{await new Promise(r=>server.close(r));}
});
