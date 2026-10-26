import {spawn} from 'node:child_process';

const integer=(value,fallback,min,max)=>{const n=Number(value);return Number.isInteger(n)&&n>=min&&n<=max?n:fallback;};
export function transcodeOptions(env=process.env){return{
 executable:env.FFMPEG_PATH||'ffmpeg',threads:integer(env.FFMPEG_THREADS,2,1,16),
 width:integer(env.FFMPEG_MAX_WIDTH,1280,160,3840),height:integer(env.FFMPEG_MAX_HEIGHT,720,90,2160),
 maxProcesses:integer(env.FFMPEG_MAX_PROCESSES,2,1,8),startupTimeout:integer(env.FFMPEG_STARTUP_TIMEOUT,30,5,120)*1000
};}
export function transcodeArguments(input,audioOnly,options=transcodeOptions()){
 const args=['-hide_banner','-loglevel','error','-nostdin','-filter_threads',String(options.threads),'-threads',String(options.threads),'-i',input];
 if(audioOnly)args.push('-map','0:a:0','-vn');
 else args.push('-map','0:v:0?','-map','0:a:0?','-sn','-dn','-c:v','libx264','-preset','ultrafast','-tune','zerolatency','-threads',String(options.threads),'-vf',`scale=w='min(${options.width},iw)':h='min(${options.height},ih)':force_original_aspect_ratio=decrease:force_divisible_by=2,format=yuv420p`,'-profile:v','main','-g','30');
 return [...args,'-c:a','aac','-b:a','128k','-ac','2','-ar','48000','-movflags','frag_keyframe+empty_moov+default_base_moof','-frag_duration','1000000','-f','mp4','pipe:1'];
}

// Bound CPU work and stop encoding as soon as the browser closes the stream.
export function createTranscoder({options=transcodeOptions(),spawnProcess=spawn,log=console.error}={}){
 let active=0;
 return function stream(res,input,audioOnly){
  if(active>=options.maxProcesses){res.writeHead(503,{'Content-Type':'application/json','Retry-After':'3'});res.end(JSON.stringify({error:'Alle Transcoding-Plätze sind belegt. Bitte kurz warten.'}));return;}
  let child;try{child=spawnProcess(options.executable,transcodeArguments(input,audioOnly,options),{stdio:['ignore','pipe','pipe']});}catch{res.writeHead(503,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'FFmpeg konnte nicht gestartet werden.'}));return;}
  active++;let started=false,done=false,errorText='';
  const finish=()=>{if(done)return;done=true;clearTimeout(timeout);active--;};
  const stop=()=>{if(child.exitCode===null)child.kill('SIGTERM');};
  const fail=(message,status=502)=>{if(res.destroyed||res.writableEnded)return;if(!res.headersSent){res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify({error:message}));}else res.destroy();};
  const timeout=setTimeout(()=>{stop();fail('FFmpeg hat innerhalb des Zeitlimits keine abspielbaren Daten geliefert.',504);},options.startupTimeout);
  res.once('close',stop);
  child.stderr.on('data',chunk=>{errorText=(errorText+chunk.toString()).slice(-4096);});
  child.stdout.once('data',()=>{started=true;clearTimeout(timeout);if(!res.headersSent)res.writeHead(200,{'Content-Type':audioOnly?'audio/mp4':'video/mp4','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});});
  child.stdout.pipe(res,{end:false});
  child.once('error',()=>{finish();fail('FFmpeg ist nicht verfügbar oder konnte nicht gestartet werden.',503);});
  child.once('close',code=>{finish();res.off('close',stop);if(code!==0){if(!res.destroyed&&errorText)log('ffmpeg:',errorText.trim());fail('Diese Datei konnte von FFmpeg nicht umgewandelt werden.');}else if(!started)fail('FFmpeg hat keine Mediendaten geliefert.');else if(!res.writableEnded)res.end();});
 };
}
