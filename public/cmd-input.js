export function readCMDLine({screen,mainForm,dialog,question,signal,onAnswer=()=>{},document:doc=globalThis.document}){
 return new Promise((resolve,reject)=>{
  if(signal?.aborted){reject(Error('^C'));return;}
  const form=doc.createElement('form'),label=doc.createElement('span'),input=doc.createElement('input'),priorDisplay=mainForm.style.display;let settled=false;
  form.className='cmd-line-input';label.textContent=question;input.type='text';input.autocomplete='off';input.spellcheck=false;input.setAttribute('aria-label',question);form.append(label,input);mainForm.style.display='none';screen.append(form);
  function finish(error,value){if(settled)return;settled=true;signal?.removeEventListener('abort',abort);dialog.removeEventListener('close',abort);form.remove();mainForm.style.display=priorDisplay;if(error)reject(error);else{onAnswer(question+value);resolve(value);}}
  const abort=()=>finish(Error('^C'));signal?.addEventListener('abort',abort,{once:true});dialog.addEventListener('close',abort,{once:true});
  form.addEventListener('submit',event=>{event.preventDefault();event.stopPropagation();finish(null,input.value);});input.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();input.value='';}});
  input.focus();screen.scrollTop=screen.scrollHeight;
 });
}

export function handleCMDAbortKey(event,{dialog,commandInput,cancel,cancelHost=()=>{}}){
 if(!dialog.open||!dialog.classList.contains('active-window')||!event.ctrlKey||!['c','pause','cancel'].includes(String(event.key||'').toLowerCase())||!commandInput.disabled)return false;
 event.preventDefault();event.stopPropagation();cancel();cancelHost();return true;
}
