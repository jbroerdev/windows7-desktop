import {createHmac,timingSafeEqual} from 'node:crypto';
import {isIP} from 'node:net';
export function signature(secret,actor,time,method,target,bytes){return createHmac('sha256',secret).update([actor,time,method,target].join('\n')+'\n').update(bytes).digest('hex');}
export function authenticated(req,secret,bytes){
 const actor=req.headers['x-browser-actor'],time=req.headers['x-browser-time'],sig=req.headers['x-browser-signature'];
 if(!secret||typeof actor!=='string'||!/^[A-Za-z0-9_-]{1,512}$/.test(actor)||!/^\d{13}$/.test(time||'')||Math.abs(Date.now()-Number(time))>30000||!/^\w{64}$/.test(sig||''))return null;
 const expected=signature(secret,actor,time,req.method,req.url,bytes);
 if(!timingSafeEqual(Buffer.from(expected),Buffer.from(sig)))return null;
 return actor;
}
export function publicIP(ip){
 if(isIP(ip)===4){const [a,b]=ip.split('.').map(Number);return !(a===0||a===10||a===127||a===169&&b===254||a===172&&b>=16&&b<=31||a===192&&[0,168].includes(b)||a===100&&b>=64&&b<=127||a>=224||a===198&&[18,19,51].includes(b)||a===203&&b===0);}
 // Only global unicast IPv6; exclude documentation and transition mechanisms.
 return isIP(ip)===6&&/^[23]/i.test(ip)&&!/^2001:(?:db8|0:|10:|20:)/i.test(ip)&&!/^2002:/i.test(ip);
}
export function webURL(value){const u=new URL(value);if(!['https:','http:'].includes(u.protocol)||u.username||u.password||u.href.length>8192)throw Error('Nur HTTP- und HTTPS-Adressen sind erlaubt.');return u.href;}
