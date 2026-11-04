const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
export function createSpotify({desktop,getState}){let current;return{open(){
 if(current?.open){desktop.show(current.id);return current;}
 const state=getState(),d=el('dialog'),bar=el('header'),title=el('span','Spotify'),min=el('button'),max=el('button'),close=el('button'),frame=el('iframe');
 d.id='spotify-player';d.className='spotify-window';d.setAttribute('aria-label','Spotify');
 if(!document.querySelector('link[href="/spotify.css"]')){const css=el('link');css.rel='stylesheet';css.href='/spotify.css';document.head.append(css);}
 frame.title='Spotify Musikplayer';frame.allow='autoplay; encrypted-media';frame.src='/api/spotify/';bar.append(title,min,max,close);d.append(bar,frame);document.body.append(d);current=d;
 if(!state.authenticated||state.shareEditing){frame.remove();d.append(el('p','Bitte im persönlichen Desktop-Konto anmelden, um Spotify zu verwenden.'));}
 d.workspaceState=()=>({type:'spotify'});let closed=false;const cleanup=()=>{if(closed)return;closed=true;frame.remove();desktop.unregister(d.id);d.remove();current=null;};d.addEventListener('close',cleanup);d.addEventListener('cancel',e=>{e.preventDefault();d.close();});
 desktop.register(d,{bar,title,minimizeButton:min,maximizeButton:max,closeButton:close,icon:'/icons/spotify.svg',appId:'spotify',minWidth:520,minHeight:420});d.style.width='960px';d.style.height='660px';desktop.show(d.id);return d;
}};}
