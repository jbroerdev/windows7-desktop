// The server owns process lifetime; browser reconnects use an opaque output cursor.
export function createHostTerminal({api,confirm,onState=()=>{},storage,key=()=>null,sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms))}){
 let active=null;
 const saved=()=>{try{const value=JSON.parse(storage?.getItem(key())||'null');return value&&typeof value.sessionId==='string'&&typeof value.cwd==='string'?{...value,offset:0}:null;}catch{return null;}};
 const save=()=>{const state=active?{...active}:null;try{const name=key();if(name&&storage){if(state)storage.setItem(name,JSON.stringify({sessionId:state.sessionId,cwd:state.cwd}));else storage.removeItem(name);}}catch{}onState(state);};
 async function cancel(){if(active)await api('/api/host-terminal/cancel',{sessionId:active.sessionId});}
 async function follow(state,{signal,onOutput=()=>{}}={}){
   active={...state};save();let failures=0;
   const abort=()=>{cancel().catch(()=>{});};signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)abort();
   try{
     for(;;){
       let result;
       try{result=await api('/api/host-terminal/poll',{sessionId:active.sessionId,offset:active.offset||0});failures=0;}
       catch(error){if([401,403,404].includes(error.status)){active=null;save();throw error;}if(++failures>3)throw error;await sleep(500*failures);continue;}
       if(result.output)onOutput(result.output);
       active.offset=result.offset;active.cwd=result.cwd;save();
       if(!result.more&&!['starting','running'].includes(result.status)){active=null;save();return{handled:true,cwd:result.cwd,exitCode:result.exitCode,status:result.status};}
       if(!result.more)await sleep(200);
     }
   }finally{signal?.removeEventListener('abort',abort);}
 }
 return{
   snapshot:()=>active?{...active}:null,saved,cancel,
   async run(command,cwd,context={}){
     if(active)throw Error('Eine Host-Sitzung ist noch offen. Bitte zuerst fortsetzen oder abbrechen.');
     if(context.signal?.aborted)throw Error('^C');
     let result=await api('/api/host-terminal/start',{command,cwd});
     if(result.requiresConfirmation){
       if(!await confirm(result.preview))return{handled:true,output:'Befehl abgebrochen.',exitCode:130};
       if(context.signal?.aborted)throw Error('^C');
       result=await api('/api/host-terminal/start',{command,cwd,confirmed:true});
     }
     if(!result.sessionId)return{...result,handled:true};
     return follow({sessionId:result.sessionId,offset:0,cwd:result.cwd},context);
   },
   async resume(state,context={}){if(active&&active.sessionId!==state.sessionId)throw Error('Es läuft bereits eine andere Host-Sitzung.');return follow(state,context);}
 };
}
