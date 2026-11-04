// Keep output ordered while avoiding a full PRE rewrite and forced layout per line.
export function createCMDOutput(output,screen,{enqueue=queueMicrotask,frame=callback=>requestAnimationFrame(callback)}={}){
 let pending=[],queued=false,scrollQueued=false;
 function scroll(){if(scrollQueued)return;scrollQueued=true;frame(()=>{scrollQueued=false;screen.scrollTop=screen.scrollHeight;});}
 function flush(){queued=false;if(!pending.length)return;const text=pending.join('');pending=[];output.append(output.ownerDocument.createTextNode(text));scroll();}
 function replace(text=''){pending=[];output.textContent=text;scroll();}
 function print(text,format){if(text===null){replace();return;}pending.push(String(text)+(format?.raw?'':'\n'));if(!queued){queued=true;enqueue(flush);}}
 return{print,flush,replace,snapshot(){flush();return output.textContent;}};
}
