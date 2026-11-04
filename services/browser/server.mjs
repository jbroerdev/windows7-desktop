import path from 'node:path';
import {createDownloads} from './downloads.mjs';
import http from 'node:http';
import {mkdir,readFile,writeFile,rename} from 'node:fs/promises';
import {createHash,randomUUID,randomBytes,createCipheriv,createDecipheriv} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
import {authenticated,webURL} from './security.mjs';
import {createProxy} from './proxy.mjs';

export async function createBrowserService({secret=process.env.BROWSER_SERVICE_SECRET,dataDir=process.env.BROWSER_DATA_DIR||'/data',maxUsers=Number(process.env.BROWSER_MAX_USERS||1),executablePath=process.env.BROWSER_EXECUTABLE_PATH,onDownload=()=>{},desktopEndpoint=process.env.BROWSER_DESKTOP_URL||'http://explorer:3000',launchContext=(directory,options)=>chromium.launchPersistentContext(directory,options)}={}){
 if(!secret||secret.length<32)throw Error('BROWSER_SERVICE_SECRET muss mindestens 32 Zeichen haben.');
 const proxy=createProxy();await new Promise(r=>proxy.listen(0,'127.0.0.1',r));
 const users=new Map(),starting=new Map();let stopping=false;
 const downloads=await createDownloads({directory:dataDir+'/transfers',secret,endpoint:desktopEndpoint,notify:(actor,event)=>{onDownload(actor,event);const s=users.get(actor);if(s)broadcast(s,'download',event);}});
 async function session(actor){if(users.has(actor))return users.get(actor);if(starting.has(actor))return starting.get(actor);if(stopping||users.size+starting.size>=maxUsers)throw Error('Der Browser-Server ist ausgelastet. Bitte später erneut versuchen.');
  const promise=(async()=>{const directory=dataDir+'/'+createHash('sha256').update(actor).digest('hex');await mkdir(directory,{recursive:true,mode:0o700});
   const incoming=path.join(dataDir,'incoming-'+createHash('sha256').update(actor).digest('hex'));await mkdir(incoming,{recursive:true,mode:0o700});
   const context=await launchContext(directory,{headless:true,chromiumSandbox:process.platform==='linux',...(executablePath?{executablePath}:{}),viewport:{width:1100,height:700},acceptDownloads:true,downloadsPath:incoming,proxy:{server:'http://127.0.0.1:'+proxy.address().port,bypass:'<-loopback>'},args:['--disable-quic','--force-webrtc-ip-handling-policy=disable_non_proxied_udp','--disable-features=WebRtcAllowInputVolumeAdjustment','--disable-background-networking']});
   const key=createHash('sha256').update(secret+'\n'+actor).digest(),cookieFile=directory+'/session-cookies.enc';let restored;try{const saved=await readFile(cookieFile),decipher=createDecipheriv('aes-256-gcm',key,saved.subarray(0,12));decipher.setAuthTag(saved.subarray(12,28));restored=JSON.parse(Buffer.concat([decipher.update(saved.subarray(28)),decipher.final()]).toString());const cookies=Array.isArray(restored)?restored:restored.cookies;await context.addCookies(cookies.filter(c=>c.expires===-1||c.expires>Date.now()/1000));}catch(error){if(error.code!=='ENOENT'){await context.close();throw Error('Gespeicherte Browser-Anmeldung konnte nicht geladen werden.');}}
   const s={context,key,cookieFile,tabs:new Map(),active:null,streams:new Set(),touched:Date.now(),tail:Promise.resolve()};users.set(actor,s);
   async function add(page){if(s.tabs.size>=4){await page.close();return;}const id=randomUUID(),tab={id,page,cdp:await context.newCDPSession(page)};s.tabs.set(id,tab);s.active=id;
    page.on('download',download=>downloads.capture(actor,download,incoming).catch(()=>{}));
    page.on('dialog',async dialog=>{broadcast(s,'dialog',{tab:id,type:dialog.type(),message:dialog.message()});await dialog.dismiss().catch(()=>{});});
    page.on('close',()=>{s.tabs.delete(id);if(s.active===id)s.active=s.tabs.keys().next().value||null;metadata(s);});
    page.on('framenavigated',()=>metadata(s));page.on('load',()=>metadata(s));
    tab.cdp.on('Page.screencastFrame',event=>{if(s.active===id)broadcast(s,'frame',{id,data:event.data,width:event.metadata.deviceWidth,height:event.metadata.deviceHeight});tab.cdp.send('Page.screencastFrameAck',{sessionId:event.sessionId}).catch(()=>{});});
    if(s.streams.size)await cast(tab);metadata(s);
   }
   context.on('page',page=>add(page).catch(()=>page.close()));for(const page of context.pages())await add(page);if(!s.tabs.size){const page=await context.newPage();await untilTab(s,page);}if(Array.isArray(restored?.tabs)){const urls=restored.tabs.slice(0,4);for(let i=0;i<urls.length;i++){const tab=[...s.tabs.values()][i]||await untilTab(s,await context.newPage());if(urls[i]!=='about:blank'){try{tab.page.goto(webURL(urls[i]),{waitUntil:'domcontentloaded',timeout:25000}).catch(()=>{});}catch{}}}s.active=[...s.tabs.keys()][Math.min(Math.max(0,Number(restored.active)||0),s.tabs.size-1)]||s.active;}return s;
  })();starting.set(actor,promise);try{return await promise;}finally{starting.delete(actor);}
 }
 async function saveCookies(s){if(s.saving)return s.saving;s.saving=(async()=>{const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',s.key,iv),data=Buffer.concat([cipher.update(JSON.stringify({cookies:await s.context.cookies(),tabs:[...s.tabs.values()].map(t=>t.page.url()),active:[...s.tabs.keys()].indexOf(s.active)})),cipher.final()]),temp=s.cookieFile+'.'+randomUUID();await writeFile(temp,Buffer.concat([iv,cipher.getAuthTag(),data]),{mode:0o600});await rename(temp,s.cookieFile);})();try{await s.saving;}finally{s.saving=null;}}
 function broadcast(s,type,value){const bytes='event: '+type+'\ndata: '+JSON.stringify(value)+'\n\n';for(const res of s.streams){if(res.writableLength>2*1024*1024){res.destroy();s.streams.delete(res);}else res.write(bytes);}}
 async function metadata(s){const tabs=[];for(const t of s.tabs.values())tabs.push({id:t.id,url:t.page.url(),title:await t.page.title().catch(()=> 'Neue Registerkarte')});broadcast(s,'tabs',{tabs,active:s.active});return{tabs,active:s.active};}
 async function cast(tab){await tab.cdp.send('Page.startScreencast',{format:'jpeg',quality:80,maxWidth:1920,maxHeight:1200,everyNthFrame:1}).catch(()=>{});}
 async function untilTab(s,page){for(let i=0;i<100;i++){const tab=[...s.tabs.values()].find(t=>t.page===page);if(tab)return tab;await new Promise(r=>setTimeout(r,10));}throw Error('Registerkarte konnte nicht geöffnet werden.');}
 async function select(s,id){if(!s.tabs.has(id))throw Error('Registerkarte nicht gefunden.');for(const t of s.tabs.values())await t.cdp.send('Page.stopScreencast').catch(()=>{});s.active=id;const tab=s.tabs.get(id);await tab.page.bringToFront();if(s.streams.size)await cast(tab);await metadata(s);}
 async function command(s,data){s.touched=Date.now();if(data.action==='new'){const tab=await untilTab(s,await s.context.newPage());await select(s,tab.id);if(data.url)await tab.page.goto(webURL(data.url),{waitUntil:'domcontentloaded',timeout:25000});return metadata(s);}
  const tab=s.tabs.get(data.tab||s.active);if(!tab)throw Error('Registerkarte nicht gefunden.');const page=tab.page;
  switch(data.action){case'select':await select(s,tab.id);break;case'close':if(s.tabs.size===1){await page.goto('about:blank');}else{await page.close();if(s.active)await select(s,s.active);}break;
   case'navigate':await page.goto(webURL(data.url),{waitUntil:'domcontentloaded',timeout:25000});break;case'back':await page.goBack({waitUntil:'domcontentloaded',timeout:25000});break;case'forward':await page.goForward({waitUntil:'domcontentloaded',timeout:25000});break;case'reload':await page.reload({waitUntil:'domcontentloaded',timeout:25000});break;
   case'resize':{const width=Math.max(320,Math.min(1920,Math.round(Number(data.width)||1100))),height=Math.max(200,Math.min(1200,Math.round(Number(data.height)||700)));for(const t of s.tabs.values())await t.page.setViewportSize({width,height});break;}
   case'pointer':{if(!['mousePressed','mouseReleased','mouseMoved','mouseWheel'].includes(data.type))throw Error('Ungültige Eingabe.');const v=page.viewportSize();await tab.cdp.send('Input.dispatchMouseEvent',{type:data.type,x:Math.max(0,Math.min(v.width,Number(data.x)||0)),y:Math.max(0,Math.min(v.height,Number(data.y)||0)),button:['left','right','middle'].includes(data.button)?data.button:'none',buttons:Number(data.buttons)&7,clickCount:Math.min(2,Math.max(0,Number(data.clickCount)||0)),modifiers:Number(data.modifiers)&15,...(data.type==='mouseWheel'?{deltaX:Math.max(-4000,Math.min(4000,Number(data.deltaX)||0)),deltaY:Math.max(-4000,Math.min(4000,Number(data.deltaY)||0))}:{})});return{};}
   case'key':if(!['keyDown','keyUp'].includes(data.type)||typeof data.key!=='string'||data.key.length>40)throw Error('Ungültige Taste.');await tab.cdp.send('Input.dispatchKeyEvent',{type:data.type,key:data.key,code:String(data.code||'').slice(0,40),windowsVirtualKeyCode:Number(data.keyCode)||0,modifiers:Number(data.modifiers)&15,...(data.type==='keyDown'&&data.text?{text:String(data.text).slice(0,8)}:{})});return{};
   case'text':if(typeof data.text!=='string'||data.text.length>65536)throw Error('Text ist zu lang.');await page.keyboard.insertText(data.text);return{};
   default:throw Error('Unbekannter Browser-Befehl.');
  }return metadata(s);
 }
 const server=http.createServer(async(req,res)=>{const json=(status,value)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(value));};try{
  if(req.url==='/health'&&req.method==='GET')return json(200,{ready:!stopping});let size=0,parts=[];for await(const part of req){size+=part.length;if(size>100000)return json(413,{error:'Anfrage zu groß.'});parts.push(part);}const bytes=Buffer.concat(parts),actor=authenticated(req,secret,bytes);if(!actor)return json(401,{error:'Nicht autorisiert.'});
  if(!['/session','/command','/events','/suspend'].includes(req.url)||!['GET','POST'].includes(req.method))return json(404,{error:'Nicht gefunden.'});
  if(req.url==='/suspend'&&req.method==='POST'){const s=users.get(actor);if(s){users.delete(actor);for(const stream of s.streams)stream.end();await saveCookies(s);await s.context.close();}return json(200,{ok:true});}
  const s=await session(actor);s.touched=Date.now();if(req.url==='/session'&&req.method==='GET')return json(200,await metadata(s));
  if(req.url==='/events'&&req.method==='GET'){res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-store','X-Accel-Buffering':'no'});res.flushHeaders();s.streams.add(res);await metadata(s);for(const item of downloads.pending(actor))res.write('event: download\ndata: '+JSON.stringify(item)+'\n\n');const tab=s.tabs.get(s.active);if(tab)await cast(tab);const heartbeat=setInterval(()=>{s.touched=Date.now();res.write(': heartbeat\n\n');},15000);res.on('close',()=>{clearInterval(heartbeat);s.streams.delete(res);if(!s.streams.size)for(const t of s.tabs.values())t.cdp.send('Page.stopScreencast').catch(()=>{});});return;}
  if(req.url==='/command'&&req.method==='POST'){const data=JSON.parse(bytes.toString());const task=s.tail.then(()=>command(s,data));s.tail=task.catch(()=>{});return json(200,await task);}return json(405,{error:'Methode nicht erlaubt.'});
 }catch(error){if(!res.headersSent)json(400,{error:error.message});else res.end();}});
 const idle=setInterval(()=>{for(const [actor,s]of users)if(!s.streams.size&&Date.now()-s.touched>5*60000){users.delete(actor);saveCookies(s).finally(()=>s.context.close()).catch(()=>{});}},60000);idle.unref();
 const checkpoint=setInterval(()=>{for(const s of users.values())saveCookies(s).catch(()=>{});},30000);checkpoint.unref();
 return{server,async close(){stopping=true;downloads.close();clearInterval(idle);clearInterval(checkpoint);for(const s of users.values()){for(const res of s.streams)res.end();await saveCookies(s).catch(()=>{});await s.context.close();}server.closeAllConnections();await new Promise(r=>server.close(r));proxy.closeAllConnections();await new Promise(r=>proxy.close(r));}};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){const app=await createBrowserService();app.server.listen(Number(process.env.PORT||3008),'0.0.0.0');for(const signal of ['SIGTERM','SIGINT'])process.once(signal,()=>app.close().then(()=>process.exit(0)));}
