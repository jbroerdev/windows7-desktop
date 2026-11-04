import {createHmac} from 'node:crypto';
export function spotifySignature(secret,actor,time,method,target,bytes){return createHmac('sha256',secret).update([actor,time,method,target].join('\n')+'\n').update(bytes).digest('hex');}
export async function spotifyGateway({req,res,url,user,body,json,endpoint=process.env.SPOTIFY_SERVICE_URL,secret=process.env.SPOTIFY_SERVICE_SECRET}){
 if(!user||user.shareEditing||user.sharedWorkspace)return json(401,{error:'Bitte im persönlichen Desktop-Konto anmelden.'});
 if(!endpoint||!secret)return json(503,{error:'Der Spotify-Dienst ist noch nicht verbunden.'});
 const route=url.pathname.slice('/api/spotify'.length)||'/';
 if(route.startsWith('//')||/\\|%2f|%5c/i.test(route))return json(400,{error:'Ungültiger Spotify-Pfad.'});
 if(!['GET','POST','PUT'].includes(req.method))return json(405,{error:'Methode nicht erlaubt.'});
 const bytes=req.method==='GET'?Buffer.alloc(0):await body(32768),actor=Buffer.from(String(user.id)).toString('base64url'),time=String(Date.now()),target=route+url.search;
 let response;try{response=await fetch(new URL(target,endpoint),{method:req.method,headers:{'X-Spotify-Actor':actor,'X-Spotify-Time':time,'X-Spotify-Signature':spotifySignature(secret,actor,time,req.method,target,bytes),'Content-Type':'application/json'},...(bytes.length?{body:bytes}:{}),redirect:'manual',signal:AbortSignal.timeout(25000)});}catch{return json(503,{error:'Spotify-Dienst momentan nicht erreichbar.'});}
 if(response.status===302){await response.body?.cancel();const location=response.headers.get('location');const next=new URL(location,'https://desktop.invalid');if(next.origin!=='https://accounts.spotify.com')return json(502,{error:'Ungültige Spotify-Weiterleitung.'});res.writeHead(302,{Location:next.href,'Cache-Control':'no-store'});return res.end();}
 const headers={'Content-Type':response.headers.get('content-type')||'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'};
 if(headers['Content-Type'].includes('html'))headers['Content-Security-Policy']="default-src 'none'; script-src 'self' https://sdk.scdn.co; style-src 'self'; img-src 'self' https: data:; connect-src 'self' https://*.spotify.com https://*.scdn.co https://*.spotifycdn.com https://*.spotifycdn.net wss://*.spotify.com; media-src https: blob:; frame-src https://*.spotify.com https://sdk.scdn.co; frame-ancestors 'self'; base-uri 'none'; form-action 'self'";
 if(response.headers.has('retry-after'))headers['Retry-After']=response.headers.get('retry-after');
 res.writeHead(response.status,headers);res.end(Buffer.from(await response.arrayBuffer()));
}
