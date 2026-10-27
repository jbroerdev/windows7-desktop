export function createDesktopPreloader({getState,api}){
 let explorer=null,shell=null,owner=null,started=false;const hints=[];
 function dispose(){shell?.remove();shell=null;explorer=null;for(const hint of hints)hint.remove();hints.length=0;started=false;owner=null;}
 function start(){const state=getState();if(started||!state.authenticated||state.shareEditing)return;started=true;owner=state.userId;
  explorer=document.createElement('iframe');explorer.hidden=true;explorer.title='Explorer wird vorbereitet';explorer.dataset.preloadedExplorer='';explorer.src='/app-instance?app=explorer';shell=document.createElement('dialog');shell.append(explorer);document.body.append(shell);
  if(state.officeEnabled)api('/api/office-preload').then(info=>{if(!started||getState().userId!==owner)return;for(const href of info.assets||[]){const url=new URL(href);if(url.origin!==info.origin||!url.pathname.startsWith('/browser/'))continue;const hint=document.createElement('link');hint.rel='prefetch';hint.href=url.href;hint.dataset.officePreload='';document.head.append(hint);hints.push(hint);}}).catch(()=>{});
 }
 function takeExplorer(){if(!explorer||owner!==getState().userId||!explorer.contentWindow?.workspaceReady)return null;const frame=explorer;explorer=null;shell=null;frame.hidden=false;delete frame.dataset.preloadedExplorer;return frame;}
 return{start,takeExplorer,dispose};
}
