// Only the most recent file/playlist selection may update a player window.
export function createMediaLoad(){
 let active=null;
 return{
  begin(){active?.abort();const controller=new AbortController();active=controller;return{signal:controller.signal,isLatest:()=>active===controller,current:()=>active===controller&&!controller.signal.aborted};},
  cancel(){active?.abort();active=null;}
 };
}
export const isHLS=text=>/^#EXT-X-(?:TARGETDURATION|STREAM-INF|MEDIA-SEQUENCE|MAP):/im.test(text);
