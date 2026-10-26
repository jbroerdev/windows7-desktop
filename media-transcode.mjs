import {spawn} from 'node:child_process';

const integer=(value,fallback,min,max)=>{const n=Number(value);return Number.isInteger(n)&&n>=min&&n<=max?n:fallback;};
export function transcodeOptions(env=process.env){return{
 executable:env.FFMPEG_PATH||'ffmpeg',threads:integer(env.FFMPEG_THREADS,2,1,16),
 width:integer(env.FFMPEG_MAX_WIDTH,1280,160,3840),height:integer(env.FFMPEG_MAX_HEIGHT,720,90,2160),
 maxProcesses:integer(env.FFMPEG_MAX_PROCESSES,2,1,8),startupTimeout:integer(env.FFMPEG_STARTUP_TIMEOUT,30,5,120)*1000
};}
export function transcodeArguments(input,audioOnly,options=transcodeOptions()){
 const args=['-hide_banner','-loglevel','error','-nostdin','-filter_threads',String(options.threads),'-threads',String(options.threads),...(Number.isFinite(options.startSeconds)&&options.startSeconds>0?['-ss',String(Math.min(options.startSeconds,604800))]:[]),'-i',input];
 if(audioOnly)args.push('-map','0:a:0','-vn');
 else args.push('-map','0:v:0?','-map','0:a:0?','-sn','-dn','-c:v','libx264','-preset','ultrafast','-tune','zerolatency','-threads',String(options.threads),'-vf',`scale=w='min(${options.width},iw)':h='min(${options.height},ih)':force_original_aspect_ratio=decrease:force_divisible_by=2,format=yuv420p`,'-profile:v','main','-g','30');
 return [...args,'-c:a','aac','-b:a','128k','-ac','2','-ar','48000','-movflags','frag_keyframe+empty_moov+default_base_moof','-frag_duration','1000000','-f','mp4','pipe:1'];
}

// Each player owns at most one current job. Other player windows remain independent.
export function createTranscoder({options=transcodeOptions(),spawnProcess=spawn,log=console.error,terminationTimeout=1500,queueTimeout=5000,maxQueue=16}={}){
 let active=0;const queue=[],owners=new Map();
 const reply=(res,message,status=503)=>{if(res.destroyed||res.writableEnded)return;if(res.headersSent){res.destroy();return;}res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','Retry-After':'2'});res.end(JSON.stringify({error:message}));};
 const forget=job=>{if(job.ownerKey&&owners.get(job.ownerKey)===job)owners.delete(job.ownerKey);};
 function pump(){while(active<options.maxProcesses&&queue.length){const job=queue.shift();if(!job.cancelled&&!job.res.destroyed)start(job);}}
 function cancel(job,destroy=true){
 if(job.cancelled||job.done)return;job.cancelled=true;clearTimeout(job.waitTimer);clearTimeout(job.startTimer);forget(job);
 const index=queue.indexOf(job);if(index>=0)queue.splice(index,1);
 if(destroy&&!job.res.destroyed)job.res.destroy();
 if(job.child){job.child.stdout.unpipe(job.res);job.child.stdout.resume();job.child.kill('SIGTERM');if(!job.done)job.killTimer=setTimeout(()=>{if(!job.done)job.child.kill('SIGKILL');},terminationTimeout);job.killTimer?.unref?.();}
 }
 function finish(job){if(job.done)return;job.done=true;clearTimeout(job.startTimer);clearTimeout(job.killTimer);job.res.off('close',job.onClose);active--;forget(job);pump();}
 function start(job){
 clearTimeout(job.waitTimer);active++;
 const {res,input,audioOnly}=job;let child;
 try{child=job.child=spawnProcess(options.executable,transcodeArguments(input,audioOnly,{...options,startSeconds:job.startSeconds}),{stdio:['ignore','pipe','pipe']});}catch{finish(job);reply(res,'FFmpeg konnte nicht gestartet werden.');return;}
 let started=false,errorText='';
 job.startTimer=setTimeout(()=>{cancel(job,false);reply(res,'FFmpeg hat innerhalb des Zeitlimits keine abspielbaren Daten geliefert.',504);},options.startupTimeout);
 child.stderr.on('data',chunk=>{errorText=(errorText+chunk.toString()).slice(-4096);});
 child.stdout.once('data',()=>{if(job.cancelled||res.destroyed)return;started=true;clearTimeout(job.startTimer);if(!res.headersSent)res.writeHead(200,{'Content-Type':audioOnly?'audio/mp4':'video/mp4','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});});
 child.stdout.pipe(res,{end:false});
 child.once('error',()=>{finish(job);reply(res,'FFmpeg ist nicht verfügbar oder konnte nicht gestartet werden.');});
 child.once('close',code=>{finish(job);if(job.cancelled)return;if(code!==0){if(!res.destroyed&&errorText)log('ffmpeg:',errorText.trim());reply(res,'Diese Datei konnte von FFmpeg nicht umgewandelt werden.',502);}else if(!started)reply(res,'FFmpeg hat keine Mediendaten geliefert.',502);else if(!res.writableEnded)res.end();});
 }
 return function stream(res,input,audioOnly,ownerKey=null,startSeconds=0){
 if(ownerKey&&owners.has(ownerKey))cancel(owners.get(ownerKey));
 const job={res,input,audioOnly,ownerKey,startSeconds,cancelled:false,done:false};job.onClose=()=>cancel(job);res.once('close',job.onClose);if(ownerKey)owners.set(ownerKey,job);
 if(active<options.maxProcesses){start(job);return;}
 if(queue.length>=maxQueue){forget(job);job.done=true;reply(res,'Alle Transcoding-Plätze sind belegt. Bitte kurz warten.');return;}
 queue.push(job);job.waitTimer=setTimeout(()=>{const index=queue.indexOf(job);if(index>=0)queue.splice(index,1);forget(job);job.done=true;reply(res,'Alle Transcoding-Plätze sind belegt. Bitte einen anderen Player schließen und erneut starten.');},queueTimeout);
 };
}
