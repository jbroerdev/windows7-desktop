let previousFocus=null;
const screen=()=>document.getElementById('session-loading');
export function showBusy(message='Bitte warten …',detail=''){
 const overlay=screen();if(!overlay)return;if(overlay.hidden)previousFocus=document.activeElement;
 overlay.hidden=false;overlay.querySelector('[data-loading-message]').textContent=message;overlay.querySelector('[data-loading-detail]').textContent=detail;document.documentElement.setAttribute('aria-busy','true');document.body.classList.add('session-busy');overlay.focus({preventScroll:true});
}
export function hideBusy(){const overlay=screen();if(!overlay)return;overlay.hidden=true;document.documentElement.removeAttribute('aria-busy');document.body.classList.remove('session-busy');if(previousFocus?.isConnected)previousFocus.focus({preventScroll:true});previousFocus=null;}
const limit=(promise,ms)=>new Promise(resolve=>{const timer=setTimeout(resolve,ms);Promise.resolve(promise).catch(()=>{}).finally(()=>{clearTimeout(timer);resolve();});});
export async function waitForDesktopAssets(){
 const wallpaper=getComputedStyle(document.body).backgroundImage.match(/url\(["']?(.*?)["']?\)/)?.[1],background=wallpaper?new Image():null;
 if(background)background.src=wallpaper;
 await Promise.all([limit(document.fonts?.ready,8000),...Array.from(document.querySelectorAll('dialog[open]')).filter(d=>d.whenReady).map(d=>limit(d.whenReady,45000)),...Array.from(document.images).filter(img=>img.loading!=='lazy'&&img.getClientRects().length).map(img=>limit(img.decode(),12000)),...(background?[limit(background.decode(),12000)]:[])]);
 await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
}
document.addEventListener('keydown',event=>{if(screen()&&!screen().hidden){event.preventDefault();event.stopImmediatePropagation();}},true);
